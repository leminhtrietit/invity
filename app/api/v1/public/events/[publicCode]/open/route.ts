import { apiSuccess } from "@/lib/http/api-response";
import { createPublicSupabaseClient } from "@/lib/events/public-event";
import { looksLikeBot,requestFingerprint } from "@/lib/rsvp/http";

export async function POST(request: Request, { params }: { params: Promise<{ publicCode: string }> }) {
  const { publicCode } = await params;
  const supabase=createPublicSupabaseClient();
  await supabase.rpc("record_public_open", { p_public_code: publicCode, p_is_bot: looksLikeBot(request) });
  if(!looksLikeBot(request)) await supabase.rpc("track_product_event",{p_event_name:"invitation_opened",p_anonymous_key:requestFingerprint(request),p_event_id:null,p_template_id:null});
  return apiSuccess({ recorded: true });
}
