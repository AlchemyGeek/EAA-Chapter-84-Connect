import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, RefreshCw, Minus, ChevronDown, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export interface DiffChange {
  id?: string;
  key_id: number;
  first_name: string | null;
  last_name: string | null;
  eaa_number: string | null;
  change_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
}

interface GroupedRecord {
  key_id: number;
  first_name: string;
  last_name: string;
  eaa_number: string;
  change_type: string; // "added" | "modified" | "removed"
  fields: { field_name: string; old_value: string | null; new_value: string | null }[];
}

function groupChanges(changes: DiffChange[]): GroupedRecord[] {
  const map = new Map<number, GroupedRecord>();

  for (const c of changes) {
    let rec = map.get(c.key_id);
    if (!rec) {
      rec = {
        key_id: c.key_id,
        first_name: c.first_name || "",
        last_name: c.last_name || "",
        eaa_number: c.eaa_number || "",
        change_type: c.change_type,
        fields: [],
      };
      map.set(c.key_id, rec);
    }
    if (c.field_name) {
      rec.fields.push({
        field_name: c.field_name,
        old_value: c.old_value,
        new_value: c.new_value,
      });
    }
  }

  const typeOrder: Record<string, number> = { added: 0, modified: 1, removed: 2 };
  return Array.from(map.values()).sort((a, b) => {
    const diff = (typeOrder[a.change_type] ?? 1) - (typeOrder[b.change_type] ?? 1);
    if (diff !== 0) return diff;
    return a.last_name.localeCompare(b.last_name);
  });
}

function ChangeTypeBadge({ type }: { type: string }) {
  const config: Record<string, { variant: "secondary" | "destructive"; icon: typeof Plus; label: string }> = {
    added: { variant: "secondary", icon: Plus, label: "Added" },
    modified: { variant: "secondary", icon: RefreshCw, label: "Modified" },
    removed: { variant: "destructive", icon: Minus, label: "Removed" },
  };
  const { variant, icon: Icon, label } = config[type] || { variant: "secondary" as const, icon: RefreshCw, label: type };
  return (
    <Badge variant={variant} className="gap-1 text-xs">
      <Icon className="h-3 w-3" />{label}
    </Badge>
  );
}

function FieldDetails({ fields }: { fields: GroupedRecord["fields"] }) {
  if (fields.length === 0) return null;
  return (
    <div className="mt-2 space-y-1 text-sm">
      {fields.map((f, i) => (
        <div key={i} className="flex flex-wrap items-baseline gap-x-2 pl-2 border-l-2 border-muted">
          <span className="text-muted-foreground font-medium">{f.field_name}:</span>
          {f.old_value && (
            <span className="line-through text-muted-foreground">{f.old_value}</span>
          )}
          {f.old_value && f.new_value && <span className="text-muted-foreground">→</span>}
          {f.new_value && <span className="font-medium">{f.new_value}</span>}
        </div>
      ))}
    </div>
  );
}

interface GroupedDiffViewProps {
  changes: DiffChange[];
  maxHeight?: string;
}

export default function GroupedDiffView({ changes, maxHeight = "400px" }: GroupedDiffViewProps) {
  const isMobile = useIsMobile();
  const records = groupChanges(changes);
  const [expandedKeys, setExpandedKeys] = useState<Set<number>>(new Set());

  const toggle = (keyId: number) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) next.delete(keyId);
      else next.add(keyId);
      return next;
    });
  };

  if (records.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No changes recorded.</p>;
  }

  if (isMobile) {
    return (
      <div className="space-y-3" style={{ maxHeight, overflowY: "auto" }}>
        {records.map((r) => {
          const expanded = expandedKeys.has(r.key_id);
          return (
            <Card
              key={r.key_id}
              className={cn("cursor-pointer", r.fields.length > 0 && "hover:bg-muted/30")}
              onClick={() => toggle(r.key_id)}
            >
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {r.fields.length > 0 && (
                      expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <p className="font-medium text-sm">{r.last_name}, {r.first_name}</p>
                  </div>
                  <ChangeTypeBadge type={r.change_type} />
                </div>
                <p className="text-sm text-muted-foreground pl-6">EAA #{r.eaa_number} · {r.fields.length} field{r.fields.length !== 1 ? "s" : ""}</p>
                {expanded && <div className="pl-4"><FieldDetails fields={r.fields} /></div>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-md border" style={{ maxHeight, overflowY: "auto" }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Member</TableHead>
            <TableHead>EAA #</TableHead>
            <TableHead>Fields Changed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => {
            const expanded = expandedKeys.has(r.key_id);
            return (
              <TableRow
                key={r.key_id}
                className={cn("cursor-pointer", r.fields.length > 0 && "hover:bg-muted/30")}
                onClick={() => toggle(r.key_id)}
              >
                <TableCell colSpan={5} className="p-0">
                  <div className="flex items-center px-4 py-2">
                    <div className="w-8 flex-shrink-0">
                      {r.fields.length > 0 && (
                        expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="w-[100px]"><ChangeTypeBadge type={r.change_type} /></div>
                    <div className="flex-1 font-medium">{r.last_name}, {r.first_name}</div>
                    <div className="w-[100px]">{r.eaa_number}</div>
                    <div className="w-[120px] text-muted-foreground">{r.fields.length} field{r.fields.length !== 1 ? "s" : ""}</div>
                  </div>
                  {expanded && (
                    <div className="px-12 pb-3">
                      <FieldDetails fields={r.fields} />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export { groupChanges, ChangeTypeBadge };
export type { GroupedRecord };
