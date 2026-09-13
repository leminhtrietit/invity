import assert from "node:assert/strict";
import test from "node:test";
import { isTrustedMutation } from "./request-security.ts";

test("same-origin mutation protection", async (t) => {
  await t.test("allows safe reads", () => assert.equal(isTrustedMutation(new Request("https://invite.test/api", { method: "GET", headers: { origin: "https://evil.test" } })), true));
  await t.test("allows same-origin writes", () => assert.equal(isTrustedMutation(new Request("https://invite.test/api", { method: "POST", headers: { origin: "https://invite.test" } })), true));
  await t.test("rejects cross-origin writes", () => assert.equal(isTrustedMutation(new Request("https://invite.test/api", { method: "POST", headers: { origin: "https://evil.test" } })), false));
  await t.test("rejects malformed origins", () => assert.equal(isTrustedMutation(new Request("https://invite.test/api", { method: "DELETE", headers: { origin: "not a url" } })), false));
  await t.test("rejects browser cross-site writes without Origin", () => assert.equal(isTrustedMutation(new Request("https://invite.test/api", { method: "POST", headers: { "sec-fetch-site": "cross-site" } })), false));
  await t.test("allows non-browser clients without browser metadata", () => assert.equal(isTrustedMutation(new Request("https://invite.test/api", { method: "POST" })), true));
});
