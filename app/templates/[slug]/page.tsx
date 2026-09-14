/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/public-header";
import { TemplatePreview } from "@/components/template-preview";
import { getTemplate, templateCatalog } from "@/lib/templates/catalog";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { TrackedTemplateCta } from "@/components/tracked-template-cta";

export function generateStaticParams() {
  return templateCatalog.map((template) => ({ slug: template.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const template = getTemplate((await params).slug);
  if (!template) return {};
  const image=`/api/v1/templates/${template.id}/og`;
  return { title: `Xem mẫu ${template.name}`, description: template.description, robots: { index: true, follow: true }, openGraph:{title:`${template.name} · Invite`,description:template.description,type:"website",images:[{url:image,width:1200,height:630,alt:template.name}]},twitter:{card:"summary_large_image",images:[image]} };
}

export default async function TemplateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const template = getTemplate((await params).slug);
  if (!template) notFound();

  return (
    <>
      <PublicHeader />
      <main>
        <AnalyticsBeacon eventName="template_viewed" templateId={template.id}/>
        <section className="shell template-detail-heading">
          <div>
            <a className="back-link" href="/templates">← Bộ sưu tập</a>
            <p className="eyebrow mt-8">{template.categoryLabel}</p>
            <h1 className="display mt-3 text-5xl sm:text-7xl">{template.name}</h1>
            <p className="template-detail-description mt-5 max-w-xl text-lg leading-8 text-[var(--muted)]">{template.description}</p>
          </div>
          <div className="template-detail-actions">
            <TrackedTemplateCta templateId={template.id}/>
            <span>Miễn phí · chỉnh sửa sau khi đăng nhập</span>
          </div>
        </section>
        <TemplatePreview templateId={template.id}/>
      </main>
    </>
  );
}
