"use client";

import Link from "next/link";
import { useState } from "react";
import type { TemplateCategory, TemplateDefinition } from "@/lib/templates/catalog";

const filters: { label: string; value: "all" | TemplateCategory }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Thiệp cưới", value: "wedding" },
  { label: "Lễ đính hôn", value: "engagement" },
  { label: "Sinh nhật", value: "birthday_baby" },
  { label: "Tốt nghiệp", value: "graduation" },
  { label: "Tiệc mừng", value: "other" },
];

export function TemplateGallery({ templates }: { templates: TemplateDefinition[] }) {
  const [active, setActive] = useState<(typeof filters)[number]["value"]>("all");
  const visible = active === "all" ? templates : templates.filter((template) => template.category === active);

  return <>
    <nav className="category-chips" aria-label="Danh mục mẫu">
      {filters.map((filter) => <button aria-pressed={active === filter.value} key={filter.value} onClick={() => setActive(filter.value)} type="button">{filter.label}</button>)}
    </nav>
    <p className="gallery-count" role="status">{visible.length} mẫu phù hợp</p>
    <div className="template-grid">
      {visible.map((template) => {
        const index = templates.findIndex((item) => item.id === template.id);
        return <article className={`template-card ${template.featured && active === "all" ? "template-card-featured" : ""}`} key={template.id}>
          <Link aria-label={`Xem mẫu ${template.name}`} className="template-art" href={`/templates/${template.id}`} style={{ background: `linear-gradient(155deg, ${template.theme.ink}, ${template.theme.accent})`, color: template.theme.surface }}>
            <span className="template-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="template-motif">{template.motif}</span>
            <span className="template-art-name">{template.name}</span>
          </Link>
          <div className="template-card-copy">
            <div><p>{template.categoryLabel}</p><h2 className="display">{template.name}</h2></div>
            <Link href={`/templates/${template.id}`} aria-label={`Mở bản xem thử ${template.name}`}>↗</Link>
          </div>
        </article>;
      })}
    </div>
  </>;
}
