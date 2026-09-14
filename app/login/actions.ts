"use server";

import { redirect } from "next/navigation";
import { getPublicEnv } from "@/lib/env";
import { safeReturnTo } from "@/lib/auth/return-to";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signInWithLeMinhTriet(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo")?.toString());
  const supabase = await createSupabaseServerClient();
  const env = getPublicEnv();
  const callback = new URL("/auth/callback", env.NEXT_PUBLIC_SITE_URL);
  callback.searchParams.set("returnTo", returnTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "custom:leminhtriet",
    options: {
      redirectTo: callback.toString(),
      scopes: "openid email profile",
    },
  });

  if (error || !data.url) redirect(`/login?error=oauth_start&returnTo=${encodeURIComponent(returnTo)}`);
  redirect(data.url);
}
