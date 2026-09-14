import { NextResponse, type NextRequest } from "next/server";
import { safeReturnTo } from "@/lib/auth/return-to";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  if (!code) return NextResponse.redirect(new URL(`/login?error=oauth_callback&returnTo=${encodeURIComponent(returnTo)}`, request.url));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("OAuth code exchange failed", {
      code: error.code,
      name: error.name,
      status: error.status,
      message: error.message,
    });
    return NextResponse.redirect(new URL(`/login?error=oauth_callback&returnTo=${encodeURIComponent(returnTo)}`, request.url));
  }

  const { error: bindingError } = await supabase.rpc("ensure_current_app_user");
  if (bindingError) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL(`/login?error=profile_setup&returnTo=${encodeURIComponent(returnTo)}`, request.url));
  }

  return NextResponse.redirect(new URL(returnTo, request.url));
}
