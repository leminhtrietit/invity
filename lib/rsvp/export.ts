import ExcelJS from "exceljs";
import { csvCell,dashboardExportRows,exportHeaders,spreadsheetSafe,type DashboardGuest } from "./dashboard.ts";

export function createRsvpCsv(guests:DashboardGuest[]){return `\uFEFF${[exportHeaders,...dashboardExportRows(guests)].map((row)=>row.map(csvCell).join(",")).join("\r\n")}`;}

export async function createRsvpWorkbook(guests:DashboardGuest[]){
  const workbook=new ExcelJS.Workbook();workbook.creator="Invite";workbook.created=new Date();
  const sheet=workbook.addWorksheet("Danh sách RSVP",{views:[{state:"frozen",ySplit:1}]});
  sheet.addRow(exportHeaders);dashboardExportRows(guests).forEach((row)=>sheet.addRow(row.map((value)=>typeof value==="string"?spreadsheetSafe(value):value)));
  sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,sheet.rowCount),column:exportHeaders.length}};
  sheet.getRow(1).eachCell((cell)=>{cell.font={bold:true,color:{argb:"FFFFFFFF"}};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF713F49"}};cell.alignment={vertical:"middle"};});sheet.getRow(1).height=26;
  [8,24,16,18,18,15,15,19,16,15,15,38,20,18,20,32].forEach((width,index)=>{sheet.getColumn(index+1).width=width;});
  sheet.getColumn(5).numFmt="@";sheet.eachRow((row,index)=>{if(index>1){row.alignment={vertical:"top",wrapText:true};row.height=22;}});
  return workbook.xlsx.writeBuffer();
}
