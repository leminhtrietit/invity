import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";
import { TemplateGallery } from "@/components/template-gallery";
import { templateCatalog } from "@/lib/templates/catalog";

export const metadata: Metadata = { title: "Mẫu thiệp" };

export default function TemplatesPage() {
  return (
    <>
      <PublicHeader />
      <main className="shell py-14 sm:py-20">
        <section className="gallery-heading">
          <div><p className="eyebrow">10 thiết kế mở đầu</p><h1 className="display mt-3 text-5xl sm:text-7xl">Một phong cách<br />rất riêng cho bạn.</h1></div>
          <p>Mỗi mẫu có nhịp kể, kiểu chữ và cách trình bày riêng. Xem thử trực tiếp trên nhiều kích thước trước khi chọn.</p>
        </section>
        <TemplateGallery templates={templateCatalog} />
      </main>
    </>
  );
}
