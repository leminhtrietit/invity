import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

export const getCurrentAppUser = cache(async (): Promise<AppUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return null;

  const { data, error } = await supabase.rpc("ensure_current_app_user");
  if (error || !data) return null;

  const { data: profile } = await supabase
    .from("app_users")
    .select("id,email,display_name,avatar_url")
    .eq("id", data)
    .single();

  if (!profile) return null;
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
  };
});
