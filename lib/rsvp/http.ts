import { createHash } from "node:crypto";
import { apiError } from "@/lib/http/api-response";

export function requestFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const agent = request.headers.get("user-agent") ?? "unknown";
  return createHash("sha256").update(`${forwarded}|${agent}`).digest("hex");
}

export function rsvpError(code: string | undefined, id: string) {
  if (code === "GUEST_QUOTA_EXCEEDED") return apiError(409, code, "Sự kiện đã dùng hết 50 suất khách.", id);
  if (code === "RSVP_CLOSED") return apiError(422, code, "Sự kiện đã đóng nhận phản hồi.", id);
  if (code === "RATE_LIMITED") return apiError(429, code, "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.", id);
  if (code === "INVALID_INVITATION_TOKEN" || code === "INVALID_EDIT_SESSION" || code === "NOT_FOUND") return apiError(404, code ?? "NOT_FOUND", "Không tìm thấy quyền phản hồi hợp lệ.", id);
  if (code === "IDEMPOTENCY_CONFLICT") return apiError(409, code, "Yêu cầu đã được dùng với nội dung khác.", id);
  return apiError(422, code ?? "VALIDATION_ERROR", "Thông tin phản hồi chưa hợp lệ.", id);
}

export function looksLikeBot(request: Request) {
  return /bot|crawler|spider|preview|facebookexternalhit|telegrambot|zalo/i.test(request.headers.get("user-agent") ?? "");
}
