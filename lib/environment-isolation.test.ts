import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertEnvironmentIsolation } from "./environment-isolation.ts";

describe("assertEnvironmentIsolation", () => {
  it("rejects the production project in a preview deployment", () => {
    assert.throws(() => assertEnvironmentIsolation({
      vercelEnvironment: "preview",
      supabaseUrl: "https://production-ref.supabase.co",
      productionProjectRef: "production-ref",
    }));
  });

  it("allows a dedicated staging project in preview", () => {
    assert.doesNotThrow(() => assertEnvironmentIsolation({
      vercelEnvironment: "preview",
      supabaseUrl: "https://staging-ref.supabase.co",
      productionProjectRef: "production-ref",
    }));
  });
});
