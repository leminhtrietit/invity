import { getCurrentAppUser } from "@/lib/auth/current-user";
import { apiError } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ mediaAssetId: string }> }) {
  if (!(await getCurrentAppUser())) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const { mediaAssetId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: asset } = await supabase.from("media_assets").select("status,storage_key,variants").eq("id", mediaAssetId).maybeSingle();
  if (!asset || asset.status !== "ready") return apiError(404, "NOT_FOUND", "Media chưa sẵn sàng.");
  const variants = asset.variants as Record<string, string>;
  const path = variants.w1280 ?? variants.w640 ?? variants.original ?? asset.storage_key;
  const { data: signed } = await supabase.storage.from("event-media").createSignedUrl(path, 300);
  if (!signed) return apiError(404, "NOT_FOUND", "Không thể đọc media.");
  return Response.redirect(signed.signedUrl, 302);
}
