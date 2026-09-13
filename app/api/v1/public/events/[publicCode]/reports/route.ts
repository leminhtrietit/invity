import { z } from "zod";
import { createPublicSupabaseClient } from "@/lib/events/public-event";
import { apiError,apiSuccess } from "@/lib/http/api-response";
import { requestFingerprint } from "@/lib/rsvp/http";

const schema=z.object({reason:z.string().trim().min(3).max(1000)});
export async function POST(request:Request,{params}:{params:Promise<{publicCode:string}>}){const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return apiError(422,"VALIDATION_ERROR","Vui lòng mô tả nội dung cần báo cáo.");const {publicCode}=await params;const {error}=await createPublicSupabaseClient().rpc("submit_abuse_report",{p_public_code:publicCode,p_reason:parsed.data.reason,p_fingerprint_key:requestFingerprint(request)});if(error)return apiError(error.message.includes("RATE_LIMITED")?429:404,error.message.includes("RATE_LIMITED")?"RATE_LIMITED":"NOT_FOUND",error.message.includes("RATE_LIMITED")?"Bạn đã gửi quá nhiều báo cáo. Vui lòng thử lại sau.":"Không thể gửi báo cáo cho thiệp này.");return apiSuccess({accepted:true});}
