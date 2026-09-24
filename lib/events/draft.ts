import { z } from "zod";
import { invitationContentSchema } from "../invitation/schema.ts";
import { getTemplate } from "../templates/catalog.ts";
import { getTemplateFixture } from "../templates/fixtures.ts";

export const eventCategorySchema = z.enum(["wedding", "engagement", "birthday_baby", "graduation", "other"]);
export const createEventSchema = z.object({ templateId: z.string().min(1).max(80), eventCategory: eventCategorySchema });
export const saveDraftSchema = z.object({ revision: z.number().int().positive(), content: invitationContentSchema });
export const switchTemplateSchema = z.object({ templateId: z.string().min(1).max(80), revision: z.number().int().positive() });
export const publishEventSchema = z.object({ revision: z.number().int().positive() });
export const lifecycleSchema = z.object({ target: z.enum(["published", "hidden", "cancelled", "archived"]) });
export const mediaUploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  byteSize: z.number().int().positive().max(15 * 1024 * 1024),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/mp4"]),
  kind: z.enum(["cover", "album", "audio"]),
}).superRefine((value, context) => {
  if (value.kind !== "audio" && !value.mimeType.startsWith("image/")) context.addIssue({ code: "custom", message: "Loại tệp không phù hợp.", path: ["mimeType"] });
  if (value.kind === "audio" && !value.mimeType.startsWith("audio/")) context.addIssue({ code: "custom", message: "Loại tệp không phù hợp.", path: ["mimeType"] });
  if (value.kind !== "audio" && value.byteSize > 10 * 1024 * 1024) context.addIssue({ code: "custom", message: "Ảnh tối đa 10 MB.", path: ["byteSize"] });
});

export const mediaUploadCompleteSchema = mediaUploadSchema.and(z.object({
  path: z.string().min(1).max(600),
}));

export function defaultDraftContent(templateId = "vow-editorial") {
  return getTemplateFixture(templateId);
}

export function validateTemplateCategory(templateId: string, category: string) {
  const template = getTemplate(templateId);
  return Boolean(template && template.category === category);
}

export function databaseErrorCode(message?: string) {
  const codes = ["DRAFT_LIMIT_EXCEEDED", "EVENT_QUOTA_EXCEEDED", "REVISION_CONFLICT", "TEMPLATE_NOT_AVAILABLE", "STORAGE_QUOTA_EXCEEDED", "MEDIA_NOT_READY", "PREFLIGHT_FAILED", "INVALID_EVENT_TRANSITION", "NOT_FOUND", "UNAUTHENTICATED"];
  return codes.find((code) => message?.includes(code));
}
