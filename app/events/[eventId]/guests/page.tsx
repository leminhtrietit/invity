import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GuestManager } from "@/components/dashboard/guest-manager";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadEventDashboard } from "@/lib/rsvp/dashboard";

export const metadata: Metadata = { title: "Quản lý khách mời", robots: { index: false, follow: false } };

export default async function GuestsPage({ params }: { params: Promise<{ eventId: string }> }) {
  if (!(await getCurrentAppUser())) redirect("/login?returnTo=%2Fdashboard");
  const { eventId } = await params;
  const dashboard=await loadEventDashboard(await createSupabaseServerClient(),eventId);
  if (!dashboard) notFound();
  return <><header className="shell flex min-h-20 items-center justify-between"><Link className="display text-2xl" href="/dashboard">Invite</Link><Link href={`/events/${eventId}/edit`}>← Quay lại trình soạn</Link></header><GuestManager eventId={eventId} publicCode={dashboard.event.publicCode} eventTitle={dashboard.event.title} initialGuests={dashboard.guests} initialUsed={dashboard.summary.allocated} opens={dashboard.opens}/></>;
}
