import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";

export const metadata: Metadata = { title: "Mẫu thiệp" };

const templates = [
  { id: "vow-editorial", name: "Vow Editorial", category: "Thiệp cưới", tone: "from-[#3a2328] to-[#8b5660]" },
  { id: "the-promise", name: "The Promise", category: "Lễ đính hôn", tone: "from-[#526858] to-[#a7b29f]" },
  { id: "birthday-studio", name: "Birthday Studio", category: "Sinh nhật", tone: "from-[#69497b] to-[#d69887]" },
];

export default function TemplatesPage() {
  return (
    <>
      <PublicHeader />
      <main className="shell py-14">
        <p className="eyebrow">Bộ sưu tập mở đầu</p>
        <h1 className="display mt-3 text-5xl">Chọn phong cách của bạn</h1>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {templates.map((template) => (
            <article className="card overflow-hidden p-3" key={template.id}>
              <div className={`aspect-[4/5] rounded-[18px] bg-gradient-to-br ${template.tone}`} />
              <div className="p-4">
                <p className="text-sm text-[var(--muted)]">{template.category}</p>
                <h2 className="display mt-1 text-2xl">{template.name}</h2>
                <Link className="mt-4 inline-block font-bold text-[var(--accent)]" href={`/login?returnTo=${encodeURIComponent(`/dashboard?templateId=${template.id}`)}`}>
                  Dùng mẫu này →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
