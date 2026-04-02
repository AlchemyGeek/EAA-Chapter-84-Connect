// Fields to skip when diffing current vs snapshot
const SKIP_DIFF = new Set(["created_at", "updated_at", "last_import_id", "id", "date_updated"]);

export interface LocalChange {
  key_id: number;
  first_name: string;
  last_name: string;
  eaa_number: string;
  change_type: "modified" | "added" | "removed";
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
}

export function diffCurrentVsSnapshots(
  currentMembers: Record<string, any>[],
  snapshots: { key_id: number; snapshot: Record<string, any> }[]
): LocalChange[] {
  const changes: LocalChange[] = [];
  const snapshotMap = new Map<number, Record<string, any>>();
  snapshots.forEach((s) => snapshotMap.set(s.key_id, s.snapshot));

  const currentMap = new Map<number, Record<string, any>>();
  currentMembers.forEach((m) => currentMap.set(m.key_id, m));

  // Check current members against snapshots
  for (const member of currentMembers) {
    const snap = snapshotMap.get(member.key_id);
    if (!snap) {
      // Member exists now but wasn't in last import snapshot — added locally
      // Emit one row per non-empty field so the export includes all details
      let hasFields = false;
      for (const key of Object.keys(member)) {
        if (SKIP_DIFF.has(key)) continue;
        const val = member[key];
        if (val == null || String(val) === "") continue;
        hasFields = true;
        changes.push({
          key_id: member.key_id,
          first_name: member.first_name || "",
          last_name: member.last_name || "",
          eaa_number: member.eaa_number || "",
          change_type: "added",
          field_name: key,
          old_value: null,
          new_value: String(val),
        });
      }
      if (!hasFields) {
        changes.push({
          key_id: member.key_id,
          first_name: member.first_name || "",
          last_name: member.last_name || "",
          eaa_number: member.eaa_number || "",
          change_type: "added",
          field_name: null,
          old_value: null,
          new_value: null,
        });
      }
      continue;
    }

    // Diff fields
    for (const key of Object.keys(member)) {
      if (SKIP_DIFF.has(key)) continue;
      const oldStr = snap[key] == null ? "" : String(snap[key]);
      const newStr = member[key] == null ? "" : String(member[key]);
      if (oldStr !== newStr) {
        changes.push({
          key_id: member.key_id,
          first_name: member.first_name || "",
          last_name: member.last_name || "",
          eaa_number: member.eaa_number || "",
          change_type: "modified",
          field_name: key,
          old_value: oldStr || null,
          new_value: newStr || null,
        });
      }
    }
  }

  // Check for removed members (in snapshot but not in current)
  for (const [keyId, snap] of snapshotMap) {
    if (!currentMap.has(keyId)) {
      changes.push({
        key_id: keyId,
        first_name: snap.first_name || "",
        last_name: snap.last_name || "",
        eaa_number: snap.eaa_number || "",
        change_type: "removed",
        field_name: null,
        old_value: null,
        new_value: null,
      });
    }
  }

  return changes.sort((a, b) => {
    const typeOrder = { added: 0, modified: 1, removed: 2 };
    const diff = (typeOrder[a.change_type] ?? 1) - (typeOrder[b.change_type] ?? 1);
    if (diff !== 0) return diff;
    return (a.last_name || "").localeCompare(b.last_name || "");
  });
}
