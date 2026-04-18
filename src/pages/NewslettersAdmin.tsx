import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsOfficer } from "@/hooks/useIsOfficer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Newspaper,
  Upload,
  ExternalLink,
  Trash2,
  Loader2,
  RefreshCw,
  Pencil,
  Check,
  X,
  Search,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type NewsletterRow = {
  id: string;
  title: string;
  issue_date: string;
  storage_path: string;
  extraction_status: string;
  uploaded_by_name: string | null;
};

export default function NewslettersAdmin() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");

  const { data: myMember, isLoading: memberLoading } = useQuery({
    queryKey: ["my-member-newsletters-admin", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, email")
        .ilike("email", user!.email!)
        .maybeSingle();
      return data;
    },
  });
  const { isOfficer, isLoading: officerLoading } = useIsOfficer(myMember?.key_id);
  const canManage = isOfficer || isAdmin;

  const { data: newsletters, isLoading } = useQuery({
    queryKey: ["newsletters-admin"],
    enabled: canManage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletters")
        .select("id, title, issue_date, storage_path, extraction_status, uploaded_by_name")
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NewsletterRow[];
    },
  });

  const openPdf = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("newsletters")
      .createSignedUrl(path, 60 * 10);
    if (error || !data) {
      toast({ title: "Could not open PDF", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const deleteMutation = useMutation({
    mutationFn: async (n: NewsletterRow) => {
      await supabase.storage.from("newsletters").remove([n.storage_path]);
      const { error } = await supabase.from("newsletters").delete().eq("id", n.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Newsletter deleted" });
      queryClient.invalidateQueries({ queryKey: ["newsletters-admin"] });
      queryClient.invalidateQueries({ queryKey: ["newsletters"] });
    },
    onError: (e: Error) =>
      toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const reextractMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke("newsletter-extract-text", {
        body: { newsletter_id: id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Re-indexing started" });
      queryClient.invalidateQueries({ queryKey: ["newsletters-admin"] });
    },
    onError: (e: Error) =>
      toast({ title: "Extraction failed", description: e.message, variant: "destructive" }),
  });

  const reextractAllMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      let ok = 0;
      let failed = 0;
      for (const id of ids) {
        const { error } = await supabase.functions.invoke("newsletter-extract-text", {
          body: { newsletter_id: id },
        });
        if (error) failed++;
        else ok++;
      }
      return { ok, failed };
    },
    onSuccess: ({ ok, failed }) => {
      toast({
        title: "Bulk re-index complete",
        description: `${ok} succeeded${failed ? `, ${failed} failed` : ""}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["newsletters-admin"] });
      queryClient.invalidateQueries({ queryKey: ["newsletters"] });
    },
    onError: (e: Error) =>
      toast({ title: "Bulk re-index failed", description: e.message, variant: "destructive" }),
  });

  const updateDateMutation = useMutation({
    mutationFn: async ({ id, issue_date }: { id: string; issue_date: string }) => {
      const { error } = await supabase
        .from("newsletters")
        .update({ issue_date })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Issue date updated" });
      queryClient.invalidateQueries({ queryKey: ["newsletters-admin"] });
      queryClient.invalidateQueries({ queryKey: ["newsletters"] });
    },
    onError: (e: Error) =>
      toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const filtered = (newsletters ?? []).filter((n) =>
    filter.trim() === ""
      ? true
      : n.title.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  if (authLoading || memberLoading || officerLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!canManage) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-accent" />
              Manage Newsletters
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Upload, re-index, or delete newsletters in the archive
            </p>
          </div>
        </div>

        <UploadPanel
          uploaderName={
            myMember
              ? `${myMember.first_name ?? ""} ${myMember.last_name ?? ""}`.trim()
              : (user?.email ?? "Admin")
          }
          onUploaded={() => {
            queryClient.invalidateQueries({ queryKey: ["newsletters-admin"] });
            queryClient.invalidateQueries({ queryKey: ["newsletters"] });
          }}
        />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Archive ({filtered.length}
              {filter && newsletters ? ` of ${newsletters.length}` : ""})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Filter by title…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !newsletters || newsletters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No newsletters uploaded yet.
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No newsletters match "{filter}".
              </p>
            ) : (
              filtered.map((n) => (
                <NewsletterAdminRow
                  key={n.id}
                  n={n}
                  onOpen={() => openPdf(n.storage_path)}
                  onReindex={() => reextractMutation.mutate(n.id)}
                  reindexing={reextractMutation.isPending}
                  onDelete={() => {
                    if (confirm(`Delete "${n.title}"? This cannot be undone.`)) {
                      deleteMutation.mutate(n);
                    }
                  }}
                  onSaveDate={(issue_date) =>
                    updateDateMutation.mutate({ id: n.id, issue_date })
                  }
                  saving={updateDateMutation.isPending}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function NewsletterAdminRow({
  n,
  onOpen,
  onReindex,
  reindexing,
  onDelete,
  onSaveDate,
  saving,
}: {
  n: NewsletterRow;
  onOpen: () => void;
  onReindex: () => void;
  reindexing: boolean;
  onDelete: () => void;
  onSaveDate: (issueDate: string) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const initial = new Date(n.issue_date + "T00:00:00");
  const [month, setMonth] = useState(initial.getMonth() + 1);
  const [year, setYear] = useState(initial.getFullYear());

  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 1; y >= 1990; y--) years.push(y);

  const save = () => {
    const issueDate = `${year}-${String(month).padStart(2, "0")}-01`;
    onSaveDate(issueDate);
    setEditing(false);
  };

  const cancel = () => {
    setMonth(initial.getMonth() + 1);
    setYear(initial.getFullYear());
    setEditing(false);
  };

  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{n.title}</p>
        {editing ? (
          <div className="flex items-center gap-1.5 mt-1.5">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              aria-label="Month"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              aria-label="Year"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <Button size="sm" variant="ghost" onClick={save} disabled={saving} title="Save">
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel} title="Cancel">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span>
              {initial.toLocaleDateString(undefined, { year: "numeric", month: "short" })}
              {n.uploaded_by_name ? ` · uploaded by ${n.uploaded_by_name}` : ""}
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-foreground p-0.5"
              title="Edit issue date"
              aria-label="Edit issue date"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </p>
        )}
        {n.extraction_status !== "done" && (
          <Badge variant="outline" className="text-xs mt-1">
            {n.extraction_status === "pending" ? "Indexing…" : "Indexing failed"}
          </Badge>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="sm" variant="ghost" onClick={onOpen} title="Open PDF">
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onReindex}
          disabled={reindexing}
          title="Re-index"
        >
          {reindexing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function UploadPanel({
  uploaderName,
  onUploaded,
}: {
  uploaderName: string;
  onUploaded: () => void;
}) {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const guessTitleAndDate = (filename: string): { title: string; issueDate: string } => {
    const base = filename.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
    const months = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december",
    ];
    const lower = base.toLowerCase();
    let issueDate = new Date().toISOString().slice(0, 10);
    const ymMatch = lower.match(/(20\d{2})[\s\-/]?(0?[1-9]|1[0-2])/);
    const monthMatch = months.findIndex((m) => lower.includes(m));
    const yearMatch = lower.match(/(20\d{2})/);
    if (ymMatch) {
      issueDate = `${ymMatch[1]}-${ymMatch[2].padStart(2, "0")}-01`;
    } else if (monthMatch >= 0 && yearMatch) {
      issueDate = `${yearMatch[1]}-${String(monthMatch + 1).padStart(2, "0")}-01`;
    }
    return { title: base, issueDate };
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress({ done: 0, total: files.length });
    let success = 0;
    let failed = 0;
    for (const file of files) {
      try {
        const { title, issueDate } = guessTitleAndDate(file.name);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${issueDate.slice(0, 4)}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("newsletters")
          .upload(storagePath, file, { contentType: "application/pdf" });
        if (upErr) throw upErr;

        const { data: row, error: insErr } = await supabase
          .from("newsletters")
          .insert({
            title,
            issue_date: issueDate,
            storage_path: storagePath,
            uploaded_by: user?.id ?? null,
            uploaded_by_name: uploaderName,
            extraction_status: "pending",
          })
          .select("id")
          .single();
        if (insErr || !row) throw insErr ?? new Error("insert failed");

        supabase.functions
          .invoke("newsletter-extract-text", { body: { newsletter_id: row.id } })
          .then(({ error }) => {
            if (error) console.error("extract failed", error);
            onUploaded();
          });

        success++;
      } catch (e) {
        failed++;
        console.error("Upload failed for", file.name, e);
      }
      setProgress((p) => (p ? { done: p.done + 1, total: p.total } : null));
    }
    setUploading(false);
    setFiles([]);
    onUploaded();
    toast({
      title: "Upload complete",
      description: `${success} uploaded${failed ? `, ${failed} failed` : ""}. Indexing runs in background.`,
    });
  };

  return (
    <Card className="border-accent/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Upload className="h-4 w-4 text-accent" />
          Upload Newsletters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="newsletter-files" className="text-xs">
            Select one or more PDF files
          </Label>
          <Input
            id="newsletter-files"
            type="file"
            accept="application/pdf"
            multiple
            disabled={uploading}
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Title and issue date are auto-detected from the filename (e.g. "april-2026.pdf").
          </p>
        </div>
        {files.length > 0 && !uploading && (
          <div className="text-xs text-muted-foreground">
            {files.length} file{files.length === 1 ? "" : "s"} selected
          </div>
        )}
        {uploading && progress && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Uploading {progress.done} / {progress.total}…
          </div>
        )}
        <Button onClick={handleUpload} disabled={files.length === 0 || uploading} size="sm">
          <Upload className="h-4 w-4 mr-1.5" />
          Upload {files.length > 0 ? `(${files.length})` : ""}
        </Button>
      </CardContent>
    </Card>
  );
}
