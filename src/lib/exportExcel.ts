import { parseMarkdownTables } from "./markdownTables";

const MAX_SHEET_NAME = 31; // Excel limit

/** Build an .xlsx (one sheet per table) from a reply and download it. Returns false when the reply has no table. */
export async function downloadTablesAsExcel(markdown: string, fileBaseName = "analysis"): Promise<boolean> {
  const tables = parseMarkdownTables(markdown);
  if (tables.length === 0) return false;

  const ExcelJS = (await import("exceljs")).default;   // loaded on click only, keeps the main bundle small
  const wb = new ExcelJS.Workbook();

  tables.forEach((t, i) => {
    const ws = wb.addWorksheet(`Table ${i + 1}`.slice(0, MAX_SHEET_NAME));
    t.rows.forEach(r => ws.addRow(r.map(c => (c !== "" && /^-?\d+(\.\d+)?$/.test(c) && c.length < 16 && !/^0\d/.test(c) ? Number(c) : c))));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.columns.forEach(col => {
      let max = 10;
      col.eachCell?.({ includeEmpty: false }, cell => { max = Math.max(max, Math.min(60, String(cell.value ?? "").length + 2)); });
      col.width = max;
    });
  });

  const blob = new Blob([await wb.xlsx.writeBuffer()], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileBaseName}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
