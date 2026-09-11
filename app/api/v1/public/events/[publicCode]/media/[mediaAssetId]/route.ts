import { createPublicSupabaseClient } from "@/lib/events/public-event";
import { apiError } from "@/lib/http/api-response";

export async function GET(_request: Request, { params }: { params: Promise<{ publicCode: string; mediaAssetId: string }> }) {
  const { publicCode, mediaAssetId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(mediaAssetId)) return apiError(404, "NOT_FOUND", "Media không tồn tại.");
  const supabase = createPublicSupabaseClient();
  const { data: path } = await supabase.rpc("resolve_public_media", { p_public_code: publicCode, p_media_asset_id: mediaAssetId });
  if (!path) return apiError(404, "NOT_FOUND", "Media không tồn tại.");
  const { data: signed } = await supabase.storage.from("event-media").createSignedUrl(path, 300);
  if (!signed) return apiError(404, "NOT_FOUND", "Media không tồn tại.");
  return Response.redirect(signed.signedUrl, 302);
}
