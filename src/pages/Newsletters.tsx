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
import { ArrowLeft, Newspaper, Search, ExternalLink, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type NewsletterRow = {
  id: string;
  title: string;
  issue_date: string;
  storage_path: string;
  extraction_status: string;
  snippet: string | null;
  rank?: number;
  match_count?: number;
};

export default function Newsletters() {
  const { user, loading: authLoading } = useAuth();
  useTrackEngagement("service_page");

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [fromMonth, setFromMonth] = useState(""); // YYYY-MM
  const [toMonth, setToMonth] = useState(""); // YYYY-MM

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

  const filtered = useMemo(() => {
    return (newsletters ?? []).filter((n) => {
      const ym = n.issue_date.slice(0, 7); // YYYY-MM
      if (fromMonth && ym < fromMonth) return false;
      if (toMonth && ym > toMonth) return false;
      return true;
    });
  }, [newsletters, fromMonth, toMonth]);

  const oldest = useMemo(() => {
    if (!newsletters || newsletters.length === 0) return null;
    return newsletters.reduce((min, n) => (n.issue_date < min ? n.issue_date : min), newsletters[0].issue_date);
  }, [newsletters]);

  const grouped = useMemo(() => {
    const map = new Map<number, NewsletterRow[]>();
    filtered.forEach((n) => {
      const year = new Date(n.issue_date).getUTCFullYear();
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(n);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(query.trim());
  };

  const handleClear = () => {
    setQuery("");
    setSubmittedQuery("");
    setFromMonth("");
    setToMonth("");
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
          {(submittedQuery || fromMonth || toMonth) && (
            <Button type="button" variant="ghost" onClick={handleClear}>
              Clear
            </Button>
          )}
        </form>

        {/* Date range filter */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Date range:</span>
          <Input
            type="month"
            value={fromMonth}
            onChange={(e) => setFromMonth(e.target.value)}
            className="w-auto h-9"
            aria-label="From month"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="month"
            value={toMonth}
            onChange={(e) => setToMonth(e.target.value)}
            className="w-auto h-9"
            aria-label="To month"
          />
        </div>

        {/* Oldest notification */}
        {oldest && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground border rounded-md px-3 py-2 bg-muted/30">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Oldest newsletter in the archive:{" "}
              <span className="font-medium text-foreground">
                {new Date(oldest + "T00:00:00").toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                })}
              </span>
            </span>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : !filtered || filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              {submittedQuery
                ? `No newsletters match "${submittedQuery}"${fromMonth || toMonth ? " in this date range" : ""}.`
                : fromMonth || toMonth
                ? "No newsletters in this date range."
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
          {typeof n.match_count === "number" && n.match_count > 0 && (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
              {n.match_count} {n.match_count === 1 ? "match" : "matches"}
            </Badge>
          )}
          {n.extraction_status !== "done" && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
              {n.extraction_status === "pending" ? "Indexing…" : "Failed"}
            </Badge>
          )}
        </div>
        {n.snippet && (
          <p
            className="text-xs text-muted-foreground leading-snug mt-1"
            dangerouslySetInnerHTML={{
              __html: n.snippet.replace(/\s*\.\.\.\s*/g, ' <span class="text-muted-foreground/60 mx-1">…</span> '),
            }}
          />
        )}
      </div>
      <Button size="sm" variant="ghost" onClick={onOpen} className="shrink-0 h-9 px-2" aria-label="Open PDF">
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );
}
