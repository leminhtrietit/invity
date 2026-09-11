import { getCurrentAppUser } from "@/lib/auth/current-user";
import { mediaUploadSchema } from "@/lib/events/draft";
import { apiError, apiSuccess, requestId } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "audio/mpeg": "mp3", "audio/mp4": "m4a" };

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentAppUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const parsed = mediaUploadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Tệp tải lên không hợp lệ.");
  const { eventId } = await params;
  const path = `${user.id}/${eventId}/${crypto.randomUUID()}.${extensions[parsed.data.mimeType]}`;
  const supabase = await createSupabaseServerClient();
  const { data: signed, error: signError } = await supabase.storage.from("event-media").createSignedUploadUrl(path);
  const id = requestId();
  if (signError || !signed) return apiError(400, "MEDIA_UPLOAD_UNAVAILABLE", "Không thể chuẩn bị vùng tải tệp.", id);
  return apiSuccess({ path: signed.path, token: signed.token }, id, { status: 201 });
}
