import assert from "node:assert/strict";
import {it} from "node:test";
import ExcelJS from "exceljs";
import {createRsvpCsv,createRsvpWorkbook} from "./export.ts";
import type {DashboardGuest} from "./dashboard.ts";

const guest:DashboardGuest={id:"1",allocationNumber:1,source:"shared_rsvp",displayName:"Nguyễn Ánh",salutation:"Bạn",phone:"0912345678",group:"Bạn bè",ownerNote:"=HYPERLINK(\"bad\")",sentAt:"2026-09-11T10:00:00Z",revokedAt:null,createdAt:"2026-09-11T10:00:00Z",response:"attending",companionCount:2,rsvpUpdatedAt:"2026-09-11T10:00:00Z",wish:"Trăm năm hạnh phúc",consentPublicWish:true,moderationStatus:"approved"};

it("creates a safe UTF-8 CSV",()=>{const csv=createRsvpCsv([guest]);assert.equal(csv.charCodeAt(0),0xfeff);assert.match(csv,/Nguyễn Ánh/);assert.match(csv,/'=HYPERLINK/);});
it("creates a readable formatted XLSX with phone stored as text",async()=>{const bytes=await createRsvpWorkbook([guest]);const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes);const sheet=workbook.getWorksheet("Danh sách RSVP")!;assert.equal(sheet.getCell("E2").value,"0912345678");assert.equal(sheet.getColumn(5).numFmt,"@");assert.equal(sheet.views[0]?.state,"frozen");assert.ok(sheet.autoFilter);assert.equal(sheet.getCell("P2").value,"'=HYPERLINK(\"bad\")");});
