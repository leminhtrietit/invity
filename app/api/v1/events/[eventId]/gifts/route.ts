import { getCurrentAppUser } from "@/lib/auth/current-user";
import { giftAccountInputSchema,giftDatabaseError } from "@/lib/gifts/schema";
import { apiError,apiSuccess,requestId } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function giftError(message:string,id:string){const code=giftDatabaseError(message);if(code==="RECENT_AUTH_REQUIRED") return apiError(401,code,"Vui lòng đăng nhập lại trước khi sửa tài khoản của thiệp đã xuất bản.",id);if(code==="GIFT_POSITION_OCCUPIED") return apiError(409,code,"Vị trí người nhận này đã được sử dụng.",id);return apiError(code==="NOT_FOUND"?404:422,code??"VALIDATION_ERROR","Không thể lưu tài khoản nhận quà.",id)}

export async function GET(_request:Request,{params}:{params:Promise<{eventId:string}>}){
  if(!(await getCurrentAppUser())) return apiError(401,"UNAUTHENTICATED","Phiên đăng nhập không hợp lệ.");
  const {eventId}=await params;const {data,error}=await (await createSupabaseServerClient()).rpc("list_gift_accounts",{p_event_id:eventId});
  if(error) return apiError(404,"NOT_FOUND","Không tìm thấy sự kiện.");
  return apiSuccess(Array.isArray(data)?data:[]);
}

export async function POST(request:Request,{params}:{params:Promise<{eventId:string}>}){
  if(!(await getCurrentAppUser())) return apiError(401,"UNAUTHENTICATED","Phiên đăng nhập không hợp lệ.");
  const id=request.headers.get("Idempotency-Key")??requestId();const parsed=giftAccountInputSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return apiError(422,"VALIDATION_ERROR","Kiểm tra lại ngân hàng, số tài khoản và xác nhận thông tin.",id);
  const {eventId}=await params;const value=parsed.data;const {data,error}=await (await createSupabaseServerClient()).rpc("upsert_gift_account",{p_event_id:eventId,p_account_id:value.id??null,p_position:value.position,p_label:value.label,p_bank_id:value.bankId,p_account_number:value.accountNumber,p_account_name:value.accountName,p_confirmed:value.confirmed,p_request_id:id});
  if(error) return giftError(error.message,id);return apiSuccess(data,id,{status:value.id?200:201});
}
