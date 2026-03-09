import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Upload, FileUp, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { diffCurrentVsSnapshots } from "@/lib/diffMembers";

const CONFIRM_PHRASE = "overwrite local changes";

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [confirmText, setConfirmText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current members
  const { data: members = [] } = useQuery({
    queryKey: ["members-full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roster_members").select("*").order("last_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch last import
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

  // Fetch snapshots
  const { data: snapshots = [] } = useQuery({
    queryKey: ["last-import-snapshots", lastImport?.id],
    queryFn: async () => {
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

  // Check if data has been synced since the last import
  const lastSyncedAt = localStorage.getItem("lastExportSyncAt");
  const hasUnsyncedChanges = useMemo(() => {
    if (localChanges.length === 0) return false;
    // If never synced, there are unsynced changes
    if (!lastSyncedAt) return true;
    // If synced after the last import, consider changes as synced
    if (lastImport?.imported_at) {
      return new Date(lastSyncedAt) < new Date(lastImport.imported_at);
    }
    return true;
  }, [localChanges, lastSyncedAt, lastImport]);
  const confirmMatches = confirmText.trim().toLowerCase() === CONFIRM_PHRASE;
  const canImport = file && !importing && (!hasUnsyncedChanges || confirmMatches);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/roster-import`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import failed");

      setResult(data);
      setConfirmText("");
      // Invalidate cached queries so the local-changes check uses fresh post-import data
      await queryClient.invalidateQueries({ queryKey: ["members-full"] });
      await queryClient.invalidateQueries({ queryKey: ["last-import"] });
      await queryClient.invalidateQueries({ queryKey: ["last-import-snapshots"] });
      await queryClient.invalidateQueries({ queryKey: ["membership-stats-members"] });
      await queryClient.invalidateQueries({ queryKey: ["membership-stats-last-import"] });
      await queryClient.invalidateQueries({ queryKey: ["membership-stats-inactive-by-import"] });
      toast({ title: "Import successful", description: `${data.record_count} records processed.` });
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const modifiedMembers = new Set(localChanges.filter(c => c.change_type === "modified").map(c => c.key_id));

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Import Roster</h1>

      {hasUnexportedChanges && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unexported Local Changes Detected</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              There are <strong>{localChanges.length}</strong> unexported local change(s) 
              ({modifiedMembers.size} modified, {localChanges.filter(c => c.change_type === "added").length} added, {localChanges.filter(c => c.change_type === "removed").length} removed) 
              since the last import. Importing a new roster will overwrite this data and these changes will be lost.
            </p>
            <p className="text-sm">
              Consider exporting your changes first from the <strong>Export</strong> page. 
              To proceed anyway, type <strong>"{CONFIRM_PHRASE}"</strong> below.
            </p>
            <Input
              placeholder={`Type "${CONFIRM_PHRASE}" to proceed`}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="max-w-sm"
            />
            {confirmMatches && (
              <p className="text-sm font-medium text-foreground">✓ Confirmed — you may proceed with the import.</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload EAA Roster Export</CardTitle>
          <CardDescription>Select the .xls file exported from the EAA roster tool. The file will be parsed and compared against existing data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {file ? file.name : "Click to select a file"}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xls,.html,.htm"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <Button onClick={handleImport} disabled={!canImport} className="w-full gap-2">
            <Upload className="h-4 w-4" />
            {importing ? "Importing..." : "Start Import"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Records processed</dt>
              <dd className="font-medium">{result.record_count}</dd>
              <dt className="text-muted-foreground">Added</dt>
              <dd className="font-medium text-green-600">+{result.added}</dd>
              <dt className="text-muted-foreground">Modified</dt>
              <dd className="font-medium text-blue-600">{result.modified}</dd>
              <dt className="text-muted-foreground">Removed</dt>
              <dd className="font-medium text-destructive">{result.removed}</dd>
              <dt className="text-muted-foreground">Total changes</dt>
              <dd className="font-medium">{result.total_changes}</dd>
            </dl>
            <Button variant="outline" className="mt-4" onClick={() => navigate(`/imports/${result.import_id}`)}>
              View Diff Report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
