import type { PublicGiftRecipient } from "./schema.ts";

const VIETQR_IMAGE_ORIGIN="https://img.vietqr.io";
const SAFE_TEMPLATE=/^[a-zA-Z0-9_-]{1,40}$/;

export function vietQrTemplate(){const value=process.env.VIETQR_TEMPLATE_ID?.trim();return value&&SAFE_TEMPLATE.test(value)?value:"compact2";}

export function createVietQrImageUrl(recipient:PublicGiftRecipient,input:{amount?:number;addInfo?:string}){
  const bankId=recipient.bankId.toUpperCase();
  if(!/^[A-Z0-9]{2,12}$/.test(bankId)||!/^\d{6,19}$/.test(recipient.accountNumber)) throw new Error("INVALID_RECIPIENT");
  const url=new URL(`/image/${bankId}-${recipient.accountNumber}-${vietQrTemplate()}.png`,VIETQR_IMAGE_ORIGIN);
  if(input.amount!==undefined) url.searchParams.set("amount",String(input.amount));
  if(input.addInfo) url.searchParams.set("addInfo",input.addInfo);
  url.searchParams.set("accountName",recipient.accountName.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().slice(0,50));
  if(url.origin!==VIETQR_IMAGE_ORIGIN) throw new Error("UNSAFE_PROVIDER_ORIGIN");
  return url;
}
