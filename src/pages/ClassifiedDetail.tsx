import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, AlertTriangle, EyeOff, Pencil } from "lucide-react";
import { CategoryBadge } from "@/components/classifieds/CategoryBadge";
import { TagBadges } from "@/components/classifieds/TagBadges";
import { PhotoGallery } from "@/components/classifieds/PhotoGallery";
import { ContactCard } from "@/components/classifieds/ContactCard";
import { DisclaimerCallout } from "@/components/classifieds/DisclaimerCallout";
import { OfficerToolbar } from "@/components/classifieds/OfficerToolbar";
import { RenewDialog } from "@/components/classifieds/RenewDialog";
import {
  useCurrentMember,
  useDeleteListing,
  useListing,
  useRenewListing,
  useToggleHidden,
} from "@/lib/classifieds/api";
import { formatDate, relativeTime } from "@/lib/classifieds/filters";

export default function ClassifiedDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isOfficerOrAbove } = useAuth();
  const { data: member } = useCurrentMember();
  const { data: listing, isLoading } = useListing(id);
  const remove = useDeleteListing();
  const renew = useRenewListing();
  const toggleHidden = useToggleHidden();
  const [renewOpen, setRenewOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Link to="/classifieds" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Classifieds
        </Link>
        <div className="mt-8 rounded-md border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Listing not found or no longer available.
        </div>
      </div>
    );
  }

  const isMine = !!member && member.key_id === listing.authorKeyId;
  const isExpired = listing.status === "expired";
  const isHidden = listing.dbStatus === "hidden";
  const canEdit = isMine || isOfficerOrAbove;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <Link to="/classifieds" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Classifieds
      </Link>

      {isExpired && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">This listing has expired.</span>
          {isMine && (
            <Button size="sm" onClick={() => setRenewOpen(true)}>
              <RotateCcw className="h-4 w-4" /> Renew listing
            </Button>
          )}
        </div>
      )}

      {isHidden && isOfficerOrAbove && (
        <div className="mt-4 flex items-center gap-2 rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <EyeOff className="h-4 w-4 shrink-0" />
          This listing is hidden from members. Only officers and admins can see it.
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article className="space-y-5 lg:col-span-2">
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{listing.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={listing.category} />
              <TagBadges tags={listing.tags} />
            </div>
          </div>

          {listing.photos.length > 0 && <PhotoGallery photos={listing.photos} alt={listing.title} />}

          <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
            {listing.description}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
            <span>Posted by {listing.authorName}</span>
            <span>•</span>
            <span>{relativeTime(listing.postedAt)} ({formatDate(listing.postedAt)})</span>
            <span>•</span>
            <span>{isExpired ? `Expired ${formatDate(listing.expiresAt)}` : `Expires ${formatDate(listing.expiresAt)}`}</span>
          </div>

          <DisclaimerCallout />
        </article>

        <aside className="space-y-4">
          <ContactCard listing={listing} />

          {canEdit && (
            <Button asChild variant="outline" className="w-full">
              <Link to={`/classifieds/${listing.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit listing
              </Link>
            </Button>
          )}

          {isMine && isExpired && (
            <Button className="w-full" onClick={() => setRenewOpen(true)}>
              <RotateCcw className="h-4 w-4" /> Renew listing
            </Button>
          )}

          {isOfficerOrAbove && (
            <OfficerToolbar
              listing={listing}
              onDelete={async () => {
                try {
                  await remove.mutateAsync({
                    id: listing.id,
                    photoPaths: listing.photoRows.map((p) => p.storagePath),
                  });
                  toast.success("Your listing has been deleted.");
                  navigate("/classifieds");
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : "Failed to delete");
                }
              }}
              onToggleHidden={async () => {
                try {
                  const next = await toggleHidden.mutateAsync({
                    id: listing.id,
                    currentDbStatus: listing.dbStatus,
                    expiresAt: listing.expiresAt,
                  });
                  if (next === "hidden") {
                    toast.success("Listing hidden. It is no longer visible to members.");
                  } else {
                    toast.success("Listing restored. It is now visible to members.");
                  }
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : "Failed to update");
                }
              }}
            />
          )}
        </aside>
      </div>

      <RenewDialog
        open={renewOpen}
        onOpenChange={setRenewOpen}
        onConfirm={async (months) => {
          try {
            const expires = await renew.mutateAsync({ id: listing.id, months });
            toast.success(`Your listing has been renewed. It will expire on ${formatDate(expires.toISOString())}.`);
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to renew");
          }
        }}
      />
    </div>
  );
}
