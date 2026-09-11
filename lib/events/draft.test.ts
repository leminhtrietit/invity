import assert from "node:assert/strict";
import test from "node:test";
import {
  createEventSchema,
  databaseErrorCode,
  defaultDraftContent,
  mediaUploadCompleteSchema,
  mediaUploadSchema,
  saveDraftSchema,
  validateTemplateCategory,
} from "./draft.ts";

test("default draft is a valid, independent editor payload", () => {
  const first = defaultDraftContent();
  const second = defaultDraftContent();
  assert.equal(saveDraftSchema.safeParse({ revision: 1, content: first }).success, true);
  first.title = "Đã thay đổi";
  assert.notEqual(second.title, first.title);
});

test("template and category must match the catalog", () => {
  assert.equal(createEventSchema.safeParse({ templateId: "vow-editorial", eventCategory: "wedding" }).success, true);
  assert.equal(validateTemplateCategory("vow-editorial", "wedding"), true);
  assert.equal(validateTemplateCategory("vow-editorial", "graduation"), false);
  assert.equal(validateTemplateCategory("unknown", "wedding"), false);
});

test("media contract rejects mismatched types and oversize images", () => {
  assert.equal(mediaUploadSchema.safeParse({ filename: "cover.jpg", byteSize: 1024, mimeType: "image/jpeg", kind: "cover" }).success, true);
  assert.equal(mediaUploadSchema.safeParse({ filename: "track.mp3", byteSize: 1024, mimeType: "audio/mpeg", kind: "cover" }).success, false);
  assert.equal(mediaUploadSchema.safeParse({ filename: "cover.jpg", byteSize: 11 * 1024 * 1024, mimeType: "image/jpeg", kind: "cover" }).success, false);
});

test("upload completion requires the signed storage path", () => {
  const base = { filename: "cover.webp", byteSize: 1024, mimeType: "image/webp", kind: "cover" } as const;
  assert.equal(mediaUploadCompleteSchema.safeParse(base).success, false);
  assert.equal(mediaUploadCompleteSchema.safeParse({ ...base, path: "owner/event/asset.webp" }).success, true);
});

test("known database failures map to stable API codes", () => {
  assert.equal(databaseErrorCode("P0001: REVISION_CONFLICT"), "REVISION_CONFLICT");
  assert.equal(databaseErrorCode("unexpected database error"), undefined);
});
