import assert from "node:assert/strict";

const siteUrl = new URL(process.env.SITE_URL ?? "http://localhost:3000");
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

console.log(`Production smoke passed: ${checks.length} pages, social metadata, security headers and cross-site mutation guard.`);
