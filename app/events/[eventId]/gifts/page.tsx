import type { Metadata } from "next";
import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { GiftAccountManager } from "@/components/dashboard/gift-account-manager";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import type { GiftAccount } from "@/lib/gifts/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata:Metadata={title:"Cấu hình quà mừng",robots:{index:false,follow:false}};

export default async function GiftAccountsPage({params}:{params:Promise<{eventId:string}>}){
  if(!(await getCurrentAppUser())) redirect("/login?returnTo=%2Fdashboard");
  const {eventId}=await params;const supabase=await createSupabaseServerClient();
  const [{data:accounts,error},{data:event}]=await Promise.all([supabase.rpc("list_gift_accounts",{p_event_id:eventId}),supabase.from("events").select("lifecycle,event_drafts(content)").eq("id",eventId).single()]);
  if(error||!event) notFound();const draft=Array.isArray(event.event_drafts)?event.event_drafts[0]:event.event_drafts;const title=typeof draft?.content==="object"&&draft.content&&"title" in draft.content?String(draft.content.title):"Sự kiện";
  return <><header className="shell flex min-h-20 items-center justify-between"><Link className="display text-2xl" href="/dashboard">Invite</Link><Link href={`/events/${eventId}/edit`}>← Quay lại trình soạn</Link></header><GiftAccountManager eventId={eventId} eventTitle={title} isPublished={event.lifecycle==="published"} initialAccounts={(Array.isArray(accounts)?accounts:[]) as GiftAccount[]}/></>;
}
