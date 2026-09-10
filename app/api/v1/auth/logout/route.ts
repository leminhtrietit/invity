import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, requestId } from "@/lib/http/api-response";

export async function POST(request: Request) {
  const id = requestId();
  const key = request.headers.get("Idempotency-Key");
  if (!key) return apiError(422, "VALIDATION_ERROR", "Thiếu Idempotency-Key.", id);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) return apiError(500, "AUTH_LOGOUT_FAILED", "Chưa thể đăng xuất. Vui lòng thử lại.", id);
  return apiSuccess({ signedOut: true }, id);
}
