import { getCurrentAppUser } from "@/lib/auth/current-user";
import { databaseErrorCode, switchTemplateSchema } from "@/lib/events/draft";
import { apiError, apiSuccess, requestId } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentAppUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const parsed = switchTemplateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Mẫu thiệp không hợp lệ.");
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const id = requestId();
  const { data, error } = await supabase.rpc("switch_event_template", { p_event_id: eventId, p_template_id: parsed.data.templateId, p_expected_revision: parsed.data.revision, p_request_id: id });
  if (error) {
    const code = databaseErrorCode(error.message);
    return apiError(code === "REVISION_CONFLICT" ? 409 : 400, code ?? "INTERNAL_ERROR", code === "REVISION_CONFLICT" ? "Bản nháp đã thay đổi ở cửa sổ khác." : "Không thể đổi mẫu.", id);
  }
  return apiSuccess({ revision: data, templateId: parsed.data.templateId }, id);
}
