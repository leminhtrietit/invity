import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EventEditor } from "@/components/editor/event-editor";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { defaultDraftContent } from "@/lib/events/draft";
import { invitationContentSchema } from "@/lib/invitation/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Soạn thiệp", robots: { index: false, follow: false } };

export default async function EditEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  if (!(await getCurrentAppUser())) redirect("/login?returnTo=%2Fdashboard");
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("events").select("id,template_id,lifecycle,public_code,event_drafts(revision,content)").eq("id", eventId).in("lifecycle", ["draft", "published", "hidden"]).maybeSingle();
  if (!data) notFound();
  const draft = Array.isArray(data.event_drafts) ? data.event_drafts[0] : data.event_drafts;
  const parsed = invitationContentSchema.safeParse(draft?.content);
  return <EventEditor eventId={data.id} initialContent={parsed.success ? parsed.data : defaultDraftContent()} initialRevision={draft?.revision ?? 1} initialTemplateId={data.template_id} initiallyPersisted={parsed.success} initialLifecycle={data.lifecycle} initialPublicCode={data.public_code} />;
}
