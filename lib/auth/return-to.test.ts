import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeReturnTo } from "./return-to.ts";

describe("safeReturnTo", () => {
  for (const input of ["https://evil.test", "//evil.test", "/\\evil", "\\evil", "/%5Cevil", "/events/secret"]) {
    it(`rejects unsafe destination ${input}`, () => {
      assert.equal(safeReturnTo(input), "/dashboard");
    });
  }

  it("keeps an allowlisted template selection", () => {
    assert.equal(safeReturnTo("/dashboard?templateId=vow-editorial"), "/dashboard?templateId=vow-editorial");
  });

  it("allows the public template area", () => {
    assert.equal(safeReturnTo("/templates/vow-editorial"), "/templates/vow-editorial");
  });
});
