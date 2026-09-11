import assert from "node:assert/strict";
import { describe,it } from "node:test";
import { csvCell,filterDashboardGuests,parseDashboardFilters,spreadsheetSafe,summarizeDashboard,type DashboardGuest } from "./dashboard.ts";

function guest(index:number):DashboardGuest { const attending=index<=25; const declined=index>25&&index<=30; return { id:String(index),allocationNumber:index,source:index%2?"personalized":"shared_rsvp",displayName:`Khách ${index}`,salutation:"",phone:`09000000${String(index).padStart(2,"0")}`,group:index%2?"Gia đình":"Bạn bè",ownerNote:"",sentAt:index<=32?new Date().toISOString():null,revokedAt:index===40?new Date().toISOString():null,createdAt:new Date().toISOString(),response:attending?"attending":declined?"declined":"pending",companionCount:attending&&index<=18?1:0,rsvpUpdatedAt:null,wish:"",consentPublicWish:false,moderationStatus:"" }; }
const fixtures=Array.from({length:40},(_,index)=>guest(index+1));

describe("G7 dashboard data",()=>{
  it("keeps allocated quota separate and computes expected attendance",()=>{const summary=summarizeDashboard(fixtures,40);assert.equal(summary.allocated,40);assert.equal(summary.managed,39);assert.equal(summary.attending,25);assert.equal(summary.declined,5);assert.equal(summary.companions,18);assert.equal(summary.expected,43);});
  it("applies search, group, response and delivery filters together",()=>{const filters=parseDashboardFilters({q:"Khách 2",group:"Bạn bè",response:"attending",delivery:"sent"});assert.deepEqual(filterDashboardGuests(fixtures,filters).map((item)=>item.id),["2","20","22","24"]);});
  it("neutralizes spreadsheet formulas in CSV and XLSX values",()=>{for(const value of ["=1+1","+cmd","-2+3","@SUM(A1)"]){assert.equal(spreadsheetSafe(value).startsWith("'"),true);assert.equal(csvCell(value).startsWith('"\''),true);}assert.equal(spreadsheetSafe("Nguyễn An"),"Nguyễn An");});
});
