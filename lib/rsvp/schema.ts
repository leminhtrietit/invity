import { z } from "zod";

export const rsvpPayloadSchema = z.object({
  response: z.enum(["attending", "declined"]),
  companionCount: z.number().int().min(0).max(10),
  wish: z.string().trim().max(1000).default(""),
  consentPublicWish: z.boolean().default(false),
}).superRefine((value, context) => {
  if (value.response === "declined" && value.companionCount !== 0) context.addIssue({ code: "custom", path: ["companionCount"], message: "Không tham dự thì số người đi cùng phải bằng 0." });
});

export const sharedRsvpSchema = rsvpPayloadSchema.and(z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(9).max(20),
  honeypot: z.string().max(0).default(""),
}));

export const personalGuestSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  salutation: z.string().trim().max(40).optional().default(""),
  guestGroup: z.string().trim().max(80).optional().default(""),
  ownerNote: z.string().trim().max(1000).optional().default(""),
});

export const guestStateSchema = z.object({ target: z.enum(["sent", "revoked"]) });

export function rsvpDatabaseError(message?: string) {
  return ["GUEST_QUOTA_EXCEEDED", "RSVP_CLOSED", "RATE_LIMITED", "INVALID_INVITATION_TOKEN", "INVALID_EDIT_SESSION", "IDEMPOTENCY_CONFLICT", "INVALID_EVENT_TRANSITION", "VALIDATION_ERROR", "NOT_FOUND"]
    .find((code) => message?.includes(code));
}
