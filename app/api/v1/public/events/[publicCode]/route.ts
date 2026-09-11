import { loadPublicEvent } from "@/lib/events/public-event";
import { apiError, apiSuccess } from "@/lib/http/api-response";

export async function GET(_request: Request, { params }: { params: Promise<{ publicCode: string }> }) {
  const { publicCode } = await params;
  const event = await loadPublicEvent(publicCode);
  if (!event) return apiError(404, "NOT_FOUND", "Thiệp không tồn tại hoặc đang tạm ẩn.");
  return apiSuccess(event);
}
