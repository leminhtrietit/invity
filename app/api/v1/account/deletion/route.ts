import { z } from "zod";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { apiError,apiSuccess,requestId } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema=z.object({confirmation:z.literal("XOA TAI KHOAN")});
export async function POST(request:Request){if(!(await getCurrentAppUser()))return apiError(401,"UNAUTHENTICATED","Phiên đăng nhập không hợp lệ.");const parsed=schema.safeParse(await request.json().catch(()=>null));const id=requestId();if(!parsed.success)return apiError(422,"CONFIRMATION_REQUIRED","Nhập đúng XOA TAI KHOAN để tiếp tục.",id);const supabase=await createSupabaseServerClient();const {error}=await supabase.rpc("request_account_deletion",{p_confirmation:parsed.data.confirmation,p_request_id:id});if(error)return apiError(422,"DELETION_FAILED","Chưa thể gửi yêu cầu xóa tài khoản.",id);await supabase.auth.signOut({scope:"global"});return apiSuccess({deleted:true},id);}
