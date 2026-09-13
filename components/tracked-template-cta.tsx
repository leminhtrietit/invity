"use client";
import Link from "next/link";
export function TrackedTemplateCta({templateId}:{templateId:string}){return <Link className="button button-primary" href={`/login?returnTo=${encodeURIComponent(`/dashboard?templateId=${templateId}`)}`} prefetch={false} onClick={()=>{void fetch("/api/v1/analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventName:"template_selected",templateId}),keepalive:true})}}>Dùng mẫu này</Link>}
