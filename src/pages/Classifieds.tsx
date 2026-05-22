import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DisclaimerBar } from "@/components/classifieds/DisclaimerBar";
import { ClassifiedFilters } from "@/components/classifieds/ClassifiedFilters";
import { ClassifiedCard } from "@/components/classifieds/ClassifiedCard";
import { EmptyState } from "@/components/classifieds/EmptyState";
import { RenewDialog } from "@/components/classifieds/RenewDialog";
import { useClassifieds } from "@/lib/classifieds/store";
import { applyFilters, DEFAULT_FILTERS } from "@/lib/classifieds/filters";
import type { FilterState } from "@/lib/classifieds/filters";
import type { Listing } from "@/lib/classifieds/types";
import { RotateCcw } from "lucide-react";

type TabKey = "active" | "archived" | "mine";

export default function Classifieds() {
  const { user, isOfficerOrAbove } = useAuth();
  const { listings, renew } = useClassifieds();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as TabKey) || "active";
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [renewTarget, setRenewTarget] = useState<Listing | null>(null);

  // Resolve current member's key_id (used for "My Listings" / author detection)
  const { data: myMember } = useQuery({
    queryKey: ["my-member-classifieds", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id")
        .ilike("email", user!.email!)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const myKeyId = myMember?.key_id ? String(myMember.key_id) : null;

  const setTab = (next: TabKey) => {
    const np = new URLSearchParams(params);
    np.set("tab", next);
    setParams(np, { replace: true });
  };

  // Visibility: hide "hidden" listings from non-officers
  const visibleListings = useMemo(
    () => listings.filter((l) => isOfficerOrAbove || l.status !== "hidden"),
    [listings, isOfficerOrAbove],
  );

  const tabFiltered = useMemo(() => {
    if (tab === "active") {
      return visibleListings.filter((l) => l.status === "active" || l.status === "hidden");
      // hidden only included for officers (already filtered above)
    }
    if (tab === "archived") {
      return visibleListings.filter((l) => l.status === "expired");
    }
    return visibleListings.filter((l) => l.authorId === myKeyId);
  }, [visibleListings, tab, myKeyId]);

  const filtered = useMemo(() => applyFilters(tabFiltered, filters), [tabFiltered, filters]);

  const renderGrid = (items: Listing[], emptyMessage: string, showPost = false) => {
    if (items.length === 0) return <EmptyState message={emptyMessage} showPostButton={showPost} />;
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((l) => {
          const isMine = !!myKeyId && l.authorId === myKeyId;
          const trailing =
            tab === "archived" && isMine ? (
              <Button size="sm" variant="secondary" onClick={() => setRenewTarget(l)}>
                <RotateCcw className="h-4 w-4" /> Renew
              </Button>
            ) : tab === "mine" && l.status === "expired" ? (
              <Button size="sm" variant="secondary" onClick={() => setRenewTarget(l)}>
                <RotateCcw className="h-4 w-4" /> Renew
              </Button>
            ) : null;
          return (
            <ClassifiedCard
              key={l.id}
              listing={l}
              isMine={isMine}
              isOfficer={isOfficerOrAbove}
              trailing={trailing}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-3">
        <h1 className="text-2xl font-semibold">Classifieds</h1>
      </header>
      <DisclaimerBar />

      <div className="mt-6 space-y-5">
        <ClassifiedFilters
          value={filters}
          onChange={setFilters}
          onClear={() => setFilters(DEFAULT_FILTERS)}
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
            <TabsTrigger value="mine">My Listings</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {renderGrid(
              filtered,
              tabFiltered.length === 0
                ? "No active classifieds right now. Check back soon, or post your own!"
                : "No listings found. Try adjusting your filters.",
              tabFiltered.length === 0,
            )}
          </TabsContent>
          <TabsContent value="archived" className="mt-4">
            {renderGrid(
              filtered,
              tabFiltered.length === 0 ? "No archived listings." : "No listings found. Try adjusting your filters.",
            )}
          </TabsContent>
          <TabsContent value="mine" className="mt-4">
            {renderGrid(
              filtered,
              tabFiltered.length === 0
                ? "You haven't posted any listings yet."
                : "No listings found. Try adjusting your filters.",
              tabFiltered.length === 0,
            )}
          </TabsContent>
        </Tabs>
      </div>

      <RenewDialog
        open={!!renewTarget}
        onOpenChange={(v) => !v && setRenewTarget(null)}
        onConfirm={(months) => {
          if (renewTarget) renew(renewTarget.id, months);
          setRenewTarget(null);
        }}
      />
    </div>
  );
}
