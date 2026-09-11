import { createClient } from "@supabase/supabase-js";
import { invitationContentSchema, type InvitationContent } from "../invitation/schema.ts";

export type PublicEvent = { publicCode: string; eventVersion: number; templateId: string; content: InvitationContent };

function publicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

function mediaUrl(publicCode: string, mediaAssetId: string) {
  return `/api/v1/public/events/${publicCode}/media/${mediaAssetId}`;
}

export async function loadPublicEvent(publicCode: string): Promise<PublicEvent | null> {
  if (!/^[0-9a-f]{36}$/i.test(publicCode)) return null;
  const { data, error } = await publicClient().rpc("get_public_event", { p_public_code: publicCode });
  if (error || !data || typeof data !== "object") return null;
  const raw = data as { publicCode?: string; eventVersion?: number; templateId?: string; content?: unknown };
  const parsed = invitationContentSchema.safeParse(raw.content);
  if (!parsed.success || !raw.publicCode || !raw.templateId || !raw.eventVersion) return null;
  const content = structuredClone(parsed.data);
  if (content.cover?.mediaAssetId) content.cover.src = mediaUrl(publicCode, content.cover.mediaAssetId);
  content.album = content.album.map((item) => item.mediaAssetId ? { ...item, src: mediaUrl(publicCode, item.mediaAssetId) } : item);
  if (content.music?.mediaAssetId) content.music.src = mediaUrl(publicCode, content.music.mediaAssetId);
  return { publicCode: raw.publicCode, eventVersion: raw.eventVersion, templateId: raw.templateId, content };
}

export function createPublicSupabaseClient() { return publicClient(); }
