"use client";

export default function DashboardError({ reset }: { reset: () => void }) {
  return <main className="shell grid min-h-screen place-items-center"><section className="card max-w-md p-8 text-center"><h1 className="display text-4xl">Chưa tải được bảng điều khiển</h1><p className="mt-4 text-[var(--muted)]">Kết nối có thể đang gián đoạn.</p><button className="button button-primary mt-6" onClick={reset}>Thử lại</button></section></main>;
}
