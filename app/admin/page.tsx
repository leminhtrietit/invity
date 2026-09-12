import type { Metadata } from "next";
import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const metadata:Metadata={title:"Vận hành",robots:{index:false,follow:false}};
export default async function AdminPage(){if(!(await getCurrentAppUser()))redirect("/login?returnTo=%2Fadmin");const {data,error}=await (await createSupabaseServerClient()).rpc("admin_dashboard");if(error||!data)return notFound();return <><header className="shell flex min-h-20 items-center justify-between"><Link className="display text-2xl" href="/dashboard">Invite Ops</Link><Link href="/dashboard">Dashboard →</Link></header><AdminDashboard initial={data as never}/></>}
