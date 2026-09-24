import assert from "node:assert/strict";

const siteUrl = new URL(process.env.SITE_URL ?? "http://localhost:3000");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if (siteUrl.hostname !== "localhost" && (!supabaseUrl || !supabaseKey)) {
  throw new Error("Remote smoke requires SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY");
}
const checks = ["/", "/templates", "/templates/vow-editorial", "/pricing", "/privacy", "/contact"];

for (const path of checks) {
  const response = await fetch(new URL(path, siteUrl), { redirect: "manual" });
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/, `${path} is missing CSP`);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff", `${path} is missing nosniff`);
}

const detail = await (await fetch(new URL("/templates/vow-editorial", siteUrl))).text();
assert.match(detail, /property="og:image"/, "template detail is missing Open Graph image");
assert.match(detail, /name="twitter:card"/, "template detail is missing Twitter card metadata");

const csrf = await fetch(new URL("/api/v1/analytics", siteUrl), {
  method: "POST",
  headers: { "content-type": "text/plain", origin: "https://attacker.invalid", "sec-fetch-site": "cross-site" },
  body: JSON.stringify({ eventName: "template_viewed" }),
});
assert.equal(csrf.status, 403, `cross-site mutation returned ${csrf.status}`);

if (supabaseUrl && supabaseKey) {
  const healthUrl = new URL("/auth/v1/health", supabaseUrl);
  if (healthUrl.protocol !== "https:") throw new Error("SUPABASE_URL must use HTTPS");
  const health = await fetch(healthUrl, { headers: { apikey: supabaseKey } });
  assert.equal(health.status, 200, `Supabase Auth health returned ${health.status}`);
  const database = await fetch(new URL("/rest/v1/rpc/get_public_event", supabaseUrl), {
    method: "POST",
    headers: { apikey: supabaseKey, "Content-Type": "application/json" },
    body: JSON.stringify({ p_public_code: "000000000000000000000000000000000000" }),
  });
  assert.equal(database.status, 200, `Supabase database RPC returned ${database.status}`);
  assert.equal(await database.text(), "null", "unknown public event did not return null");
}

console.log(`Production smoke passed: ${checks.length} pages, social metadata, security headers, cross-site mutation guard, Supabase Auth and database RPC.`);
