import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/public-header";
import { TemplatePreview } from "@/components/template-preview";
import { vowEditorialFixture } from "@/lib/invitation/fixtures";
import { getTemplate, templateCatalog } from "@/lib/templates/catalog";

export function generateStaticParams() {
  return templateCatalog.map((template) => ({ slug: template.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const template = getTemplate((await params).slug);
  if (!template) return {};
  return { title: `Xem mẫu ${template.name}`, description: template.description, robots: { index: false, follow: false } };
}

export default async function TemplateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const template = getTemplate((await params).slug);
  if (!template) notFound();

  return (
    <>
      <PublicHeader />
      <main>
        <section className="shell template-detail-heading">
          <div>
            <Link className="back-link" href="/templates">← Bộ sưu tập</Link>
            <p className="eyebrow mt-8">{template.categoryLabel}</p>
            <h1 className="display mt-3 text-5xl sm:text-7xl">{template.name}</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--muted)]">{template.description}</p>
          </div>
          <div className="template-detail-actions">
            <Link className="button button-primary" href={`/login?returnTo=${encodeURIComponent(`/dashboard?templateId=${template.id}`)}`}>Dùng mẫu này</Link>
            <span>Miễn phí · chỉnh sửa sau khi đăng nhập</span>
          </div>
        </section>
        <TemplatePreview content={vowEditorialFixture} theme={template.theme} />
      </main>
    </>
  );
}
