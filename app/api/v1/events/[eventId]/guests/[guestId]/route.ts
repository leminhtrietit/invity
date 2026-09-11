import { getCurrentAppUser } from "@/lib/auth/current-user";
import { apiError, apiSuccess, requestId } from "@/lib/http/api-response";
import { guestStateSchema } from "@/lib/rsvp/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string; guestId: string }> }) {
  if (!(await getCurrentAppUser())) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const parsed = guestStateSchema.safeParse(await request.json().catch(() => null)); const id = requestId();
  if (!parsed.success) return apiError(422, "VALIDATION_ERROR", "Trạng thái chưa hợp lệ.", id);
  const { eventId, guestId } = await params;
  const { data, error } = await (await createSupabaseServerClient()).rpc("set_guest_invitation_state", { p_event_id: eventId, p_guest_slot_id: guestId, p_target: parsed.data.target, p_request_id: id });
  if (error) return apiError(404, "NOT_FOUND", "Không tìm thấy khách.", id);
  return apiSuccess({ state: data }, id);
}
