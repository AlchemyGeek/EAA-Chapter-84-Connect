import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "./CategoryBadge";
import { TagBadges } from "./TagBadges";
import { expiresLabel, relativeTime } from "@/lib/classifieds/filters";
import type { Listing } from "@/lib/classifieds/types";
import { EyeOff } from "lucide-react";

interface Props {
  listing: Listing;
  isMine?: boolean;
  isOfficer?: boolean;
  trailing?: React.ReactNode; // extra actions e.g. Renew on Archived tab
}

export function ClassifiedCard({ listing, isMine, isOfficer, trailing }: Props) {
  const exp = expiresLabel(listing.expiresAt);
  const hasPhoto = listing.photos.length > 0;

  return (
    <Card className="flex flex-col overflow-hidden shadow-none">
      {hasPhoto && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          <img
            src={listing.photos[0]}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-medium leading-snug">{listing.title}</h3>
          <CategoryBadge category={listing.category} />
        </div>

        <TagBadges tags={listing.tags} max={3} />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>By {listing.authorName}</span>
          <span>•</span>
          <span>{relativeTime(listing.postedAt)}</span>
          <span>•</span>
          <span className={exp.expired ? "text-destructive font-medium" : ""}>{exp.text}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isMine && (
            <span className="inline-flex items-center rounded-full border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
              Your listing
            </span>
          )}
          {isOfficer && listing.status === "hidden" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
              <EyeOff className="h-3 w-3" /> Hidden
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/classifieds/${listing.id}`}>View listing</Link>
          </Button>
          {trailing}
        </div>
      </div>
    </Card>
  );
}
