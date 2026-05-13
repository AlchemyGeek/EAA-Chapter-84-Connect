import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Upload, FileUp, CheckCircle, AlertTriangle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { diffCurrentVsSnapshots } from "@/lib/diffMembers";

const CONFIRM_PHRASE = "overwrite local changes";

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [confirmText, setConfirmText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current members
  const { data: members = [], isLoading: membersLoading } = useQuery({
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
  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery({
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

  const dataReady = !membersLoading && !snapshotsLoading;

  const localChanges = useMemo(() => {
    if (snapshots.length === 0 || members.length === 0) return [];
    return diffCurrentVsSnapshots(members, snapshots);
  }, [members, snapshots]);

  const lastSyncedAt = localStorage.getItem("lastExportSyncAt");
  const hasUnsyncedChanges = useMemo(() => {
    if (localChanges.length === 0) return false;
    if (!lastSyncedAt) return true;
    const syncDate = new Date(lastSyncedAt);
    const changedKeyIds = new Set(localChanges.map(c => c.key_id));
    return members
      .filter(m => changedKeyIds.has(m.key_id))
      .some(m => new Date(m.updated_at) > syncDate);
  }, [localChanges, lastSyncedAt, members]);

  const confirmMatches = confirmText.trim().toLowerCase() === CONFIRM_PHRASE;
  const canPreview = file && !previewing && !importing && (!hasUnsyncedChanges || confirmMatches);
  const canApply = preview && !importing;

  const callImport = async (dryRun: boolean) => {
    if (!file) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");
    const formData = new FormData();
    formData.append("file", file);
    if (dryRun) formData.append("dry_run", "true");
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/roster-import`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  const handlePreview = async () => {
    if (!file) return;
    setPreviewing(true);
    setPreview(null);
    setResult(null);
    try {
      const data = await callImport(true);
      setPreview(data);
    } catch (e: any) {
      toast({ title: "Preview failed", description: e.message, variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const data = await callImport(false);
      setResult(data);
      setPreview(null);
      setFile(null);
      setConfirmText("");
      if (fileRef.current) fileRef.current.value = "";
      await queryClient.invalidateQueries({ queryKey: ["members-full"] });
      await queryClient.invalidateQueries({ queryKey: ["last-import"] });
      await queryClient.invalidateQueries({ queryKey: ["last-import-snapshots"] });
      await queryClient.invalidateQueries({ queryKey: ["membership-stats-members"] });
      await queryClient.invalidateQueries({ queryKey: ["membership-stats-last-import"] });
      await queryClient.invalidateQueries({ queryKey: ["membership-stats-inactive-by-import"] });
      toast({ title: "Import successful", description: `${data.record_count} records processed.` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
  };

  const handleFileChange = (f: File | null) => {
    setFile(f);
    setPreview(null);
    setResult(null);
  };

  const modifiedMembers = new Set(localChanges.filter(c => c.change_type === "modified").map(c => c.key_id));

  const fmtName = (r: any) =>
    `${r.first_name || ""} ${r.last_name || ""}`.trim() + (r.eaa_number ? ` (#${r.eaa_number})` : "");

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Import Roster</h1>

      {dataReady && hasUnsyncedChanges && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unsynced Local Changes Detected</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              There are <strong>{localChanges.length}</strong> local change(s)
              ({modifiedMembers.size} modified, {localChanges.filter(c => c.change_type === "added").length} added, {localChanges.filter(c => c.change_type === "removed").length} removed)
              that have not been synced with the EAA Roster Tool. Importing a new roster will overwrite this data and these changes will be lost.
            </p>
            <p className="text-sm">
              Consider syncing your changes first from the <strong>Export</strong> page using "Mark Data Synced".
              To proceed anyway, type <strong>"{CONFIRM_PHRASE}"</strong> below.
            </p>
            <Input
              placeholder={`Type "${CONFIRM_PHRASE}" to proceed`}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="max-w-sm"
            />
            {confirmMatches && (
              <p className="text-sm font-medium text-foreground">✓ Confirmed — you may proceed.</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload EAA Roster Export</CardTitle>
          <CardDescription>Select the .xls file exported from the EAA roster tool. The file will be parsed and a diff preview will be shown for your approval before any changes are applied.</CardDescription>
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
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
          </div>

          <Button onClick={handlePreview} disabled={!canPreview} className="w-full gap-2">
            <Eye className="h-4 w-4" />
            {previewing ? "Computing preview..." : "Preview Changes"}
          </Button>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview — Approval Required</CardTitle>
            <CardDescription>
              Review the changes below. Nothing has been written yet. Click <strong>Apply Import</strong> to commit, or <strong>Cancel</strong> to discard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Records in file</dt>
              <dd className="font-medium">{preview.record_count}</dd>
              <dt className="text-muted-foreground">Will add</dt>
              <dd className="font-medium text-green-600">+{preview.counts.added}</dd>
              <dt className="text-muted-foreground">Will modify</dt>
              <dd className="font-medium text-blue-600">{preview.counts.modified}</dd>
              <dt className="text-muted-foreground">Will remove</dt>
              <dd className="font-medium text-destructive">{preview.counts.removed}</dd>
              <dt className="text-muted-foreground">Prospect reconciliations</dt>
              <dd className="font-medium">{preview.counts.reconciled}</dd>
            </dl>

            {preview.counts.reconciled > 0 && (
              <div className="text-sm border rounded p-3 space-y-1">
                <p className="font-medium">Prospect → Real roster record</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {preview.reconciled.slice(0, 20).map((r: any, i: number) => (
                    <li key={i}>{fmtName(r)} — key {r.old_key_id} → {r.new_key_id}</li>
                  ))}
                  {preview.reconciled.length > 20 && <li>…and {preview.reconciled.length - 20} more</li>}
                </ul>
              </div>
            )}

            {preview.counts.added > 0 && (
              <details className="text-sm border rounded p-3">
                <summary className="font-medium cursor-pointer">Added ({preview.counts.added})</summary>
                <ul className="list-disc pl-5 mt-2 text-muted-foreground">
                  {preview.added.slice(0, 50).map((r: any, i: number) => (
                    <li key={i}>{fmtName(r)} — {r.member_type || "—"}</li>
                  ))}
                  {preview.added.length > 50 && <li>…and {preview.added.length - 50} more</li>}
                </ul>
              </details>
            )}

            {preview.counts.removed > 0 && (
              <details className="text-sm border rounded p-3">
                <summary className="font-medium cursor-pointer">Removed ({preview.counts.removed})</summary>
                <ul className="list-disc pl-5 mt-2 text-muted-foreground">
                  {preview.removed.slice(0, 50).map((r: any, i: number) => (
                    <li key={i}>
                      {fmtName(r)} — {r.member_type || "—"}
                      {r.reconciled_to_key_id && <span className="text-foreground"> (reconciled to key {r.reconciled_to_key_id})</span>}
                    </li>
                  ))}
                  {preview.removed.length > 50 && <li>…and {preview.removed.length - 50} more</li>}
                </ul>
              </details>
            )}

            {preview.counts.modified > 0 && (
              <details className="text-sm border rounded p-3">
                <summary className="font-medium cursor-pointer">Modified ({preview.counts.modified})</summary>
                <ul className="list-disc pl-5 mt-2 text-muted-foreground space-y-1">
                  {preview.modified.slice(0, 50).map((r: any, i: number) => (
                    <li key={i}>
                      {fmtName(r)} — {r.fields.length} field(s):{" "}
                      {r.fields.slice(0, 5).map((f: any) => f.field).join(", ")}
                      {r.fields.length > 5 && ` +${r.fields.length - 5}`}
                    </li>
                  ))}
                  {preview.modified.length > 50 && <li>…and {preview.modified.length - 50} more</li>}
                </ul>
              </details>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleApply} disabled={!canApply} className="flex-1 gap-2">
                <Upload className="h-4 w-4" />
                {importing ? "Applying..." : "Apply Import"}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={importing}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
