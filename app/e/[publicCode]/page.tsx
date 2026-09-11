import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { PublicInvitation } from "@/components/invitation/public-invitation";
import { loadPublicEvent } from "@/lib/events/public-event";
import { getTemplate } from "@/lib/templates/catalog";

export async function generateMetadata({ params }: { params: Promise<{ publicCode: string }> }): Promise<Metadata> {
  const { publicCode } = await params;
  const event = await loadPublicEvent(publicCode);
  if (!event) return { title: "Thiệp không tồn tại", robots: { index: false, follow: false } };
  const description = event.content.prelude ?? `Trân trọng mời bạn đến ${event.content.title}.`;
  const image = `/api/v1/public/events/${publicCode}/og?v=${event.eventVersion}`;
  return { title: event.content.title, description, robots: { index: false, follow: false }, openGraph: { title: event.content.title, description, type: "website", images: [{ url: image, width: 1200, height: 630, alt: event.content.title }] }, twitter: { card: "summary_large_image", title: event.content.title, description, images: [image] } };
}

export default async function PublicEventPage({ params }: { params: Promise<{ publicCode: string }> }) {
  const { publicCode } = await params;
  const event = await loadPublicEvent(publicCode);
  if (!event) notFound();
  const baseTheme = getTemplate(event.templateId)?.theme;
  if (!baseTheme) notFound();
  const secret = (await cookies()).get(`invity_rsvp_${publicCode}`)?.value;
  let initialRsvp = null;
  if (secret) {
    const { data } = await (await import("@/lib/events/public-event")).createPublicSupabaseClient().rpc("resolve_shared_rsvp_edit", { p_edit_secret: secret });
    if (data?.publicCode === publicCode) initialRsvp = data;
  }
  return <main><PublicInvitation content={event.content} theme={{ ...baseTheme, ...event.content.appearance }} publicCode={publicCode} guestName={initialRsvp?.name} initialRsvp={initialRsvp} /></main>;
}
