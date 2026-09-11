"use client";

import Image from "next/image";
import { useRef,useState } from "react";
import type { PublicGiftOption,PublicGiftRecipient } from "@/lib/gifts/schema";

type Result={recipient:PublicGiftRecipient;amount?:number;addInfo?:string;qrImageUrl:string};

export function GiftSheet({publicCode,options,dialogRef}:{publicCode:string;options:PublicGiftOption[];dialogRef:React.RefObject<HTMLDialogElement|null>}){
  const [recipientId,setRecipientId]=useState(options[0]?.id??"");const [amount,setAmount]=useState("");const [addInfo,setAddInfo]=useState("");const [result,setResult]=useState<Result|null>(null);const [message,setMessage]=useState("");const [loading,setLoading]=useState(false);const formRef=useRef<HTMLFormElement>(null);
  async function generate(event:React.FormEvent){event.preventDefault();setLoading(true);setMessage("");setResult(null);const payload:{recipientId:string;amount?:number;addInfo?:string}={recipientId};if(amount)payload.amount=Number(amount);if(addInfo.trim())payload.addInfo=addInfo.trim();const response=await fetch(`/api/v1/public/events/${publicCode}/gifts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const body=await response.json().catch(()=>null);setLoading(false);if(!response.ok){setMessage(body?.error?.message??"Chưa thể tạo mã QR.");return}setResult(body.data)}
  async function copy(value:string,label:string){try{await navigator.clipboard.writeText(value);setMessage(`Đã sao chép ${label}.`)}catch{setMessage(`Hãy nhấn giữ để sao chép ${label}.`)}}
  const downloadUrl=result?`${result.qrImageUrl}&download=1`:"";
  return <dialog className="gift-sheet" ref={dialogRef} onClose={()=>{setMessage("");setResult(null)}}><div className="gift-sheet-card">
    <div className="gift-sheet-header"><div><p>Quà mừng từ xa</p><h2>Gửi một lời thương</h2></div><button aria-label="Đóng" onClick={()=>dialogRef.current?.close()} type="button">×</button></div>
    <p className="gift-sheet-note">Sự hiện diện của bạn đã là món quà quý. Nếu muốn gửi quà, hãy kiểm tra người nhận trong ứng dụng ngân hàng trước khi xác nhận.</p>
    <form ref={formRef} onSubmit={generate}>
      <fieldset><legend>Chọn người nhận</legend>{options.map((option)=><label className="gift-recipient" key={option.id}><input checked={recipientId===option.id} name="recipient" onChange={()=>{setRecipientId(option.id);setResult(null)}} type="radio"/><span><strong>{option.label}</strong><small>{option.bankId} · •••• {option.last4} · {option.accountName}</small></span></label>)}</fieldset>
      <label><span>Số tiền (không bắt buộc)</span><input inputMode="numeric" min="1000" max="500000000" step="1000" placeholder="Ví dụ: 500.000" value={amount} onChange={(event)=>setAmount(event.target.value.replace(/\D/g,""))}/><small>Từ 1.000 đến 500.000.000 VND</small></label>
      <label><span>Nội dung chuyển khoản (không bắt buộc)</span><input maxLength={25} placeholder="Ví dụ: Mung cuoi An Binh" value={addInfo} onChange={(event)=>setAddInfo(event.target.value)}/><small>{addInfo.length}/25 ký tự</small></label>
      <button className="gift-generate" disabled={loading||!recipientId} type="submit">{loading?"Đang tạo mã…":"Tạo mã VietQR"}</button>
    </form>
    {result&&<section className="gift-result"><div className="gift-qr"><Image alt={`VietQR cho ${result.recipient.label}`} height={540} src={result.qrImageUrl} unoptimized width={540}/></div><div className="gift-details"><p><span>Ngân hàng</span><strong>{result.recipient.bankId}</strong></p><p><span>Chủ tài khoản</span><strong>{result.recipient.accountName}</strong></p><p><span>Số tài khoản</span><strong>{result.recipient.accountNumber}</strong></p></div><div className="gift-result-actions"><button onClick={()=>copy(result.recipient.accountNumber,"số tài khoản")} type="button">Sao chép STK</button>{result.addInfo&&<button onClick={()=>copy(result.addInfo!,"nội dung")} type="button">Sao chép nội dung</button>}<a href={downloadUrl}>Tải mã QR</a></div></section>}
    {message&&<p className="gift-feedback" role="status">{message}</p>}
    <p className="gift-disclaimer">Invite chỉ tạo mã chuyển khoản và không xác nhận giao dịch hay trạng thái đã nhận tiền.</p>
  </div></dialog>;
}
