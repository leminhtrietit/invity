import { getCurrentAppUser } from "@/lib/auth/current-user";
import { databaseErrorCode, publishEventSchema } from "@/lib/events/draft";
import { invitationContentSchema } from "@/lib/invitation/schema";
import { apiError, apiSuccess, requestId } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!(await getCurrentAppUser())) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const id = request.headers.get("Idempotency-Key") ?? requestId();
  const parsed = publishEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(422, "VALIDATION_ERROR", "Revision bản nháp không hợp lệ.", id);
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: draft } = await supabase.from("event_drafts").select("content").eq("event_id", eventId).maybeSingle();
  const content = invitationContentSchema.safeParse(draft?.content);
  if (!content.success) return apiError(422, "PREFLIGHT_FAILED", "Thiệp còn trường bắt buộc chưa hợp lệ.", id, content.error.issues.map((issue) => ({ path: issue.path.join("."), code: issue.code })));
  const { data, error } = await supabase.rpc("publish_event_draft", { p_event_id: eventId, p_expected_revision: parsed.data.revision, p_idempotency_key: id });
  if (error) {
    const code = databaseErrorCode(error.message);
    const status = code === "REVISION_CONFLICT" || code === "EVENT_QUOTA_EXCEEDED" || code === "MEDIA_NOT_READY" ? 409 : code === "NOT_FOUND" ? 404 : 422;
    const message = code === "EVENT_QUOTA_EXCEEDED" ? "Gói Free chỉ cho phép xuất bản một sự kiện trong tháng này." : code === "MEDIA_NOT_READY" ? "Một số ảnh hoặc nhạc vẫn đang xử lý." : code === "REVISION_CONFLICT" ? "Bản nháp đã thay đổi ở cửa sổ khác." : "Thiệp chưa đáp ứng điều kiện xuất bản.";
    return apiError(status, code ?? "PUBLISH_FAILED", message, id);
  }
  const result = Array.isArray(data) ? data[0] : data;
  return apiSuccess({ versionId: result.version_id, eventVersion: result.version_number, publicCode: result.public_code, firstPublication: result.first_publication, replayed: result.replayed, publicUrl: `/e/${result.public_code}` }, id);
}
