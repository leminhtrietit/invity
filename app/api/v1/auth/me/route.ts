import { getCurrentAppUser } from "@/lib/auth/current-user";
import { apiError, apiSuccess } from "@/lib/http/api-response";

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
  return apiSuccess(user);
}
