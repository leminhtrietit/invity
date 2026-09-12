import { z } from "zod";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { apiError,apiSuccess,requestId } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema=z.object({action:z.enum(["template.enabled","report.status","event.lifecycle","user.status","job.retry"]),targetId:z.string().min(1).max(100),value:z.string().max(30)});
export async function POST(request:Request){if(!(await getCurrentAppUser()))return apiError(401,"UNAUTHENTICATED","Phiên đăng nhập không hợp lệ.");const parsed=schema.safeParse(await request.json().catch(()=>null));const id=requestId();if(!parsed.success)return apiError(422,"VALIDATION_ERROR","Thao tác quản trị chưa hợp lệ.",id);const {error}=await (await createSupabaseServerClient()).rpc("admin_action",{p_action:parsed.data.action,p_target_id:parsed.data.targetId,p_value:parsed.data.value,p_request_id:id});if(error)return apiError(error.message.includes("FORBIDDEN")?403:422,error.message.includes("FORBIDDEN")?"FORBIDDEN":"ADMIN_ACTION_FAILED","Bạn không có quyền hoặc thao tác không hợp lệ.",id);return apiSuccess({updated:true},id);}
