"use client";

import { FormEvent, useState } from "react";

export type RsvpInitial = { response?: "attending" | "declined"; companionCount?: number; wish?: string; consentPublicWish?: boolean };

export function RsvpForm({ endpoint, guestName, initial, maxCompanions, method = "PATCH" }: { endpoint: string; guestName?: string; initial?: RsvpInitial | null; maxCompanions: number; method?: "POST" | "PATCH" }) {
  const [response, setResponse] = useState<"attending" | "declined">(initial?.response ?? "attending");
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [editPath, setEditPath] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("sending"); setMessage("");
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {
      response, companionCount: response === "declined" ? 0 : Number(form.get("companionCount") ?? 0),
      wish: form.get("wish")?.toString() ?? "", consentPublicWish: form.get("consentPublicWish") === "on",
    };
    if (!guestName) { body.name = form.get("name")?.toString(); body.phone = form.get("phone")?.toString(); body.honeypot = form.get("website")?.toString() ?? ""; }
    const result = await fetch(endpoint, { method, headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(body) }).catch(() => null);
    const payload = await result?.json().catch(() => null);
    if (!result?.ok) { setState("error"); setMessage(payload?.error?.message ?? "Không thể gửi phản hồi. Vui lòng thử lại."); return; }
    setState("success"); setEditPath(payload?.data?.editPath); setMessage("Đã ghi nhận phản hồi của bạn. Cảm ơn bạn đã dành thời gian xác nhận!");
  }

  return <section className="public-rsvp-form" id="rsvp-form">
    <p className="eyebrow">RSVP</p><h2>{initial ? "Cập nhật phản hồi" : "Xác nhận tham dự"}</h2>
    {guestName && <p className="rsvp-greeting">Thân gửi <strong>{guestName}</strong></p>}
    <form onSubmit={submit}>
      {!guestName && <div className="rsvp-grid"><label>Họ và tên<input autoComplete="name" name="name" required minLength={2} maxLength={100} /></label><label>Số điện thoại<input autoComplete="tel" inputMode="tel" name="phone" required minLength={9} maxLength={20} /></label></div>}
      {!guestName && <label className="rsvp-honeypot" aria-hidden="true">Website<input autoComplete="off" name="website" tabIndex={-1} /></label>}
      <fieldset><legend>Bạn sẽ tham dự?</legend><div className="rsvp-options"><label><input checked={response === "attending"} onChange={() => setResponse("attending")} type="radio" name="response" /> Có, mình sẽ đến</label><label><input checked={response === "declined"} onChange={() => setResponse("declined")} type="radio" name="response" /> Rất tiếc, mình không thể đến</label></div></fieldset>
      {response === "attending" && <label>Số người đi cùng<select name="companionCount" defaultValue={initial?.companionCount ?? 0}>{Array.from({ length: maxCompanions + 1 }, (_, value) => <option value={value} key={value}>{value} người</option>)}</select></label>}
      <label>Lời chúc<textarea name="wish" maxLength={1000} rows={4} defaultValue={initial?.wish} placeholder="Gửi một lời chúc nhỏ…" /></label>
      <label className="rsvp-consent"><input type="checkbox" name="consentPublicWish" defaultChecked={initial?.consentPublicWish} /> Cho phép hiển thị lời chúc công khai sau khi được duyệt</label>
      <button disabled={state === "sending"} type="submit">{state === "sending" ? "Đang gửi…" : initial ? "Lưu thay đổi" : "Gửi xác nhận"}</button>
      {message && <p className={`rsvp-message ${state === "error" ? "rsvp-message-error" : ""}`} role={state === "error" ? "alert" : "status"}>{message}</p>}
      {editPath && <a className="rsvp-edit-link" href={editPath}>Lưu link chỉnh sửa phản hồi</a>}
    </form>
  </section>;
}
