import { apiError, apiSuccess, requestId } from "@/lib/http/api-response";
import { createPublicSupabaseClient } from "@/lib/events/public-event";
import { requestFingerprint, rsvpError } from "@/lib/rsvp/http";
import { rsvpDatabaseError, sharedRsvpSchema } from "@/lib/rsvp/schema";

export async function POST(request: Request, { params }: { params: Promise<{ publicCode: string }> }) {
  const id = request.headers.get("Idempotency-Key") ?? requestId();
  const parsed = sharedRsvpSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(422, "VALIDATION_ERROR", "Vui lòng kiểm tra tên, số điện thoại và phản hồi.", id, parsed.error.issues.map((issue) => ({ path: issue.path.join("."), code: issue.code })));
  if (parsed.data.honeypot) return apiSuccess({ accepted: true }, id);
  const { publicCode } = await params;
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc("submit_shared_rsvp", {
    p_public_code: publicCode, p_display_name: parsed.data.name, p_phone: parsed.data.phone,
    p_response: parsed.data.response, p_companion_count: parsed.data.companionCount,
    p_wish: parsed.data.wish, p_consent_public: parsed.data.consentPublicWish,
    p_fingerprint_hash: requestFingerprint(request), p_idempotency_key: id,
  });
  if (error) return rsvpError(rsvpDatabaseError(error.message), id);
  const result = Array.isArray(data) ? data[0] : data;
  const response = apiSuccess({ accepted: true, allocationNumber: result.allocation_number, editPath: `/r/${result.edit_secret}`, replayed: result.replayed }, id, { status: result.replayed ? 200 : 201 });
  response.cookies.set(`invity_rsvp_${publicCode}`, result.edit_secret, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 180 });
  return response;
}
