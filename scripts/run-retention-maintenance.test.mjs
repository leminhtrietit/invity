import assert from "node:assert/strict";
import { test } from "node:test";
import { runRetentionMaintenance } from "./run-retention-maintenance.mjs";

const config = {
  url: "https://example.supabase.co",
  serviceKey: "service-test-key",
  workerSecret: "worker-test-secret",
};

test("runs retention before draining media jobs", async () => {
  const calls = [];
  const results = [
    { expiredRateLimits: 2, cleanupJobsQueued: 1 },
    { processed: 3, succeeded: 3 },
    { processed: 1, succeeded: 1 },
  ];
  const fetchImpl = async (url, options) => {
    calls.push({ path: url.pathname, headers: options.headers });
    return Response.json(results.shift());
  };
  const result = await runRetentionMaintenance(config, fetchImpl);
  assert.equal(result.processedTotal, 4);
  assert.equal(result.batches, 2);
  assert.deepEqual(calls.map((call) => call.path), [
    "/rest/v1/rpc/run_retention_maintenance",
    "/functions/v1/media-worker",
    "/functions/v1/media-worker",
  ]);
  assert.equal(calls[0].headers.Authorization, "Bearer service-test-key");
  assert.equal(calls[1].headers["X-Worker-Secret"], "worker-test-secret");
});

test("fails when a media job fails", async () => {
  const results = [{ cleanupJobsQueued: 1 }, { processed: 1, succeeded: 0 }];
  await assert.rejects(
    runRetentionMaintenance(config, async () => Response.json(results.shift())),
    /Media worker failed 1 job/,
  );
});

test("rejects a non-Supabase URL before sending credentials", async () => {
  await assert.rejects(
    runRetentionMaintenance({ ...config, url: "https://example.invalid" }, () => {
      throw new Error("should not be called");
    }),
    /HTTPS Supabase project URL/,
  );
});
