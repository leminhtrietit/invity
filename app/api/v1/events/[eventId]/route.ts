import { getCurrentAppUser } from "@/lib/auth/current-user";
import { apiError, apiSuccess, requestId } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentAppUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("events").select("id,template_id,category,lifecycle,created_at,updated_at,event_drafts(revision,content,updated_at),media_assets(id,kind,status,storage_key,byte_size,variants,failure_code)").eq("id", eventId).neq("lifecycle", "deleted").maybeSingle();
  if (!data) return apiError(404, "NOT_FOUND", "Không tìm thấy sự kiện.");
  return apiSuccess(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentAppUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const id = requestId();
  const { error } = await supabase.rpc("delete_draft_event", { p_event_id: eventId, p_request_id: id });
  if (error) return apiError(404, "NOT_FOUND", "Không tìm thấy bản nháp có thể xóa.", id);
  return apiSuccess({ deleted: true }, id);
}
