import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Plus, RefreshCw, Minus, CheckCircle2 } from "lucide-react";
import { exportMembersToExcel, exportMembersToCsv, exportDiffToExcel, exportDiffToCsv } from "@/lib/export";
import { diffCurrentVsSnapshots } from "@/lib/diffMembers";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import GroupedDiffView from "@/components/diff/GroupedDiffView";


export default function Export() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    () => localStorage.getItem("lastExportSyncAt")
  );

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

  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery({
    queryKey: ["last-import-snapshots", lastImport?.id],
    queryFn: async () => {
      // Fetch all snapshots for this import (may exceed 1000)
      let all: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("roster_member_snapshots")
          .select("key_id, snapshot")
          .eq("import_id", lastImport!.id)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
    enabled: !!lastImport?.id,
  });

  const localChanges = useMemo(() => {
    if (snapshots.length === 0 || members.length === 0) return [];
    return diffCurrentVsSnapshots(members, snapshots);
  }, [members, snapshots]);

  const addedCount = localChanges.filter(c => c.change_type === "added").length;
  const modifiedMembers = new Set(localChanges.filter(c => c.change_type === "modified").map(c => c.key_id));
  const modifiedCount = modifiedMembers.size;
  const removedCount = localChanges.filter(c => c.change_type === "removed").length;

  const changesLoading = membersLoading || snapshotsLoading;

  // Format for export compatibility
  const exportableChanges = localChanges.map(c => ({
    id: `${c.key_id}-${c.field_name || c.change_type}`,
    change_type: c.change_type,
    key_id: c.key_id,
    first_name: c.first_name,
    last_name: c.last_name,
    eaa_number: c.eaa_number,
    field_name: c.field_name,
    old_value: c.old_value,
    new_value: c.new_value,
  }));

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">Export Data</h1>

      {/* Mark Synced Section */}
      <Card className="border-accent/30">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Sync Status
            </CardTitle>
            {lastSyncedAt && (
              <Badge variant="outline" className="text-xs font-normal">
                Last synced: {format(new Date(lastSyncedAt), "MMM d, yyyy h:mm a")}
              </Badge>
            )}
          </div>
          <CardDescription>
            After entering exported changes into the EAA Roster Tool, mark the data as synced.
            This records that member data, dues payments, and other changes have been uploaded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="gap-2 min-h-[44px]"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              try {
                const { error } = await supabase
                  .from("dues_payments" as any)
                  .update({ exported: true } as any)
                  .eq("exported", false);
                if (error) throw error;

                queryClient.invalidateQueries({ queryKey: ["dues-payments"] });
                const now = new Date().toISOString();
                localStorage.setItem("lastExportSyncAt", now);
                setLastSyncedAt(now);
                toast({
                  title: "Data marked as synced",
                  description: "Member data and dues payments have been marked as synced with EAA Roster Tool.",
                });
              } catch (err: any) {
                toast({ title: "Error", description: err.message, variant: "destructive" });
              } finally {
                setSyncing(false);
              }
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            {syncing ? "Syncing..." : "Mark Data Synced with EAA Roster Tool"}
          </Button>
        </CardContent>
      </Card>

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
          <CardTitle className="text-base">Local Changes Since Last Import</CardTitle>
          <CardDescription>
            {lastImport
              ? `Comparing current database against import from ${format(new Date(lastImport.imported_at), "MMM d, yyyy h:mm a")} · ${lastImport.file_name}`
              : snapshots.length === 0 && lastImport
              ? "No snapshots found for last import. Run a new import to enable local change tracking."
              : "No imports found."}
          </CardDescription>
        </CardHeader>
        {lastImport && (
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="gap-2 w-full sm:w-auto min-h-[44px]" onClick={() => exportDiffToCsv(exportableChanges)} disabled={changesLoading || localChanges.length === 0}>
                <Download className="h-4 w-4" /> Export Changes CSV
              </Button>
              <Button variant="outline" className="gap-2 w-full sm:w-auto min-h-[44px]" onClick={() => exportDiffToExcel(exportableChanges)} disabled={changesLoading || localChanges.length === 0}>
                <Download className="h-4 w-4" /> Export Changes Excel
              </Button>
            </div>

            <div className="flex gap-4 text-sm flex-wrap">
              <span className="inline-flex items-center gap-1 text-success font-medium"><Plus className="h-3 w-3" />+{addedCount} added</span>
              <span className="inline-flex items-center gap-1 text-info font-medium"><RefreshCw className="h-3 w-3" />{modifiedCount} modified</span>
              <span className="inline-flex items-center gap-1 text-destructive font-medium"><Minus className="h-3 w-3" />{removedCount} removed</span>
            </div>

            {changesLoading ? (
              <p className="text-muted-foreground text-sm">Computing changes...</p>
            ) : localChanges.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {snapshots.length === 0
                  ? "No snapshots found. Run a new import to enable local change tracking."
                  : "No local changes since last import."}
              </p>
            ) : (
              <GroupedDiffView changes={exportableChanges} />
            )}
          </CardContent>
        )}
      </Card>

    </div>
  );
}
