import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { exportDiffToExcel, exportDiffToCsv } from "@/lib/export";

export default function ImportReport() {
  const { importId } = useParams();

  const { data: importRecord } = useQuery({
    queryKey: ["import", importId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_imports")
        .select("*")
        .eq("id", importId)
        .single();
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

  const changeTypeColor = (type: string) => {
    switch (type) {
      case "added": return "bg-green-100 text-green-800";
      case "modified": return "bg-blue-100 text-blue-800";
      case "removed": return "bg-red-100 text-red-800";
      default: return "";
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/imports"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Import Report</h1>
          {importRecord && (
            <p className="text-sm text-muted-foreground">
              {format(new Date(importRecord.imported_at), "MMM d, yyyy h:mm a")} · {importRecord.file_name}
            </p>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportDiffToCsv(changes)}>Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportDiffToExcel(changes)}>Export Excel</Button>
        </div>
      </div>

      {importRecord && (
        <div className="flex gap-4 text-sm">
          <span className="text-green-600 font-medium">+{importRecord.added_count} added</span>
          <span className="text-blue-600 font-medium">{importRecord.modified_count} modified</span>
          <span className="text-destructive font-medium">{importRecord.removed_count} removed</span>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading changes...</p>
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
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${changeTypeColor(c.change_type)}`}>
                      {c.change_type}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{c.last_name}, {c.first_name}</TableCell>
                  <TableCell>{c.eaa_number}</TableCell>
                  <TableCell>{c.field_name || "—"}</TableCell>
                  <TableCell className="max-w-[150px] truncate text-muted-foreground">{c.old_value || "—"}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{c.new_value || "—"}</TableCell>
                </TableRow>
              ))}
              {changes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No changes recorded for this import.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
