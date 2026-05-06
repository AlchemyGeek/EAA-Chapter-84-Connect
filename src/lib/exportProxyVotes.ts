import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

interface VoteRow {
  key_id: number;
  member_name: string;
  action: "signed" | "revoked";
  created_at: string;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

export async function exportProxyVoteResults() {
  const { data, error } = await supabase
    .from("proxy_votes_2026")
    .select("key_id, member_name, action, created_at")
    .order("key_id", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  const byMember = new Map<number, VoteRow[]>();
  (data as VoteRow[]).forEach((r) => {
    const arr = byMember.get(r.key_id) ?? [];
    arr.push(r);
    byMember.set(r.key_id, arr);
  });

  const rows = Array.from(byMember.values()).map((events) => {
    const firstSign = events.find((e) => e.action === "signed");
    const lastEvent = events[events.length - 1];
    const lastRevoke = [...events].reverse().find((e) => e.action === "revoked");
    const status = lastEvent.action === "signed" ? "Signed" : "Revoked";
    return {
      "Member Name": lastEvent.member_name,
      "Member ID": lastEvent.key_id,
      "Date Signed": firstSign ? fmtDate(firstSign.created_at) : "",
      "Time Signed": firstSign ? fmtTime(firstSign.created_at) : "",
      Status: status,
      "Date Revoked": status === "Revoked" && lastRevoke ? fmtDate(lastRevoke.created_at) : "",
      "Time Revoked": status === "Revoked" && lastRevoke ? fmtTime(lastRevoke.created_at) : "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Proxy Votes");
  const today = new Date();
  const fname = `EAA84_ProxyVote_Results_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}.xlsx`;
  XLSX.writeFile(wb, fname);
}
