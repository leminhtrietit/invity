import { apiSuccess } from "@/lib/http/api-response";
import { createPublicSupabaseClient } from "@/lib/events/public-event";
import { looksLikeBot } from "@/lib/rsvp/http";

export async function POST(request: Request, { params }: { params: Promise<{ publicCode: string }> }) {
  const { publicCode } = await params;
  await createPublicSupabaseClient().rpc("record_public_open", { p_public_code: publicCode, p_is_bot: looksLikeBot(request) });
  return apiSuccess({ recorded: true });
}
