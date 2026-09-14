"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import type { InvitationContent, InvitationMode, InvitationTheme } from "@/lib/invitation/schema";

type Renderer = ComponentType<{ content: InvitationContent; theme: InvitationTheme; mode: InvitationMode; templateId?: string }>;
type LoadedPreview = { Renderer: Renderer; content: InvitationContent; theme: InvitationTheme };

export function TemplatePreview({ templateId }: { templateId:string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<LoadedPreview | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.05) return;
      observer.disconnect();
      void Promise.all([
        import("@/components/invitation/invitation-renderer"),
        import("@/lib/templates/fixtures"),
        import("@/lib/templates/catalog"),
      ]).then(([rendererModule, fixtureModule, catalogModule]) => {
        const template = catalogModule.getTemplate(templateId);
        if (!template) return;
        setLoaded({ Renderer: rendererModule.InvitationRenderer, content: fixtureModule.getTemplateFixture(templateId), theme: template.theme });
      });
    }, { threshold: [0.05] });
    observer.observe(root);
    return () => observer.disconnect();
  }, [templateId]);

  return <div className="preview-workbench" ref={rootRef}>
    {loaded ? <PreviewFrame loaded={loaded} templateId={templateId} /> : <div className="preview-deferred"><span>✦</span><strong className="display">Bản xem thử đang chờ phía dưới</strong><small>Cuộn thêm một chút để tải thiết kế</small></div>}
  </div>;
}

function PreviewFrame({ loaded, templateId }: { loaded: LoadedPreview; templateId: string }) {
  const { Renderer, content, theme } = loaded;
  return <>
    {devices.map((item) => <input className="preview-device-radio" defaultChecked={item.id === "mobile"} id={`preview-${item.id}`} key={item.id} name="preview-device" type="radio" />)}
    <div className="preview-toolbar" aria-label="Kích thước xem thử"><div><span className="status-dot" /> Xem thử trực tiếp</div><div className="preview-tabs" role="group" aria-label="Chọn thiết bị">{devices.map((item) => <label htmlFor={`preview-${item.id}`} key={item.id}>{item.label}</label>)}</div><span className="preview-width"><span>390px</span><span>768px</span><span>1120px</span></span></div>
    <div className="preview-canvas"><div className="preview-device"><Renderer content={content} theme={theme} mode="preview" templateId={templateId} /></div></div>
  </>;
}

const devices = [{ id: "mobile", label: "Điện thoại" },{ id: "tablet", label: "Máy tính bảng" },{ id: "desktop", label: "Máy tính" }] as const;
