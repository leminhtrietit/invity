import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { personalGuestSchema, rsvpDatabaseError, rsvpPayloadSchema, sharedRsvpSchema } from "./schema.ts";

describe("RSVP contracts", () => {
  it("accepts a complete shared RSVP", () => {
    assert.equal(sharedRsvpSchema.safeParse({ name: "Nguyễn Minh", phone: "+84 912 345 678", response: "attending", companionCount: 2, wish: "Chúc mừng", consentPublicWish: true, honeypot: "" }).success, true);
  });

  it("rejects companions for a declined RSVP", () => {
    const result = rsvpPayloadSchema.safeParse({ response: "declined", companionCount: 1, wish: "", consentPublicWish: false });
    assert.equal(result.success, false);
  });

  it("enforces personal guest display name limits", () => {
    assert.equal(personalGuestSchema.safeParse({ displayName: "A" }).success, false);
    assert.equal(personalGuestSchema.safeParse({ displayName: "Khách mời" }).success, true);
  });

  it("maps stable database errors without exposing details", () => {
    assert.equal(rsvpDatabaseError("Postgres: GUEST_QUOTA_EXCEEDED"), "GUEST_QUOTA_EXCEEDED");
    assert.equal(rsvpDatabaseError("unknown internal detail"), undefined);
  });
});
