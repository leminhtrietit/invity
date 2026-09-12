"use client";

import { useState } from "react";
import { InvitationRenderer } from "@/components/invitation/invitation-renderer";
import type { InvitationContent, InvitationTheme } from "@/lib/invitation/schema";

const devices = [
  { id: "mobile", label: "Điện thoại", width: 390 },
  { id: "tablet", label: "Máy tính bảng", width: 768 },
  { id: "desktop", label: "Máy tính", width: 1120 },
] as const;

export function TemplatePreview({ content, theme, templateId }: { content: InvitationContent; theme: InvitationTheme; templateId:string }) {
  const [device, setDevice] = useState<(typeof devices)[number]>(devices[0]);

  return (
    <div className="preview-workbench">
      <div className="preview-toolbar" aria-label="Kích thước xem thử">
        <div><span className="status-dot" /> Xem thử trực tiếp</div>
        <div className="preview-tabs" role="group" aria-label="Chọn thiết bị">
          {devices.map((item) => <button aria-pressed={device.id === item.id} key={item.id} onClick={() => setDevice(item)} type="button">{item.label}</button>)}
        </div>
        <span>{device.width}px</span>
      </div>
      <div className="preview-canvas">
        <div className="preview-device" style={{ maxWidth: device.width }}>
          <InvitationRenderer content={content} theme={theme} mode="preview" templateId={templateId} />
        </div>
      </div>
    </div>
  );
}
