"use client";
import { useEffect } from "react";
export function AnalyticsBeacon({eventName,templateId}:{eventName:"template_viewed"|"template_selected";templateId?:string}){useEffect(()=>{void fetch("/api/v1/analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventName,templateId}),keepalive:true})},[eventName,templateId]);return null}
