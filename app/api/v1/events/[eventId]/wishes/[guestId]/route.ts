import { getCurrentAppUser } from "@/lib/auth/current-user";
import { apiError,apiSuccess,requestId } from "@/lib/http/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema=z.object({ target:z.enum(["approved","hidden"]) });
export async function PATCH(request:Request,{params}:{params:Promise<{eventId:string;guestId:string}>}){
  if(!(await getCurrentAppUser())) return apiError(401,"UNAUTHENTICATED","Phiên đăng nhập không hợp lệ.");
  const parsed=schema.safeParse(await request.json().catch(()=>null)); const id=requestId();
  if(!parsed.success) return apiError(422,"VALIDATION_ERROR","Trạng thái duyệt chưa hợp lệ.",id);
  const {eventId,guestId}=await params; const {data,error}=await (await createSupabaseServerClient()).rpc("moderate_wish",{p_event_id:eventId,p_guest_slot_id:guestId,p_target:parsed.data.target,p_request_id:id});
  if(error){const consent=error.message.includes("WISH_CONSENT_REQUIRED");return apiError(consent?409:404,consent?"WISH_CONSENT_REQUIRED":"NOT_FOUND",consent?"Khách chưa đồng ý công khai lời chúc.":"Không tìm thấy lời chúc.",id);}
  return apiSuccess({moderationStatus:data},id);
}
