import { z } from "zod";

export const giftAccountInputSchema = z.object({
  id: z.uuid().nullable().optional(),
  position: z.number().int().min(1).max(2),
  label: z.string().trim().min(1).max(80),
  bankId: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,12}$/),
  accountNumber: z.string().trim().regex(/^\d{6,19}$/),
  accountName: z.string().trim().min(2).max(120),
  confirmed: z.literal(true),
});

export const publicGiftRequestSchema = z.object({
  recipientId: z.uuid(),
  amount: z.number().int().min(1_000).max(500_000_000).optional(),
  addInfo: z.string().trim().min(1).max(25).regex(/^[^\u0000-\u001f\u007f]*$/).optional(),
});

export type GiftAccount = { id:string; label:string; bankId:string; accountNumber:string; accountName:string; position:number; enabled:boolean; confirmedAt:string|null; updatedAt:string };
export type PublicGiftOption = Pick<GiftAccount,"id"|"label"|"bankId"|"accountName"> & { last4:string };
export type PublicGiftRecipient = PublicGiftOption & { accountNumber:string };

export function giftDatabaseError(message:string) {
  return ["RECENT_AUTH_REQUIRED","GIFT_POSITION_OCCUPIED","NOT_FOUND","VALIDATION_ERROR"].find((code)=>message.includes(code));
}
