import assert from "node:assert/strict";
import test from "node:test";
import { giftAccountInputSchema,publicGiftRequestSchema } from "./schema.ts";
import { createVietQrImageUrl } from "./vietqr.ts";

test("gift account accepts a confirmed Vietnamese bank recipient",()=>{assert.equal(giftAccountInputSchema.parse({position:1,label:"Cô dâu",bankId:"vcb",accountNumber:"0123456789",accountName:"Nguyễn An",confirmed:true}).bankId,"VCB")});
test("public gift input keeps amount optional and enforces limits",()=>{const recipientId="10000000-0000-4000-8000-000000000001";assert.equal(publicGiftRequestSchema.parse({recipientId}).amount,undefined);assert.equal(publicGiftRequestSchema.safeParse({recipientId,amount:999}).success,false);assert.equal(publicGiftRequestSchema.safeParse({recipientId,amount:500_000_001}).success,false);assert.equal(publicGiftRequestSchema.safeParse({recipientId,addInfo:"x".repeat(26)}).success,false)});
test("VietQR adapter pins outbound origin and encodes input",()=>{const url=createVietQrImageUrl({id:"1",label:"A",bankId:"VCB",accountNumber:"0123456789",accountName:"Nguyễn An",last4:"6789"},{amount:250000,addInfo:"Mung cuoi An & Binh"});assert.equal(url.origin,"https://img.vietqr.io");assert.equal(url.pathname,"/image/VCB-0123456789-compact2.png");assert.equal(url.searchParams.get("amount"),"250000");assert.equal(url.searchParams.get("accountName"),"NGUYEN AN")});
