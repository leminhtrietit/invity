"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./primitives";

export function DialogDemo({ sheet = false }: { sheet?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return <><Button variant="secondary" onClick={() => dialogRef.current?.showModal()}>{sheet ? "Mở bottom sheet" : "Mở dialog"}</Button><dialog className={sheet ? "ui-dialog ui-sheet" : "ui-dialog"} ref={dialogRef} onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current.close(); }}><div><p className="eyebrow">Xác nhận thao tác</p><h3 className="display">Lưu thay đổi?</h3><p>Nội dung chỉ được đánh dấu đã lưu sau khi server phản hồi thành công.</p><div className="ui-dialog-actions"><Button variant="secondary" onClick={() => dialogRef.current?.close()}>Đóng</Button><Button onClick={() => dialogRef.current?.close()}>Xác nhận</Button></div></div></dialog></>;
}

export function Tabs({ items }: { items: { label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  return <div className="ui-tabs"><div role="tablist" aria-label="Nội dung mẫu">{items.map((item, index) => <button aria-controls={`${id}-panel-${index}`} aria-selected={active === index} id={`${id}-tab-${index}`} key={item.label} onClick={() => setActive(index)} role="tab" tabIndex={active === index ? 0 : -1}>{item.label}</button>)}</div>{items.map((item, index) => <div aria-labelledby={`${id}-tab-${index}`} hidden={active !== index} id={`${id}-panel-${index}`} key={item.label} role="tabpanel">{item.content}</div>)}</div>;
}

export function UploadField() {
  const [filename, setFilename] = useState<string>();
  const id = useId();
  return <div className="ui-upload"><label htmlFor={id}><strong>{filename ?? "Chọn ảnh bìa"}</strong><span>JPG, PNG hoặc WebP · tối đa 10 MB</span></label><input accept="image/jpeg,image/png,image/webp" id={id} onChange={(event) => setFilename(event.target.files?.[0]?.name)} type="file" /></div>;
}
