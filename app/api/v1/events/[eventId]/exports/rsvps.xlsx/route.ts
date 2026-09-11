import { getCurrentAppUser } from "@/lib/auth/current-user";
import { apiError } from "@/lib/http/api-response";
import { filterDashboardGuests, loadEventDashboard, parseDashboardFilters } from "@/lib/rsvp/dashboard";
import { createRsvpWorkbook } from "@/lib/rsvp/export";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!(await getCurrentAppUser())) return apiError(401,"UNAUTHENTICATED","Phiên đăng nhập không hợp lệ.");
  const { eventId } = await params; const dashboard = await loadEventDashboard(await createSupabaseServerClient(),eventId);
  if (!dashboard) return apiError(404,"NOT_FOUND","Không tìm thấy sự kiện.");
  const filtered = filterDashboardGuests(dashboard.guests,parseDashboardFilters(new URL(request.url).searchParams));
  const bytes = await createRsvpWorkbook(filtered);
  return new Response(new Uint8Array(bytes),{ headers:{ "Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition":`attachment; filename="rsvp-${eventId}.xlsx"`, "Cache-Control":"private, no-store" } });
}
