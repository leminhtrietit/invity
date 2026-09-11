import { publicGiftRequestSchema,type PublicGiftRecipient } from "@/lib/gifts/schema";
import { apiError,apiSuccess } from "@/lib/http/api-response";
import { createPublicSupabaseClient } from "@/lib/events/public-event";

export async function POST(request:Request,{params}:{params:Promise<{publicCode:string}>}){
  const parsed=publicGiftRequestSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return apiError(422,"VALIDATION_ERROR","Số tiền hoặc nội dung chuyển khoản chưa hợp lệ.");
  const {publicCode}=await params;const {data,error}=await createPublicSupabaseClient().rpc("resolve_public_gift_recipient",{p_public_code:publicCode,p_account_id:parsed.data.recipientId});
  if(error||!data) return apiError(404,"NOT_FOUND","Người nhận không tồn tại trong thiệp này.");
  const recipient=data as unknown as PublicGiftRecipient;
  const query=new URLSearchParams({recipientId:recipient.id});if(parsed.data.amount!==undefined) query.set("amount",String(parsed.data.amount));if(parsed.data.addInfo) query.set("addInfo",parsed.data.addInfo);
  return apiSuccess({recipient,amount:parsed.data.amount,addInfo:parsed.data.addInfo,qrImageUrl:`/api/v1/public/events/${publicCode}/gifts/image?${query}`});
}
