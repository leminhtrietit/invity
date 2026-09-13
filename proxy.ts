import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isTrustedMutation } from "@/lib/http/request-security";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && !isTrustedMutation(request)) {
    return NextResponse.json({ error: { code: "CROSS_SITE_REQUEST", message: "Yêu cầu khác nguồn đã bị từ chối.", fields: [] }, requestId: crypto.randomUUID() }, { status: 403 });
  }
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/events/:path*", "/settings/:path*", "/admin/:path*", "/login"],
};
