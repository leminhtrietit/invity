import { getCurrentAppUser } from "@/lib/auth/current-user";
import { databaseErrorCode, mediaUploadCompleteSchema } from "@/lib/events/draft";
import { apiError, apiSuccess, requestId } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!(await getCurrentAppUser())) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const parsed = mediaUploadCompleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Thông tin tệp tải lên không hợp lệ.");
  const { eventId } = await params;
  const id = requestId();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("register_media_upload", {
    p_event_id: eventId,
    p_kind: parsed.data.kind,
    p_storage_key: parsed.data.path,
    p_original_filename: parsed.data.filename,
    p_byte_size: parsed.data.byteSize,
    p_request_id: id,
  });
  if (error) {
    const code = databaseErrorCode(error.message);
    return apiError(code === "NOT_FOUND" ? 404 : 400, code ?? "MEDIA_UPLOAD_INVALID", "Không thể xác nhận tệp tải lên.", id);
  }
  const asset = Array.isArray(data) ? data[0] : data;
  return apiSuccess({ mediaAssetId: asset.media_asset_id, status: asset.status }, id, { status: 201 });
}
