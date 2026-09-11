import { createPublicSupabaseClient } from "@/lib/events/public-event";
import { publicGiftRequestSchema,type PublicGiftRecipient } from "@/lib/gifts/schema";
import { createVietQrImageUrl } from "@/lib/gifts/vietqr";
import { apiError } from "@/lib/http/api-response";

export async function GET(request:Request,{params}:{params:Promise<{publicCode:string}>}){
  const search=new URL(request.url).searchParams;const rawAmount=search.get("amount");
  const parsed=publicGiftRequestSchema.safeParse({recipientId:search.get("recipientId"),amount:rawAmount?Number(rawAmount):undefined,addInfo:search.get("addInfo")||undefined});
  if(!parsed.success) return apiError(422,"VALIDATION_ERROR","Yêu cầu tạo QR chưa hợp lệ.");
  const {publicCode}=await params;const {data,error}=await createPublicSupabaseClient().rpc("resolve_public_gift_recipient",{p_public_code:publicCode,p_account_id:parsed.data.recipientId});
  if(error||!data) return apiError(404,"NOT_FOUND","Người nhận không tồn tại trong thiệp này.");
  try{
    const upstream=await fetch(createVietQrImageUrl(data as unknown as PublicGiftRecipient,parsed.data),{signal:AbortSignal.timeout(7000),cache:"no-store"});
    if(!upstream.ok||!upstream.body||!upstream.headers.get("content-type")?.startsWith("image/")) throw new Error("PROVIDER_ERROR");
    return new Response(upstream.body,{status:200,headers:{"Content-Type":upstream.headers.get("content-type")!,"Cache-Control":"private, no-store","Content-Disposition":search.get("download")==="1"?'attachment; filename="vietqr.png"':'inline'}});
  }catch{return apiError(502,"VIETQR_UNAVAILABLE","Chưa thể tải mã QR. Bạn vẫn có thể sao chép thông tin chuyển khoản.");}
}
