import { getCurrentAppUser } from "@/lib/auth/current-user";
import { apiError, apiSuccess } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ mediaAssetId: string }> }) {
  if (!(await getCurrentAppUser())) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const { mediaAssetId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("media_assets").select("id,status,kind,failure_code").eq("id", mediaAssetId).maybeSingle();
  if (!data) return apiError(404, "NOT_FOUND", "Không tìm thấy media.");
  return apiSuccess({ ...data, contentUrl: data.status === "ready" ? `/api/v1/media/${data.id}/content` : null });
}
