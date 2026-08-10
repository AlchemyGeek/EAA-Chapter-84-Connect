import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrackEngagement } from "@/hooks/useTrackEngagement";
import { useCurrentMember } from "@/lib/hangarTalk/api";
import { useIsOfficer } from "@/hooks/useIsOfficer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BriefingMasthead } from "@/components/briefing-room/BriefingMasthead";
import { BriefingItemCard } from "@/components/briefing-room/BriefingItemCard";
import { useArchiveItems, useSources, PAGE_SIZE, type ArchiveFilters } from "@/lib/briefingRoom/api";
import { BRIEFING_CATEGORIES, CATEGORY_LABEL, type BriefingCategory } from "@/lib/briefingRoom/types";

export default function BriefingRoomArchive() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  useTrackEngagement("service_page");
  const { data: me } = useCurrentMember();
  const { isOfficer } = useIsOfficer(me?.key_id);

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<ArchiveFilters>({ category: "all", source: "all" });
  const [page, setPage] = useState(0);

  const { data, isLoading } = useArchiveItems(filters, page);
  const { data: sources = [] } = useSources();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  function update(patch: Partial<ArchiveFilters>) {
    setPage(0);
    setFilters((f) => ({ ...f, ...patch }));
  }

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <BriefingMasthead active="archive" showReview={isOfficer || isAdmin} />

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ search: searchInput });
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search headlines and summaries…"
              className="pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            value={filters.category ?? "all"}
            onChange={(e) => update({ category: e.target.value as BriefingCategory | "all" })}
            className="min-h-[44px] rounded-md border border-border bg-background px-2 text-sm"
            aria-label="Category"
          >
            <option value="all">All categories</option>
            {BRIEFING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>

          <select
            value={filters.source ?? "all"}
            onChange={(e) => update({ source: e.target.value })}
            className="min-h-[44px] rounded-md border border-border bg-background px-2 text-sm"
            aria-label="Source"
          >
            <option value="all">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <Input
            type="date"
            aria-label="From date"
            value={filters.from ?? ""}
            onChange={(e) => update({ from: e.target.value || undefined })}
            className="w-auto"
          />
          <Input
            type="date"
            aria-label="To date"
            value={filters.to ?? ""}
            onChange={(e) => update({ to: e.target.value || undefined })}
            className="w-auto"
          />

          {(filters.search || filters.from || filters.to ||
            (filters.category && filters.category !== "all") ||
            (filters.source && filters.source !== "all")) && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearchInput("");
                setPage(0);
                setFilters({ category: "all", source: "all" });
              }}
            >
              Clear
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {isLoading ? "Loading…" : `${total} ${total === 1 ? "story" : "stories"}`}
        </p>

        <div className="space-y-3">
          {items.map((item) => (
            <BriefingItemCard key={item.id} item={item} showCollapsedImage={false} />
          ))}
          {!isLoading && items.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No stories match those filters.
            </div>
          )}
        </div>

        {items.length < total && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
              Load {Math.min(PAGE_SIZE, total - items.length)} more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
