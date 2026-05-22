import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DisclaimerBar } from "@/components/classifieds/DisclaimerBar";
import { ClassifiedFilters } from "@/components/classifieds/ClassifiedFilters";
import { ClassifiedCard } from "@/components/classifieds/ClassifiedCard";
import { EmptyState } from "@/components/classifieds/EmptyState";
import { RenewDialog } from "@/components/classifieds/RenewDialog";
import {
  useCurrentMember,
  useDeleteListing,
  useListings,
  useRenewListing,
} from "@/lib/classifieds/api";
import { applyFilters, DEFAULT_FILTERS, formatDate } from "@/lib/classifieds/filters";
import type { FilterState } from "@/lib/classifieds/filters";
import type { Listing } from "@/lib/classifieds/types";
import { Pencil, Plus, RotateCcw, Trash2, Eye } from "lucide-react";

type TabKey = "active" | "archived" | "mine";

export default function Classifieds() {
  const { isOfficerOrAbove } = useAuth();
  const { data: member } = useCurrentMember();
  const { data: listings = [], isLoading } = useListings();
  const renew = useRenewListing();
  const remove = useDeleteListing();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as TabKey) || "active";
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [renewTarget, setRenewTarget] = useState<Listing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);

  const myKeyId = member?.key_id ? String(member.key_id) : null;

  const setTab = (next: TabKey) => {
    const np = new URLSearchParams(params);
    np.set("tab", next);
    setParams(np, { replace: true });
  };

  const tabFiltered = useMemo(() => {
    if (tab === "active") {
      return listings.filter(
        (l) =>
          l.status === "active" || (isOfficerOrAbove && l.status === "hidden"),
      );
    }
    if (tab === "archived") {
      return listings.filter((l) => l.status === "expired");
    }
    return listings.filter((l) => l.authorId === myKeyId);
  }, [listings, tab, myKeyId, isOfficerOrAbove]);

  const filtered = useMemo(() => applyFilters(tabFiltered, filters), [tabFiltered, filters]);

  const handleRenew = async (months: 1 | 2 | 3) => {
    if (!renewTarget) return;
    try {
      const expires = await renew.mutateAsync({ id: renewTarget.id, months });
      toast.success(`Your listing has been renewed. It will expire on ${formatDate(expires.toISOString())}.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to renew listing");
    } finally {
      setRenewTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync({
        id: deleteTarget.id,
        photoPaths: deleteTarget.photoRows.map((p) => p.storagePath),
      });
      toast.success("Your listing has been deleted.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete listing");
    } finally {
      setDeleteTarget(null);
    }
  };

  const renderCardActions = (l: Listing) => {
    const isMine = !!myKeyId && l.authorId === myKeyId;
    const showOnMine = tab === "mine";
    const showOnArchived = tab === "archived" && isMine;
    const showOnHiddenForOfficer =
      isOfficerOrAbove && l.status === "hidden" && tab === "active";
    if (!showOnMine && !showOnArchived && !showOnHiddenForOfficer) return null;

    return (
      <div className="flex flex-wrap items-center gap-2">
        {(l.status === "expired" && (isMine || showOnArchived)) && (
          <Button size="sm" variant="secondary" onClick={() => setRenewTarget(l)}>
            <RotateCcw className="h-4 w-4" /> Renew
          </Button>
        )}
        {(isMine || isOfficerOrAbove) && (
          <Button asChild size="sm" variant="outline">
            <Link to={`/classifieds/${l.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
        )}
        {showOnHiddenForOfficer && (
          <Button asChild size="sm" variant="outline">
            <Link to={`/classifieds/${l.id}`}>
              <Eye className="h-4 w-4" /> View
            </Link>
          </Button>
        )}
        {(isMine || isOfficerOrAbove) && (
          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(l)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        )}
      </div>
    );
  };

  const renderGrid = (items: Listing[], emptyMessage: string, showPost = false) => {
    if (items.length === 0) return <EmptyState message={emptyMessage} showPostButton={showPost} />;
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((l) => {
          const isMine = !!myKeyId && l.authorId === myKeyId;
          return (
            <ClassifiedCard
              key={l.id}
              listing={l}
              isMine={isMine}
              isOfficer={isOfficerOrAbove}
              trailing={renderCardActions(l)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-3 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">Classifieds</h1>
        <Button asChild>
          <Link to="/classifieds/new">
            <Plus className="h-4 w-4" /> Post a Classified
          </Link>
        </Button>
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
            {isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : (
              renderGrid(
                filtered,
                tabFiltered.length === 0
                  ? "No active classifieds right now. Check back soon, or post your own!"
                  : "No listings found. Try adjusting your filters.",
                tabFiltered.length === 0,
              )
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
        onConfirm={handleRenew}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this listing? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
