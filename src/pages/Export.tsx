import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Plus, RefreshCw, Minus } from "lucide-react";
import { exportMembersToExcel, exportMembersToCsv, exportDiffToExcel, exportDiffToCsv } from "@/lib/export";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

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

export default function Export() {
  const isMobile = useIsMobile();

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["members-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("*")
        .order("last_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: lastImport } = useQuery({
    queryKey: ["last-import"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_imports")
        .select("*")
        .eq("status", "completed")
        .order("imported_at", { ascending: false })
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
  });

  const { data: changes = [], isLoading: changesLoading } = useQuery({
    queryKey: ["last-import-changes", lastImport?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_import_changes")
        .select("*")
        .eq("import_id", lastImport!.id)
        .order("change_type")
        .order("last_name");
      if (error) throw error;
      return data;
    },
    enabled: !!lastImport?.id,
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">Export Data</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Full Member Export</CardTitle>
          <CardDescription>Download all {members.length} member records from the database.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="gap-2 w-full sm:w-auto min-h-[44px]" onClick={() => exportMembersToCsv(members)} disabled={membersLoading}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" className="gap-2 w-full sm:w-auto min-h-[44px]" onClick={() => exportMembersToExcel(members)} disabled={membersLoading}>
            <Download className="h-4 w-4" /> Excel
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Changes from Last Import</CardTitle>
          <CardDescription>
            {lastImport
              ? `${format(new Date(lastImport.imported_at), "MMM d, yyyy h:mm a")} · ${lastImport.file_name} · ${changes.length} change(s)`
              : "No imports found."}
          </CardDescription>
        </CardHeader>
        {lastImport && (
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="gap-2 w-full sm:w-auto min-h-[44px]" onClick={() => exportDiffToCsv(changes)} disabled={changesLoading || changes.length === 0}>
                <Download className="h-4 w-4" /> Export Changes CSV
              </Button>
              <Button variant="outline" className="gap-2 w-full sm:w-auto min-h-[44px]" onClick={() => exportDiffToExcel(changes)} disabled={changesLoading || changes.length === 0}>
                <Download className="h-4 w-4" /> Export Changes Excel
              </Button>
            </div>

            {lastImport && (
              <div className="flex gap-4 text-sm flex-wrap">
                <span className="inline-flex items-center gap-1 text-green-600 font-medium"><Plus className="h-3 w-3" />+{lastImport.added_count ?? 0} added</span>
                <span className="inline-flex items-center gap-1 text-blue-600 font-medium"><RefreshCw className="h-3 w-3" />{lastImport.modified_count ?? 0} modified</span>
                <span className="inline-flex items-center gap-1 text-destructive font-medium"><Minus className="h-3 w-3" />{lastImport.removed_count ?? 0} removed</span>
              </div>
            )}

            {changesLoading ? (
              <p className="text-muted-foreground text-sm">Loading changes...</p>
            ) : changes.length === 0 ? (
              <p className="text-muted-foreground text-sm">No changes recorded for this import.</p>
            ) : isMobile ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {changes.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{c.last_name}, {c.first_name}</p>
                        <ChangeTypeBadge type={c.change_type} />
                      </div>
                      <p className="text-xs text-muted-foreground">EAA #{c.eaa_number}</p>
                      {c.field_name && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">{c.field_name}: </span>
                          {c.old_value && <span className="line-through text-muted-foreground mr-2">{c.old_value}</span>}
                          {c.new_value && <span className="font-medium">{c.new_value}</span>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-md border max-h-[400px] overflow-y-auto">
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
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
