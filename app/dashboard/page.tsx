import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { LogoutButton } from "@/components/logout-button";
import { CreateEventButton } from "@/components/dashboard/create-event-button";
import { DeleteDraftButton } from "@/components/dashboard/delete-draft-button";
import { invitationContentSchema } from "@/lib/invitation/schema";
import { getTemplate } from "@/lib/templates/catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bảng điều khiển" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ templateId?: string }> }) {
  const [user, params] = await Promise.all([getCurrentAppUser(), searchParams]);
  if (!user) redirect("/login?returnTo=%2Fdashboard");
  const supabase = await createSupabaseServerClient();
  const { data: events } = await supabase.from("events").select("id,template_id,lifecycle,updated_at,event_drafts(revision,content)").neq("lifecycle", "deleted").order("updated_at", { ascending: false });
  const selectedTemplateId = getTemplate(params.templateId ?? "")?.id ?? "vow-editorial";

  return (
    <>
      <header className="shell flex min-h-20 items-center justify-between">
        <Link className="display text-2xl" href="/">Invite</Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[var(--muted)] sm:block">{user.displayName}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="shell py-14">
        <p className="eyebrow">Bảng điều khiển</p>
        <h1 className="display mt-3 text-5xl">Chào {user.displayName}</h1>
        <section className="dashboard-summary"><div><p className="text-sm font-bold text-[var(--accent)]">GÓI FREE</p><strong>{events?.length ?? 0}<span>/3 bản nháp</span></strong></div><CreateEventButton templateId={selectedTemplateId} /></section>
        {events?.length ? <section className="dashboard-events"><div className="dashboard-section-heading"><h2 className="display">Thiệp của bạn</h2><Link href="/templates">Khám phá mẫu khác →</Link></div><div className="dashboard-event-grid">{events.map((event) => {
          const draft = Array.isArray(event.event_drafts) ? event.event_drafts[0] : event.event_drafts;
          const parsed = invitationContentSchema.safeParse(draft?.content);
          const title = parsed.success ? parsed.data.title : "Bản nháp chưa đặt tên";
          return <article className="dashboard-event-card" key={event.id}><div className="dashboard-event-art"><span>{getTemplate(event.template_id)?.motif ?? "✦"}</span></div><div><p>{getTemplate(event.template_id)?.name ?? event.template_id} · Bản nháp</p><h3 className="display">{title}</h3><small>Cập nhật {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(event.updated_at))}</small><div className="dashboard-event-actions"><Link className="button button-secondary" href={`/events/${event.id}/edit`}>Tiếp tục sửa</Link><DeleteDraftButton eventId={event.id} /></div></div></article>;
        })}</div></section> : <section className="card mt-10 p-7"><p className="eyebrow">Bắt đầu từ một câu chuyện</p><h2 className="display mt-2 text-3xl">Chưa có sự kiện nào</h2><p className="mt-3 max-w-xl leading-7 text-[var(--muted)]">Chọn một mẫu để tạo bản nháp đầu tiên. Bản nháp không sử dụng lượt xuất bản trong tháng.</p><Link className="button button-secondary mt-6" href="/templates">Xem mẫu thiệp</Link></section>}
      </main>
    </>
  );
}
