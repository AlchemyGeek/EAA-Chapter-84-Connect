import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ClassifiedForm } from "@/components/classifieds/ClassifiedForm";
import { useAuth } from "@/hooks/useAuth";
import {
  useCurrentMember,
  useDeleteListing,
  useListing,
  useToggleHidden,
  useUpdateListing,
} from "@/lib/classifieds/api";

export default function ClassifiedEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isOfficerOrAbove } = useAuth();
  const { data: member } = useCurrentMember();
  const { data: listing, isLoading } = useListing(id);
  const update = useUpdateListing();
  const remove = useDeleteListing();
  const toggleHidden = useToggleHidden();

  const isAuthor = !!member && !!listing && member.key_id === listing.authorKeyId;
  const canEdit = isAuthor || isOfficerOrAbove;

  useEffect(() => {
    if (!isLoading && listing && !canEdit) {
      navigate(`/classifieds/${listing.id}`, { replace: true });
    }
  }, [isLoading, listing, canEdit, navigate]);

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
          Listing not found.
        </div>
      </div>
    );
  }

  if (!canEdit) return null;

  const existingPhotos = listing.photoRows.map((p) => ({ id: p.id, url: p.url }));
  const isHidden = listing.dbStatus === "hidden";
  const showOfficerNote = isOfficerOrAbove && !isAuthor;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <Link
        to={`/classifieds/${listing.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to listing
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Edit Listing</h1>

      {showOfficerNote && (
        <div className="mt-4 rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          You are editing a listing posted by <strong>{listing.authorName}</strong>. Changes are immediate.
        </div>
      )}

      <div className="mt-5">
        <ClassifiedForm
          mode="edit"
          initial={{
            title: listing.title,
            description: listing.description,
            category: listing.category,
            tags: listing.tags,
            price: listing.price,
            links: listing.links,
            existingPhotos,
          }}
          submitting={update.isPending}
          cancelHref={`/classifieds/${listing.id}`}
          onSubmit={async (values) => {
            try {
              await update.mutateAsync({
                id: listing.id,
                values,
                authorKeyId: listing.authorKeyId,
                existingPhotos: listing.photoRows.map((p) => ({
                  id: p.id,
                  storagePath: p.storagePath,
                })),
              });
              toast.success("Your listing has been updated.");
              navigate(`/classifieds/${listing.id}`);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Failed to update listing";
              toast.error(msg);
            }
          }}
          preSubmitSlot={
            isOfficerOrAbove ? (
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Moderation
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
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
                  }}
                >
                  {isHidden ? (
                    <>
                      <Eye className="h-4 w-4" /> Unhide listing
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4" /> Hide listing
                    </>
                  )}
                </Button>
              </div>
            ) : null
          }
          belowSlot={
            <div className="mt-8 border-t pt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-destructive">
                Danger zone
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">
                    <Trash2 className="h-4 w-4" /> Delete this listing
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this listing? This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        try {
                          await remove.mutateAsync({
                            id: listing.id,
                            photoPaths: listing.photoRows.map((p) => p.storagePath),
                          });
                          toast.success("Your listing has been deleted.");
                          navigate("/classifieds");
                        } catch (err: unknown) {
                          const msg = err instanceof Error ? err.message : "Failed to delete";
                          toast.error(msg);
                        }
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          }
        />
      </div>
    </div>
  );
}
