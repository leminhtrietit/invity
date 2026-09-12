import { z } from "zod";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { apiError,apiSuccess,requestId } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema=z.object({planInterest:z.enum(["pro","premium"]),consent:z.literal(true)});
export async function POST(request:Request){if(!(await getCurrentAppUser()))return apiError(401,"UNAUTHENTICATED","Vui lòng đăng nhập Google để giữ chỗ nâng cấp.");const parsed=schema.safeParse(await request.json().catch(()=>null));const id=request.headers.get("Idempotency-Key")??requestId();if(!parsed.success)return apiError(422,"CONSENT_REQUIRED","Bạn cần chọn gói quan tâm và đồng ý nhận thông báo.",id);const {data,error}=await (await createSupabaseServerClient()).rpc("join_upgrade_waitlist",{p_plan_interest:parsed.data.planInterest,p_consent:parsed.data.consent,p_request_id:id});if(error)return apiError(422,"WAITLIST_FAILED","Chưa thể ghi nhận yêu cầu.",id);return apiSuccess(data,id);}
