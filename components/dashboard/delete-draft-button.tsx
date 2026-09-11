"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteDraftButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!window.confirm("Xóa bản nháp này? Lượt sự kiện tháng không bị ảnh hưởng.")) return;
    setBusy(true);
    const response = await fetch(`/api/v1/events/${eventId}`, { method: "DELETE" });
    if (response.ok) router.refresh(); else setBusy(false);
  }
  return <button className="draft-delete" disabled={busy} onClick={remove} type="button">{busy ? "Đang xóa…" : "Xóa"}</button>;
}
