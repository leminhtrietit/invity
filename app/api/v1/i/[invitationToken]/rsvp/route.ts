import { apiError, apiSuccess, requestId } from "@/lib/http/api-response";
import { createPublicSupabaseClient } from "@/lib/events/public-event";
import { requestFingerprint,rsvpError } from "@/lib/rsvp/http";
import { rsvpDatabaseError, rsvpPayloadSchema } from "@/lib/rsvp/schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ invitationToken: string }> }) {
  const id = request.headers.get("Idempotency-Key") ?? requestId();
  const parsed = rsvpPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(422, "VALIDATION_ERROR", "Phản hồi chưa hợp lệ.", id);
  const { invitationToken } = await params;
  const supabase=createPublicSupabaseClient();const { data, error } = await supabase.rpc("submit_personal_rsvp", { p_invitation_token: invitationToken, p_response: parsed.data.response, p_companion_count: parsed.data.companionCount, p_wish: parsed.data.wish, p_consent_public: parsed.data.consentPublicWish, p_idempotency_key: id });
  if (error) return rsvpError(rsvpDatabaseError(error.message), id);
  const result = Array.isArray(data) ? data[0] : data;
  if(!result.replayed) await supabase.rpc("track_product_event",{p_event_name:"rsvp_submitted",p_anonymous_key:requestFingerprint(request),p_event_id:null,p_template_id:null});
  return apiSuccess({ accepted: true, revision: result.revision, replayed: result.replayed }, id);
}
