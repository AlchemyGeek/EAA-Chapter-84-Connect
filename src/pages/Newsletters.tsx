import { useState, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsOfficer } from "@/hooks/useIsOfficer";
import { useTrackEngagement } from "@/hooks/useTrackEngagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Newspaper,
  Search,
  Upload,
  ExternalLink,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type NewsletterRow = {
  id: string;
  title: string;
  issue_date: string;
  storage_path: string;
  extraction_status: string;
  snippet: string | null;
  rank?: number;
};

export default function Newsletters() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  useTrackEngagement("service_page");

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  // Get my member to determine officer status
  const { data: myMember } = useQuery({
    queryKey: ["my-member-newsletters", user?.email],
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
  const { isOfficer } = useIsOfficer(myMember?.key_id);
  const canManage = isOfficer || isAdmin;

  // Fetch newsletters via the search RPC (supports empty query => list all)
  const { data: newsletters, isLoading } = useQuery({
    queryKey: ["newsletters", submittedQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_newsletters", {
        _query: submittedQuery,
      });
      if (error) throw error;
      return (data ?? []) as NewsletterRow[];
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<number, NewsletterRow[]>();
    (newsletters ?? []).forEach((n) => {
      const year = new Date(n.issue_date).getUTCFullYear();
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(n);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [newsletters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(query.trim());
  };

  const handleClear = () => {
    setQuery("");
    setSubmittedQuery("");
  };

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
      toast({ title: "Text re-extracted" });
      queryClient.invalidateQueries({ queryKey: ["newsletters"] });
    },
    onError: (e: Error) =>
      toast({ title: "Extraction failed", description: e.message, variant: "destructive" }),
  });

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/home">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-accent" />
              Newsletter Archive
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Search and read past chapter newsletters
            </p>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search newsletter contents…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
          {submittedQuery && (
            <Button type="button" variant="ghost" onClick={handleClear}>
              Clear
            </Button>
          )}
        </form>

        {/* Officer upload panel */}
        {canManage && myMember && (
          <UploadPanel
            uploaderKeyId={myMember.key_id}
            uploaderName={`${myMember.first_name ?? ""} ${myMember.last_name ?? ""}`.trim()}
            onUploaded={() => queryClient.invalidateQueries({ queryKey: ["newsletters"] })}
          />
        )}

        {/* Results */}
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : !newsletters || newsletters.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              {submittedQuery
                ? `No newsletters match "${submittedQuery}".`
                : "No newsletters in the archive yet."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map(([year, items]) => (
              <div key={year} className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {year}
                </h2>
                {items.map((n) => (
                  <NewsletterCard
                    key={n.id}
                    n={n}
                    onOpen={() => openPdf(n.storage_path)}
                    canManage={canManage}
                    onDelete={() => {
                      if (confirm(`Delete "${n.title}"? This cannot be undone.`)) {
                        deleteMutation.mutate(n);
                      }
                    }}
                    onReextract={() => reextractMutation.mutate(n.id)}
                    reextracting={reextractMutation.isPending}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NewsletterCard({
  n,
  onOpen,
  canManage,
  onDelete,
  onReextract,
  reextracting,
}: {
  n: NewsletterRow;
  onOpen: () => void;
  canManage: boolean;
  onDelete: () => void;
  onReextract: () => void;
  reextracting: boolean;
}) {
  const dateLabel = new Date(n.issue_date + "T00:00:00").toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base">{n.title}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
        </div>
        <Button size="sm" onClick={onOpen} className="shrink-0">
          <ExternalLink className="h-4 w-4 mr-1.5" />
          Open PDF
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {n.snippet && (
          <p
            className="text-sm text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: n.snippet }}
          />
        )}
        {n.extraction_status !== "done" && (
          <Badge variant="outline" className="text-xs">
            {n.extraction_status === "pending" ? "Indexing…" : "Indexing failed"}
          </Badge>
        )}
        {canManage && (
          <div className="flex gap-2 pt-1 border-t border-border/50">
            <Button
              size="sm"
              variant="ghost"
              onClick={onReextract}
              disabled={reextracting}
              className="text-xs"
            >
              {reextracting ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Re-index
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UploadPanel({
  uploaderKeyId,
  uploaderName,
  onUploaded,
}: {
  uploaderKeyId: number;
  uploaderName: string;
  onUploaded: () => void;
}) {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const guessTitleAndDate = (filename: string): { title: string; issueDate: string } => {
    const base = filename.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
    // Try to find YYYY-MM or "Month YYYY"
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

        // Trigger extraction (don't await — fire & continue)
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
            Title and issue date are auto-detected from the filename (e.g. "april-2026.pdf"). You
            can edit them later.
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
