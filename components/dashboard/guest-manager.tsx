"use client";

import { FormEvent, useState } from "react";

type Guest = { id: string; allocation_number: number; allocation_source: string; display_name: string; salutation: string | null; guest_group: string | null; sent_at: string | null; revoked_at: string | null; rsvps: { response: string; companion_count: number } | { response: string; companion_count: number }[] | null };

export function GuestManager({ eventId, publicCode, initialGuests, initialUsed }: { eventId: string; publicCode: string; initialGuests: Guest[]; initialUsed: number }) {
  const [guests, setGuests] = useState(initialGuests); const [used, setUsed] = useState(initialUsed);
  const [newLink, setNewLink] = useState<string>(); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);

  async function createGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/events/${eventId}/guests`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ displayName: form.get("displayName"), salutation: form.get("salutation"), guestGroup: form.get("guestGroup"), ownerNote: form.get("ownerNote") }) });
    const payload = await response.json(); setBusy(false);
    if (!response.ok) { setMessage(payload.error?.message ?? "Không thể tạo khách."); return; }
    const absolute = `${window.location.origin}${payload.data.invitationPath}`; setNewLink(absolute); setUsed((value) => value + (payload.data.replayed ? 0 : 1));
    setGuests((current) => [...current, { id: payload.data.guestSlotId, allocation_number: payload.data.allocationNumber, allocation_source: "personalized", display_name: form.get("displayName")!.toString(), salutation: form.get("salutation")?.toString() || null, guest_group: form.get("guestGroup")?.toString() || null, sent_at: null, revoked_at: null, rsvps: null }]);
    event.currentTarget.reset();
  }
  async function rotate(guestId: string) {
    const response = await fetch(`/api/v1/events/${eventId}/guests/${guestId}/rotate`, { method: "POST" }); const payload = await response.json();
    if (response.ok) setNewLink(`${window.location.origin}${payload.data.invitationPath}`); else setMessage(payload.error?.message ?? "Không thể đổi link.");
  }
  async function setState(guestId: string, target: "sent" | "revoked") {
    const response = await fetch(`/api/v1/events/${eventId}/guests/${guestId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target }) });
    if (response.ok) setGuests((current) => current.map((guest) => guest.id === guestId ? { ...guest, sent_at: target === "sent" ? new Date().toISOString() : guest.sent_at, revoked_at: target === "revoked" ? new Date().toISOString() : guest.revoked_at } : guest));
  }
  async function copy(value: string) { await navigator.clipboard.writeText(value); setMessage("Đã sao chép link. Lượt gửi chỉ được đánh dấu khi bạn chọn “Đã gửi”."); }

  return <main className="shell guest-page">
    <div className="guest-heading"><div><p className="eyebrow">Khách mời</p><h1 className="display">Danh sách riêng của bạn</h1></div><a className="button button-secondary" href={`/e/${publicCode}`} target="_blank">Mở link chung ↗</a></div>
    <section className="guest-quota"><div><strong>{used}</strong><span>/ 50 suất đã cấp</span></div><div className="guest-quota-track"><i style={{ width: `${used * 2}%` }} /></div><p>Thu hồi khách không hoàn lại suất. Người đã có link vẫn có thể sửa RSVP khi đủ 50 suất.</p></section>
    <section className="guest-create"><div><p className="eyebrow">Link cá nhân hóa</p><h2 className="display">Thêm một vị khách</h2><p>Tên khách sẽ xuất hiện ngay trên phong bì.</p></div><form onSubmit={createGuest}><div className="rsvp-grid"><label>Tên khách<input name="displayName" required minLength={2} maxLength={100} /></label><label>Cách xưng hô<input name="salutation" maxLength={40} placeholder="Bạn thân, Anh chị…" /></label></div><label>Nhóm khách<input name="guestGroup" maxLength={80} placeholder="Gia đình, đồng nghiệp…" /></label><label>Ghi chú riêng<textarea name="ownerNote" maxLength={1000} rows={2} /></label><button className="button button-primary" disabled={busy || used >= 50}>{busy ? "Đang tạo…" : used >= 50 ? "Đã đủ 50 suất" : "Tạo link cá nhân"}</button></form></section>
    {newLink && <section className="guest-new-link"><div><strong>Link mới chỉ hiển thị trong phiên này</strong><p>{newLink}</p></div><button onClick={() => copy(newLink)} type="button">Sao chép</button></section>}
    {message && <p className="guest-message" role="status">{message}</p>}
    <section className="guest-list"><div className="dashboard-section-heading"><h2 className="display">{guests.length} khách đã cấp suất</h2></div>{guests.length === 0 ? <p className="guest-empty">Chưa có khách nào. Bạn có thể dùng link chung hoặc tạo link riêng ở trên.</p> : <div className="guest-table">{guests.map((guest) => { const rsvp = Array.isArray(guest.rsvps) ? guest.rsvps[0] : guest.rsvps; return <article key={guest.id}><div><span>#{guest.allocation_number} · {guest.allocation_source === "personalized" ? "Link riêng" : "Link chung"}</span><h3>{guest.display_name}</h3><p>{guest.guest_group || "Chưa phân nhóm"}</p></div><div className="guest-status"><strong>{rsvp?.response === "attending" ? `Tham dự${rsvp.companion_count ? ` +${rsvp.companion_count}` : ""}` : rsvp?.response === "declined" ? "Từ chối" : guest.sent_at ? "Đã gửi" : "Chưa gửi"}</strong>{guest.revoked_at && <small>Đã thu hồi</small>}</div>{guest.allocation_source === "personalized" && !guest.revoked_at && <div className="guest-actions"><button onClick={() => rotate(guest.id)} type="button">Tạo link mới</button>{!guest.sent_at && <button onClick={() => setState(guest.id,"sent")} type="button">Đánh dấu đã gửi</button>}<button className="danger" onClick={() => setState(guest.id,"revoked")} type="button">Thu hồi</button></div>}</article>; })}</div>}</section>
  </main>;
}
