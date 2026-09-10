import Link from "next/link";
import { PublicHeader } from "@/components/public-header";

export default function HomePage() {
  return (
    <>
      <PublicHeader />
      <main className="shell grid min-h-[calc(100vh-80px)] items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr]">
        <section>
          <p className="eyebrow">Thiệp mời trực tuyến</p>
          <h1 className="display mt-5 max-w-3xl text-5xl leading-[.98] sm:text-7xl">
            Một lời mời đẹp, mở đầu một ngày đáng nhớ.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted)]">
            Chọn mẫu, kể câu chuyện của bạn và nhận phản hồi từ khách mời — ngay trên điện thoại.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link className="button button-primary" href="/templates">Tạo thiệp miễn phí</Link>
            <Link className="button button-secondary" href="/templates">Khám phá mẫu thiệp</Link>
          </div>
        </section>
        <section aria-label="Xem trước thiệp" className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-8 -z-10 rounded-full bg-[var(--accent-soft)] blur-3xl" />
          <div className="card overflow-hidden p-3">
            <div className="aspect-[4/5] rounded-[18px] bg-[linear-gradient(160deg,#331f24,#89525e)] p-8 text-center text-white">
              <p className="mt-10 text-xs font-bold uppercase tracking-[.35em]">Save the date</p>
              <p className="display mt-20 text-5xl">Minh &amp; An</p>
              <div className="mx-auto mt-8 h-px w-16 bg-white/50" />
              <p className="mt-8 text-sm tracking-[.2em]">20 · 12 · 2026</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
