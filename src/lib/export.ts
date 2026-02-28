import * as XLSX from "xlsx";

export function exportMembersToExcel(members: any[]) {
  const ws = XLSX.utils.json_to_sheet(members);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Members");
  XLSX.writeFile(wb, "roster_members.xlsx");
}

export function exportMembersToCsv(members: any[]) {
  const ws = XLSX.utils.json_to_sheet(members);
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadText(csv, "roster_members.csv", "text/csv");
}

export function exportDiffToExcel(changes: any[]) {
  const rows = formatDiffRows(changes);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Changes");
  XLSX.writeFile(wb, "roster_diff.xlsx");
}

export function exportDiffToCsv(changes: any[]) {
  const rows = formatDiffRows(changes);
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadText(csv, "roster_diff.csv", "text/csv");
}

function formatDiffRows(changes: any[]) {
  return changes.map((c) => ({
    change_type: c.change_type,
    key_id: c.key_id,
    first_name: c.first_name,
    last_name: c.last_name,
    eaa_number: c.eaa_number,
    field_name: c.field_name || "",
    old_value: c.old_value || "",
    new_value: c.new_value || "",
  }));
}

function downloadText(text: string, filename: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
