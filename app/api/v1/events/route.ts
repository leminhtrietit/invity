import { getCurrentAppUser } from "@/lib/auth/current-user";
import { createEventSchema, databaseErrorCode, validateTemplateCategory } from "@/lib/events/draft";
import { apiError, apiSuccess, requestId } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("events").select("id,template_id,category,lifecycle,created_at,updated_at,event_drafts(revision,content,updated_at)").neq("lifecycle", "deleted").order("updated_at", { ascending: false });
  if (error) return apiError(500, "INTERNAL_ERROR", "Không thể tải danh sách sự kiện.");
  return apiSuccess(data);
}

export async function POST(request: Request) {
  const user = await getCurrentAppUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để tạo thiệp.");
  const id = request.headers.get("Idempotency-Key") ?? requestId();
  const parsed = createEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !validateTemplateCategory(parsed.data?.templateId ?? "", parsed.data?.eventCategory ?? "")) return apiError(400, "VALIDATION_ERROR", "Mẫu thiệp hoặc danh mục không hợp lệ.", id);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_event_draft", { p_template_id: parsed.data.templateId, p_category: parsed.data.eventCategory, p_idempotency_key: id });
  if (error) {
    const code = databaseErrorCode(error.message);
    if (code === "DRAFT_LIMIT_EXCEEDED") return apiError(409, code, "Gói miễn phí cho phép tối đa 3 bản nháp.", id);
    return apiError(code === "UNAUTHENTICATED" ? 401 : 400, code ?? "INTERNAL_ERROR", "Không thể tạo bản nháp.", id);
  }
  const created = Array.isArray(data) ? data[0] : data;
  if (!created.replayed) await supabase.rpc("track_product_event", { p_event_name: "draft_created", p_anonymous_key: null, p_event_id: created.event_id, p_template_id: parsed.data.templateId });
  return apiSuccess({ eventId: created.event_id, revision: created.revision, replayed: created.replayed }, id, { status: 201, headers: { Location: `/events/${created.event_id}/edit` } });
}
