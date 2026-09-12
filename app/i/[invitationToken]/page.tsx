import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicInvitation } from "@/components/invitation/public-invitation";
import { createPublicSupabaseClient, loadPublicEvent,loadPublicGiftOptions } from "@/lib/events/public-event";
import { getTemplate } from "@/lib/templates/catalog";

export const metadata: Metadata = { title: "Thiệp mời dành riêng cho bạn", robots: { index: false, follow: false } };

export default async function PersonalInvitationPage({ params }: { params: Promise<{ invitationToken: string }> }) {
  const { invitationToken } = await params;
  if (!/^[0-9a-f]{64}$/i.test(invitationToken)) notFound();
  const { data: personal } = await createPublicSupabaseClient().rpc("resolve_personal_invitation", { p_invitation_token: invitationToken });
  if (!personal?.publicCode) notFound();
  const [event,giftOptions] = await Promise.all([loadPublicEvent(personal.publicCode),loadPublicGiftOptions(personal.publicCode)]); if (!event) notFound();
  const baseTheme = getTemplate(event.templateId)?.theme; if (!baseTheme) notFound();
  return <main><PublicInvitation content={event.content} theme={{ ...baseTheme, ...event.content.appearance }} templateId={event.templateId} publicCode={event.publicCode} giftOptions={giftOptions} invitationToken={invitationToken} guestName={personal.guestName} initialRsvp={personal.rsvp} /></main>;
}
