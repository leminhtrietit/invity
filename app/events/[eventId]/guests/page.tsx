import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GuestManager } from "@/components/dashboard/guest-manager";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Quản lý khách mời", robots: { index: false, follow: false } };

export default async function GuestsPage({ params }: { params: Promise<{ eventId: string }> }) {
  if (!(await getCurrentAppUser())) redirect("/login?returnTo=%2Fdashboard");
  const { eventId } = await params; const supabase = await createSupabaseServerClient();
  const [{ data: event }, { data: counter }, { data: guests }] = await Promise.all([
    supabase.from("events").select("id,public_code").eq("id",eventId).maybeSingle(),
    supabase.from("event_quota_counters").select("guest_slots_used").eq("event_id",eventId).maybeSingle(),
    supabase.from("guest_slots").select("id,allocation_number,allocation_source,display_name,salutation,guest_group,sent_at,revoked_at,rsvps(response,companion_count)").eq("event_id",eventId).order("allocation_number"),
  ]);
  if (!event) notFound();
  return <><header className="shell flex min-h-20 items-center justify-between"><Link className="display text-2xl" href="/dashboard">Invite</Link><Link href={`/events/${eventId}/edit`}>← Quay lại trình soạn</Link></header><GuestManager eventId={eventId} publicCode={event.public_code} initialGuests={guests ?? []} initialUsed={counter?.guest_slots_used ?? 0} /></>;
}
