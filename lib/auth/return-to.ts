const ALLOWED_PATHS = ["/", "/dashboard", "/templates"] as const;

export function safeReturnTo(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(value, "https://invite.local");
  } catch {
    return fallback;
  }

  if (parsed.origin !== "https://invite.local") return fallback;
  if (!ALLOWED_PATHS.some((path) => parsed.pathname === path || (path !== "/" && parsed.pathname.startsWith(`${path}/`)))) return fallback;

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
