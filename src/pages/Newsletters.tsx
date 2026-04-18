import { useState, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTrackEngagement } from "@/hooks/useTrackEngagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Newspaper, Search, ExternalLink } from "lucide-react";
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
  const { user, loading: authLoading } = useAuth();
  useTrackEngagement("service_page");

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

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
          <div className="space-y-5">
            {grouped.map(([year, items]) => (
              <div key={year} className="space-y-1.5">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {year}
                </h2>
                <div className="border rounded-md divide-y">
                  {items.map((n) => (
                    <NewsletterRow
                      key={n.id}
                      n={n}
                      onOpen={() => openPdf(n.storage_path)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NewsletterRow({ n, onOpen }: { n: NewsletterRow; onOpen: () => void }) {
  const dateLabel = new Date(n.issue_date + "T00:00:00").toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  });
  return (
    <div className="flex items-center gap-3 px-3 py-2 min-h-11">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground tabular-nums w-20 shrink-0">
            {dateLabel}
          </span>
          <span className="text-sm font-medium truncate">{n.title}</span>
          {n.extraction_status !== "done" && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
              {n.extraction_status === "pending" ? "Indexing…" : "Failed"}
            </Badge>
          )}
        </div>
        {n.snippet && (
          <p
            className="text-xs text-muted-foreground leading-snug mt-1 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: n.snippet }}
          />
        )}
      </div>
      <Button size="sm" variant="ghost" onClick={onOpen} className="shrink-0 h-9 px-2" aria-label="Open PDF">
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );
}
