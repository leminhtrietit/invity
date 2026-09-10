import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { LogoutButton } from "@/components/logout-button";

export const metadata: Metadata = { title: "Bảng điều khiển" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ templateId?: string }> }) {
  const [user, params] = await Promise.all([getCurrentAppUser(), searchParams]);
  if (!user) redirect("/login?returnTo=%2Fdashboard");

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
        {params.templateId && <p className="mt-5 rounded-2xl border border-[var(--border)] bg-white p-4">Mẫu đã chọn: <strong>{params.templateId}</strong>. Tạo bản nháp sẽ được triển khai trong G2/G4.</p>}
        <section className="card mt-10 p-7">
          <p className="text-sm font-bold text-[var(--accent)]">GÓI FREE</p>
          <h2 className="display mt-2 text-3xl">Chưa có sự kiện nào</h2>
          <p className="mt-3 max-w-xl leading-7 text-[var(--muted)]">Nền tảng và tài khoản của bạn đã sẵn sàng. Nghiệp vụ tạo bản nháp bắt đầu ở giai đoạn dữ liệu tiếp theo.</p>
          <Link className="button button-primary mt-6" href="/templates">Xem mẫu thiệp</Link>
        </section>
      </main>
    </>
  );
}
