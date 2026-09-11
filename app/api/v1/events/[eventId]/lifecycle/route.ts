import { getCurrentAppUser } from "@/lib/auth/current-user";
import { databaseErrorCode, lifecycleSchema } from "@/lib/events/draft";
import { apiError, apiSuccess, requestId } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!(await getCurrentAppUser())) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const parsed = lifecycleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(422, "VALIDATION_ERROR", "Trạng thái không hợp lệ.");
  const { eventId } = await params;
  const id = requestId();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("change_event_lifecycle", { p_event_id: eventId, p_target: parsed.data.target, p_request_id: id });
  if (error) { const code = databaseErrorCode(error.message); return apiError(code === "NOT_FOUND" ? 404 : 409, code ?? "INVALID_EVENT_TRANSITION", "Không thể đổi trạng thái sự kiện.", id); }
  return apiSuccess({ lifecycle: data }, id);
}
