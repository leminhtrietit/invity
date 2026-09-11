import { getCurrentAppUser } from "@/lib/auth/current-user";
import { apiError, apiSuccess, requestId } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(_: Request, { params }: { params: Promise<{ eventId: string; guestId: string }> }) {
  if (!(await getCurrentAppUser())) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const { eventId, guestId } = await params; const id = requestId();
  const { data, error } = await (await createSupabaseServerClient()).rpc("rotate_personal_invitation", { p_event_id: eventId, p_guest_slot_id: guestId, p_request_id: id });
  if (error) return apiError(404, "NOT_FOUND", "Không tìm thấy link khách có thể đổi.", id);
  return apiSuccess({ invitationToken: data, invitationPath: `/i/${data}` }, id);
}
