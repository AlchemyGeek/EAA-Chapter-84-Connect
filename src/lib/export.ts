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

export type ChapterBackup = {
  members: any[];
  chapterData: any[];
  hangarTalkSubscriptions: any[];
  hangarTalkMemberTags: any[];
};

function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function exportChapterBackupToExcel(backup: ChapterBackup) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.members), "Members");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.chapterData), "ChapterData");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.hangarTalkSubscriptions), "HangarTalkSubscriptions");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.hangarTalkMemberTags), "HangarTalkMemberTags");
  XLSX.writeFile(wb, `chapter_backup_${timestamp()}.xlsx`);
}

export function exportChapterBackupToCsv(backup: ChapterBackup) {
  const ts = timestamp();
  const dump = (rows: any[], name: string) => {
    const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
    downloadText(csv, `chapter_backup_${name}_${ts}.csv`, "text/csv");
  };
  dump(backup.members, "members");
  dump(backup.chapterData, "chapter_data");
  dump(backup.hangarTalkSubscriptions, "hangar_talk_subscriptions");
  dump(backup.hangarTalkMemberTags, "hangar_talk_member_tags");
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
