import { getCurrentAppUser } from "@/lib/auth/current-user";
import { databaseErrorCode, saveDraftSchema } from "@/lib/events/draft";
import { apiError, apiSuccess, requestId } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentAppUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const id = request.headers.get("Idempotency-Key") ?? requestId();
  const parsed = saveDraftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Nội dung thiệp chưa hợp lệ.", id);
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("save_event_draft", { p_event_id: eventId, p_expected_revision: parsed.data.revision, p_content: parsed.data.content, p_idempotency_key: id });
  if (error) {
    const code = databaseErrorCode(error.message);
    if (code === "REVISION_CONFLICT") return apiError(409, code, "Bản nháp đã được thay đổi ở một cửa sổ khác.", id);
    return apiError(code === "NOT_FOUND" ? 404 : 400, code ?? "INTERNAL_ERROR", "Không thể lưu bản nháp.", id);
  }
  const saved = Array.isArray(data) ? data[0] : data;
  return apiSuccess({ revision: saved.revision, replayed: saved.replayed }, id);
}
