import { getCurrentAppUser } from "@/lib/auth/current-user";
import { apiError,apiSuccess,requestId } from "@/lib/http/api-response";
import { giftDatabaseError } from "@/lib/gifts/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(_request:Request,{params}:{params:Promise<{eventId:string;giftId:string}>}){
  if(!(await getCurrentAppUser())) return apiError(401,"UNAUTHENTICATED","Phiên đăng nhập không hợp lệ.");
  const id=requestId();const {eventId,giftId}=await params;const {error}=await (await createSupabaseServerClient()).rpc("delete_gift_account",{p_event_id:eventId,p_account_id:giftId,p_request_id:id});
  if(error){const code=giftDatabaseError(error.message);return apiError(code==="RECENT_AUTH_REQUIRED"?401:404,code??"NOT_FOUND",code==="RECENT_AUTH_REQUIRED"?"Vui lòng đăng nhập lại trước khi xóa tài khoản của thiệp đã xuất bản.":"Không tìm thấy tài khoản.",id)}
  return apiSuccess({deleted:true},id);
}
