"use client";

import { useEffect, useRef, useState } from "react";
import { InvitationRenderer } from "@/components/invitation/invitation-renderer";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { InvitationContent } from "@/lib/invitation/schema";
import { getTemplate, templateCatalog } from "@/lib/templates/catalog";

type SaveState = "saved" | "dirty" | "saving" | "offline" | "error" | "conflict";

const labels: Record<SaveState, string> = { saved: "Đã lưu", dirty: "Chưa lưu", saving: "Đang lưu…", offline: "Ngoại tuyến · chưa lưu", error: "Lưu thất bại · sẽ thử lại", conflict: "Có thay đổi ở cửa sổ khác" };

function localDateTime(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

async function optimizeImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2500 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("CANVAS_UNAVAILABLE"); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("IMAGE_ENCODE_FAILED")), "image/webp", .82));
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: blob.type || "image/webp" });
}

export function EventEditor({ eventId, initialContent, initialRevision, initialTemplateId, initiallyPersisted }: { eventId: string; initialContent: InvitationContent; initialRevision: number; initialTemplateId: string; initiallyPersisted: boolean }) {
  const [content, setContent] = useState(initialContent);
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [saveState, setSaveState] = useState<SaveState>(initiallyPersisted ? "saved" : "dirty");
  const [mobilePane, setMobilePane] = useState<"edit" | "preview">("edit");
  const [retry, setRetry] = useState(0);
  const [uploadState, setUploadState] = useState<string>();
  const revisionRef = useRef(initialRevision);
  const firstRender = useRef(initiallyPersisted);
  const templateTheme = getTemplate(templateId)?.theme ?? templateCatalog[0].theme;
  const theme = { ...templateTheme, ...content.appearance };
  const hasConflict = saveState === "conflict";

  function update(updater: (current: InvitationContent) => InvitationContent) {
    setContent((current) => updater(current));
    setSaveState(navigator.onLine ? "dirty" : "offline");
  }

  useEffect(() => {
    const onOnline = () => { setSaveState("dirty"); setRetry((value) => value + 1); };
    const onOffline = () => setSaveState("offline");
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (!navigator.onLine || hasConflict) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/v1/events/${eventId}/draft`, { method: "PATCH", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ revision: revisionRef.current, content }), signal: controller.signal });
        const payload = await response.json();
        if (response.status === 409) { setSaveState("conflict"); return; }
        if (!response.ok) throw new Error("save failed");
        revisionRef.current = payload.data.revision;
        setSaveState("saved");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSaveState(navigator.onLine ? "error" : "offline");
      }
    }, 1000);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [content, eventId, retry, hasConflict]);

  async function switchTemplate(nextTemplateId: string) {
    const response = await fetch(`/api/v1/events/${eventId}/template`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: nextTemplateId, revision: revisionRef.current }) });
    const payload = await response.json();
    if (response.status === 409) { setSaveState("conflict"); return; }
    if (!response.ok) { setSaveState("error"); return; }
    revisionRef.current = payload.data.revision;
    setTemplateId(nextTemplateId);
    setSaveState("saved");
  }

  async function upload(file: File, kind: "cover" | "album" | "audio") {
    setUploadState("Đang chuẩn bị tải lên…");
    let uploadFile = file;
    if (kind !== "audio") {
      try { uploadFile = await optimizeImage(file); }
      catch { setUploadState("Trình duyệt không thể đọc ảnh này. Hãy chọn JPG, PNG hoặc WebP khác."); return; }
    }
    const response = await fetch(`/api/v1/events/${eventId}/media/uploads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: uploadFile.name, byteSize: uploadFile.size, mimeType: uploadFile.type, kind }) });
    const payload = await response.json();
    if (!response.ok) { setUploadState(payload.error?.message ?? "Không thể tải tệp."); return; }
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.storage.from("event-media").uploadToSignedUrl(payload.data.path, payload.data.token, uploadFile, { contentType: uploadFile.type });
    if (error) { setUploadState("Tải lên thất bại. Hãy chọn lại tệp."); return; }
    const completed = await fetch(`/api/v1/events/${eventId}/media/uploads/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: uploadFile.name, byteSize: uploadFile.size, mimeType: uploadFile.type, kind, path: payload.data.path }),
    });
    const completedPayload = await completed.json();
    if (!completed.ok) { setUploadState(completedPayload.error?.message ?? "Không thể xác nhận tệp tải lên."); return; }
    setUploadState("Đã tải lên · đang tối ưu media");
    await supabase.functions.invoke("media-worker");
    const mediaAssetId = completedPayload.data.mediaAssetId as string;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const statusResponse = await fetch(`/api/v1/media/${mediaAssetId}`, { cache: "no-store" });
      const statusPayload = await statusResponse.json();
      if (statusPayload.data?.status === "ready") {
        const src = statusPayload.data.contentUrl as string;
        if (kind === "cover") update((current) => ({ ...current, cover: { src, alt: uploadFile.name, mediaAssetId, focalX: 50, focalY: 50 } }));
        if (kind === "album") update((current) => ({ ...current, album: [...current.album, { src, alt: uploadFile.name, mediaAssetId, focalX: 50, focalY: 50 }].slice(0, 12) }));
        if (kind === "audio") update((current) => ({ ...current, music: { src, title: uploadFile.name, mediaAssetId } }));
        setUploadState("Media đã tối ưu và sẵn sàng.");
        return;
      }
      if (statusPayload.data?.status === "failed") { setUploadState("Xử lý media thất bại. Hãy thử tệp khác."); return; }
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }
    setUploadState("Media vẫn đang xử lý. Bạn có thể tiếp tục chỉnh nội dung.");
  }

  return <div className="editor-shell">
    <aside className="editor-sidebar"><a className="display editor-logo" href="/dashboard">Invite</a><p className="eyebrow">Trình soạn thiệp</p>{["Nội dung", "Hình ảnh", "Giao diện", "Cài đặt"].map((item, index) => <button className={index === 0 ? "active" : ""} key={item} type="button"><span>0{index + 1}</span>{item}</button>)}</aside>
    <main className={`editor-form ${mobilePane === "preview" ? "mobile-hidden" : ""}`}>
      <header className="editor-header"><div><p className="eyebrow">Bản nháp</p><h1 className="display">Kể câu chuyện của bạn</h1></div><span className={`save-state save-state-${saveState}`}>{labels[saveState]}</span></header>
      {saveState === "conflict" && <div className="editor-conflict" role="alert"><strong>Bản nháp đã thay đổi ở nơi khác.</strong><span>Tải lại để lấy phiên bản mới; nội dung đang nhập vẫn còn trên màn hình này.</span><button onClick={() => location.reload()} type="button">Tải phiên bản mới</button></div>}
      <section className="editor-group"><div className="editor-group-title"><span>01</span><div><h2>Thông tin chính</h2><p>Tên và thời gian xuất hiện đầu tiên trên thiệp.</p></div></div>
        <label className="ui-field"><span>Tên sự kiện</span><input maxLength={120} value={content.title} onChange={(event) => update((current) => ({ ...current, title: event.target.value }))} /></label>
        <div className="editor-two-col">{content.hosts.slice(0, 2).map((host, index) => <label className="ui-field" key={index}><span>{index === 0 ? "Tên người thứ nhất" : "Tên người thứ hai"}</span><input maxLength={80} value={host.name} onChange={(event) => update((current) => ({ ...current, hosts: current.hosts.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} /></label>)}</div>
        <label className="ui-field"><span>Thời gian bắt đầu</span><input type="datetime-local" value={localDateTime(content.startsAt)} onChange={(event) => { if (event.target.value) update((current) => ({ ...current, startsAt: new Date(event.target.value).toISOString() })); }} /></label>
      </section>
      <section className="editor-group"><div className="editor-group-title"><span>02</span><div><h2>Địa điểm</h2><p>Khách có thể mở chỉ đường bằng Google Maps.</p></div></div>
        <label className="ui-field"><span>Tên địa điểm</span><input value={content.venue.name} onChange={(event) => update((current) => ({ ...current, venue: { ...current.venue, name: event.target.value } }))} /></label>
        <label className="ui-field"><span>Địa chỉ</span><input value={content.venue.address} onChange={(event) => update((current) => ({ ...current, venue: { ...current.venue, address: event.target.value } }))} /></label>
        <label className="ui-field"><span>Link Google Maps</span><input type="url" value={content.venue.mapUrl} onChange={(event) => update((current) => ({ ...current, venue: { ...current.venue, mapUrl: event.target.value } }))} /></label>
      </section>
      <section className="editor-group"><div className="editor-group-title"><span>03</span><div><h2>Câu chuyện</h2><p>Một đoạn ngắn tạo cảm xúc cho lời mời.</p></div></div>
        <label className="ui-field"><span>Nội dung</span><textarea rows={6} value={content.story?.body ?? ""} onChange={(event) => update((current) => ({ ...current, story: { eyebrow: current.story?.eyebrow ?? "Câu chuyện", heading: current.story?.heading ?? "Ngày mình về chung một nhà", body: event.target.value } }))} /></label>
      </section>
      <section className="editor-group"><div className="editor-group-title"><span>04</span><div><h2>Lịch trình</h2><p>Tối đa 8 mốc, hiển thị theo đúng thứ tự bên dưới.</p></div></div>
        {content.schedule.map((item, index) => <div className="editor-schedule-row" key={`${index}-${item.time}`}>
          <label className="ui-field"><span>Giờ</span><input type="time" value={item.time} onChange={(event) => update((current) => ({ ...current, schedule: current.schedule.map((entry, itemIndex) => itemIndex === index ? { ...entry, time: event.target.value } : entry) }))} /></label>
          <label className="ui-field"><span>Hoạt động</span><input maxLength={100} value={item.title} onChange={(event) => update((current) => ({ ...current, schedule: current.schedule.map((entry, itemIndex) => itemIndex === index ? { ...entry, title: event.target.value } : entry) }))} /></label>
          <button aria-label={`Xóa mốc ${index + 1}`} className="editor-remove" onClick={() => update((current) => ({ ...current, schedule: current.schedule.filter((_, itemIndex) => itemIndex !== index) }))} type="button">×</button>
        </div>)}
        <button className="button button-secondary" disabled={content.schedule.length >= 8} onClick={() => update((current) => ({ ...current, schedule: [...current.schedule, { time: "18:00", title: "Đón khách" }] }))} type="button">+ Thêm mốc</button>
      </section>
      <section className="editor-group"><div className="editor-group-title"><span>05</span><div><h2>Ảnh và nhạc</h2><p>Tệp được tải vào vùng riêng của sự kiện và xử lý nền.</p></div></div>
        <label className="editor-upload"><strong>Thay ảnh bìa</strong><span>JPG, PNG, WebP · tối đa 10 MB</span><input accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, "cover"); }} type="file" /></label>
        <label className="editor-upload"><strong>Thêm ảnh album</strong><span>Chọn tối đa 12 ảnh · mỗi ảnh tối đa 10 MB</span><input accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { Array.from(event.target.files ?? []).slice(0, 12).forEach((file) => void upload(file, "album")); }} type="file" /></label>
        <label className="editor-upload"><strong>Tải nhạc nền</strong><span>MP3, M4A · tối đa 15 MB</span><input accept="audio/mpeg,audio/mp4" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, "audio"); }} type="file" /></label>
        {content.cover && <div className="editor-two-col"><label className="ui-field"><span>Tiêu điểm ngang · {content.cover.focalX ?? 50}%</span><input min="0" max="100" type="range" value={content.cover.focalX ?? 50} onChange={(event) => update((current) => ({ ...current, cover: current.cover ? { ...current.cover, focalX: Number(event.target.value) } : undefined }))} /></label><label className="ui-field"><span>Tiêu điểm dọc · {content.cover.focalY ?? 50}%</span><input min="0" max="100" type="range" value={content.cover.focalY ?? 50} onChange={(event) => update((current) => ({ ...current, cover: current.cover ? { ...current.cover, focalY: Number(event.target.value) } : undefined }))} /></label></div>}
        {content.album.map((image, index) => <div className="editor-media-row" key={image.mediaAssetId ?? image.src}><span>{index + 1}. {image.alt}</span><div><button disabled={index === 0} onClick={() => update((current) => { const album = [...current.album]; [album[index - 1], album[index]] = [album[index], album[index - 1]]; return { ...current, album }; })} type="button">↑</button><button disabled={index === content.album.length - 1} onClick={() => update((current) => { const album = [...current.album]; [album[index], album[index + 1]] = [album[index + 1], album[index]]; return { ...current, album }; })} type="button">↓</button><button onClick={() => update((current) => ({ ...current, album: current.album.filter((_, itemIndex) => itemIndex !== index) }))} type="button">Xóa</button></div></div>)}
        {content.music && <div className="editor-audio"><span>{content.music.title}</span><audio controls preload="none" src={content.music.src}>Trình duyệt không hỗ trợ nghe thử.</audio></div>}
        {uploadState && <p className="upload-status" role="status">{uploadState}</p>}
      </section>
      <section className="editor-group"><div className="editor-group-title"><span>06</span><div><h2>Phản hồi và quà mừng</h2><p>Thiết lập RSVP trước khi xuất bản.</p></div></div>
        <div className="section-toggles"><label><input checked={content.rsvp.enabled} onChange={(event) => update((current) => ({ ...current, rsvp: { ...current.rsvp, enabled: event.target.checked }, sections: { ...current.sections, rsvp: event.target.checked } }))} type="checkbox" /><span>Bật RSVP</span></label><label><input checked={content.gift.enabled} onChange={(event) => update((current) => ({ ...current, gift: { ...current.gift, enabled: event.target.checked }, sections: { ...current.sections, gift: event.target.checked } }))} type="checkbox" /><span>Bật quà mừng</span></label></div>
        <label className="ui-field"><span>Số người đi kèm tối đa</span><input max="10" min="0" type="number" value={content.rsvp.maxCompanions} onChange={(event) => update((current) => ({ ...current, rsvp: { ...current.rsvp, maxCompanions: Math.min(10, Math.max(0, Number(event.target.value))) } }))} /></label>
        <label className="ui-field"><span>Lời nhắn quà mừng</span><textarea maxLength={280} rows={3} value={content.gift.message} onChange={(event) => update((current) => ({ ...current, gift: { ...current.gift, message: event.target.value } }))} /></label>
      </section>
      <section className="editor-group"><div className="editor-group-title"><span>07</span><div><h2>Mẫu và giao diện</h2><p>Đổi mẫu, font và màu nhấn mà vẫn giữ nguyên nội dung.</p></div></div>
        <label className="ui-field"><span>Mẫu thiệp</span><select disabled={saveState === "saving" || saveState === "conflict"} value={templateId} onChange={(event) => void switchTemplate(event.target.value)}>{templateCatalog.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
        <div className="editor-two-col"><label className="ui-field"><span>Font tiêu đề</span><select value={content.appearance?.displayFont ?? templateTheme.displayFont} onChange={(event) => update((current) => ({ ...current, appearance: { ...current.appearance, displayFont: event.target.value as "editorial" | "romantic" | "modern" } }))}><option value="editorial">Editorial</option><option value="romantic">Lãng mạn</option><option value="modern">Hiện đại</option></select></label><label className="ui-field"><span>Màu nhấn</span><input type="color" value={content.appearance?.accent ?? templateTheme.accent} onChange={(event) => update((current) => ({ ...current, appearance: { ...current.appearance, accent: event.target.value } }))} /></label></div>
        <div className="section-toggles">{Object.entries(content.sections).map(([key, enabled]) => <label key={key}><input checked={enabled} onChange={(event) => update((current) => ({ ...current, sections: { ...current.sections, [key]: event.target.checked } }))} type="checkbox" /><span>{key}</span></label>)}</div>
      </section>
    </main>
    <aside className={`editor-preview ${mobilePane === "edit" ? "mobile-hidden" : ""}`}><div className="editor-phone"><InvitationRenderer content={content} theme={theme} mode="preview" /></div></aside>
    <nav className="editor-mobile-nav" aria-label="Chế độ soạn thiệp"><button aria-pressed={mobilePane === "edit"} onClick={() => setMobilePane("edit")} type="button">Sửa</button><button aria-pressed={mobilePane === "preview"} onClick={() => setMobilePane("preview")} type="button">Xem thử</button><button className="editor-mobile-cta" disabled={saveState !== "saved"} type="button">Tiếp tục</button></nav>
  </div>;
}
