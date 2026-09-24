import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function runRetentionMaintenance(config, fetchImpl = fetch) {
  const { url, serviceKey, workerSecret } = config;
  if (!url || !serviceKey || !workerSecret) throw new Error("Missing maintenance configuration");
  const supabaseUrl = new URL(url);
  if (supabaseUrl.protocol !== "https:" || !supabaseUrl.hostname.endsWith(".supabase.co")) {
    throw new Error("SUPABASE_URL must be an HTTPS Supabase project URL");
  }

  const request = async (path, options) => {
    const response = await fetchImpl(new URL(path, supabaseUrl), {
      ...options,
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
    return response.json();
  };

  const maintenance = await request("/rest/v1/rpc/run_retention_maintenance", {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!maintenance || typeof maintenance !== "object" || Array.isArray(maintenance)) {
    throw new Error("Invalid retention response");
  }

  const maxBatches = 100;
  let processedTotal = 0;
  for (let batch = 1; batch <= maxBatches; batch++) {
    const result = await request("/functions/v1/media-worker", {
      method: "POST",
      headers: { "X-Worker-Secret": workerSecret },
    });
    if (!result || !Number.isInteger(result.processed) || !Number.isInteger(result.succeeded)
      || result.processed < 0 || result.processed > 3 || result.succeeded < 0
      || result.succeeded > result.processed) {
      throw new Error("Invalid media worker response");
    }
    processedTotal += result.processed;
    if (result.succeeded !== result.processed) {
      throw new Error(`Media worker failed ${result.processed - result.succeeded} job(s)`);
    }
    if (result.processed < 3) return { maintenance, processedTotal, batches: batch };
  }
  throw new Error(`Media worker reached ${maxBatches} batches; backlog needs inspection`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runRetentionMaintenance({
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    workerSecret: process.env.MEDIA_WORKER_SECRET,
  });
  console.log("Retention maintenance:", JSON.stringify(result.maintenance));
  console.log(`Media worker completed ${result.processedTotal} job(s) in ${result.batches} batch(es).`);
}
