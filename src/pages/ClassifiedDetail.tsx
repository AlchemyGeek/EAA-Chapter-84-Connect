import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, AlertTriangle, EyeOff } from "lucide-react";
import { CategoryBadge } from "@/components/classifieds/CategoryBadge";
import { TagBadges } from "@/components/classifieds/TagBadges";
import { PhotoGallery } from "@/components/classifieds/PhotoGallery";
import { ContactCard } from "@/components/classifieds/ContactCard";
import { DisclaimerCallout } from "@/components/classifieds/DisclaimerCallout";
import { OfficerToolbar } from "@/components/classifieds/OfficerToolbar";
import { RenewDialog } from "@/components/classifieds/RenewDialog";
import { useClassifieds } from "@/lib/classifieds/store";
import { formatDate, relativeTime } from "@/lib/classifieds/filters";

export default function ClassifiedDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isOfficerOrAbove } = useAuth();
  const { getById, toggleHidden, remove, renew } = useClassifieds();
  const [renewOpen, setRenewOpen] = useState(false);

  const listing = id ? getById(id) : undefined;

  const { data: myMember } = useQuery({
    queryKey: ["my-member-classified-detail", user?.email],
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

  const isMine = !!myKeyId && listing.authorId === myKeyId;
  const isExpired = listing.status === "expired";
  const isHidden = listing.status === "hidden";
  const canSeeHidden = isOfficerOrAbove;

  if (isHidden && !canSeeHidden) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Link to="/classifieds" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Classifieds
        </Link>
        <div className="mt-8 rounded-md border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          This listing is not available.
        </div>
      </div>
    );
  }

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

      {isHidden && canSeeHidden && (
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

          {isMine && isExpired && (
            <Button className="w-full" onClick={() => setRenewOpen(true)}>
              <RotateCcw className="h-4 w-4" /> Renew listing
            </Button>
          )}

          {isOfficerOrAbove && (
            <OfficerToolbar
              listing={listing}
              onDelete={() => {
                remove(listing.id);
                navigate("/classifieds");
              }}
              onToggleHidden={() => toggleHidden(listing.id)}
            />
          )}
        </aside>
      </div>

      <RenewDialog
        open={renewOpen}
        onOpenChange={setRenewOpen}
        onConfirm={(months) => renew(listing.id, months)}
      />
    </div>
  );
}
