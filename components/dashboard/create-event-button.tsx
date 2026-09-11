"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getTemplate } from "@/lib/templates/catalog";

export function CreateEventButton({ templateId = "vow-editorial" }: { templateId?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const template = getTemplate(templateId) ?? getTemplate("vow-editorial")!;

  async function createDraft() {
    setState("loading");
    const response = await fetch("/api/v1/events", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ templateId: template.id, eventCategory: template.category }) });
    const payload = await response.json();
    if (!response.ok) { setState("error"); return; }
    router.push(`/events/${payload.data.eventId}/edit`);
  }

  return <div><button className="button button-primary" disabled={state === "loading"} onClick={createDraft} type="button">{state === "loading" ? "Đang tạo…" : `Tạo với ${template.name}`}</button>{state === "error" && <p className="dashboard-action-error" role="alert">Không thể tạo bản nháp. Bạn có thể đã đạt giới hạn 3 bản nháp.</p>}</div>;
}
