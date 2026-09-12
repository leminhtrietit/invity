"use client";

import { useState } from "react";

type Row = { id: string; name?: string; email?: string; displayName?: string; status?: string; lifecycle?: string; kind?: string; reason?: string; enabled?: boolean; publicCode?: string };
type Data = {
  counts: Record<string, number>;
  templates: Row[];
  reports: Row[];
  jobs: Row[];
  users: Row[];
  events: Row[];
  funnel: Record<string, number>;
};

export function AdminDashboard({ initial: data }: { initial: Data }) {
  const [message, setMessage] = useState("");

  async function action(actionName: string, targetId: string, value: string) {
    setMessage("");
    const response = await fetch("/api/v1/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName, targetId, value }),
    });
    if (!response.ok) { setMessage("Thao tác thất bại hoặc quyền đã thay đổi."); return; }
    location.reload();
  }

  return <main className="shell admin-page">
    <div><p className="eyebrow">Vận hành</p><h1 className="display">Admin tối thiểu</h1><p>Mọi thao tác được kiểm tra role tại database và ghi audit.</p></div>
    <section className="admin-summary">{Object.entries(data.counts).map(([key, value]) => <article key={key}><span>{key}</span><strong>{value}</strong></article>)}</section>
    {message && <p className="admin-message" role="alert">{message}</p>}
    <AdminList title="Mẫu cho sự kiện mới" rows={data.templates} render={(item) => <><div><strong>{item.name}</strong><small>{item.id}</small></div><button onClick={() => action("template.enabled", item.id, String(!item.enabled))}>{item.enabled ? "Tạm ngừng" : "Bật lại"}</button></>} />
    <AdminList title="Sự kiện gần đây" rows={data.events} render={(item) => <><div><strong>{item.publicCode}</strong><small>{item.lifecycle}</small></div>{item.lifecycle === "published" && <button onClick={() => action("event.lifecycle", item.id, "hidden")}>Ẩn thiệp</button>}</>} />
    <AdminList title="Báo cáo" rows={data.reports} render={(item) => <><div><strong>{item.reason}</strong><small>{item.status}</small></div><button onClick={() => action("report.status", item.id, "resolved")}>Đã xử lý</button></>} />
    <AdminList title="Job gần đây" rows={data.jobs} render={(item) => <><div><strong>{item.kind}</strong><small>{item.status}</small></div>{item.status === "failed" && <button onClick={() => action("job.retry", item.id, "queued")}>Thử lại</button>}</>} />
    <AdminList title="Tài khoản gần đây" rows={data.users} render={(item) => <><div><strong>{item.displayName}</strong><small>{item.email} · {item.status}</small></div><button onClick={() => action("user.status", item.id, item.status === "suspended" ? "active" : "suspended")}>{item.status === "suspended" ? "Mở khóa" : "Khóa"}</button></>} />
    <section className="admin-panel"><h2 className="display">Funnel 30 ngày</h2><div className="admin-funnel">{Object.entries(data.funnel).map(([name, total]) => <p key={name}><span>{name}</span><strong>{total}</strong></p>)}</div></section>
  </main>;
}

function AdminList({ title, rows, render }: { title: string; rows: Row[]; render: (row: Row) => React.ReactNode }) {
  return <section className="admin-panel"><h2 className="display">{title}</h2>{rows.length ? rows.map((row) => <article key={row.id}>{render(row)}</article>) : <p>Không có dữ liệu.</p>}</section>;
}
