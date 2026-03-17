import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, RefreshCw, Minus } from "lucide-react";
import { format } from "date-fns";
import { exportDiffToExcel, exportDiffToCsv } from "@/lib/export";
import GroupedDiffView from "@/components/diff/GroupedDiffView";

export default function ImportReport() {
  const { importId } = useParams();

  const { data: importRecord } = useQuery({
    queryKey: ["import", importId],
    queryFn: async () => {
      const { data, error } = await supabase.from("roster_imports").select("*").eq("id", importId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: changes = [], isLoading } = useQuery({
    queryKey: ["import-changes", importId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_import_changes")
        .select("*")
        .eq("import_id", importId!)
        .order("change_type")
        .order("last_name");
      if (error) throw error;
      return data;
    },
    enabled: !!importId,
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/imports"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Import Report</h1>
            {importRecord && (
              <p className="text-sm text-muted-foreground truncate">
                {format(new Date(importRecord.imported_at), "MMM d, yyyy h:mm a")} · {importRecord.file_name}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportDiffToCsv(changes)} className="min-h-[44px]">Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportDiffToExcel(changes)} className="min-h-[44px]">Export Excel</Button>
        </div>
      </div>

      {importRecord && (
        <div className="flex gap-4 text-sm flex-wrap">
          <span className="inline-flex items-center gap-1 text-success font-medium"><Plus className="h-3 w-3" />+{importRecord.added_count} added</span>
          <span className="inline-flex items-center gap-1 text-info font-medium"><RefreshCw className="h-3 w-3" />{importRecord.modified_count} modified</span>
          <span className="inline-flex items-center gap-1 text-destructive font-medium"><Minus className="h-3 w-3" />{importRecord.removed_count} removed</span>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading changes...</p>
      ) : isMobile ? (
        <div className="space-y-3">
          {changes.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{c.last_name}, {c.first_name}</p>
                  <ChangeTypeBadge type={c.change_type} />
                </div>
                <p className="text-sm text-muted-foreground">EAA #{c.eaa_number}</p>
                {c.field_name && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{c.field_name}: </span>
                    {c.old_value && <span className="line-through text-muted-foreground mr-2">{c.old_value}</span>}
                    {c.new_value && <span className="font-medium">{c.new_value}</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {changes.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No changes recorded for this import.</p>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>EAA #</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Old Value</TableHead>
                <TableHead>New Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><ChangeTypeBadge type={c.change_type} /></TableCell>
                  <TableCell className="font-medium">{c.last_name}, {c.first_name}</TableCell>
                  <TableCell>{c.eaa_number}</TableCell>
                  <TableCell>{c.field_name || "—"}</TableCell>
                  <TableCell className="max-w-[150px] truncate text-muted-foreground">{c.old_value || "—"}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{c.new_value || "—"}</TableCell>
                </TableRow>
              ))}
              {changes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No changes recorded for this import.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
