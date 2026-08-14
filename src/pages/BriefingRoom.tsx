import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTrackEngagement } from "@/hooks/useTrackEngagement";
import { useCurrentMember } from "@/lib/hangarTalk/api";
import { useIsOfficer } from "@/hooks/useIsOfficer";
import { usePublishedItems, markBriefingVisited, getBriefingLastVisit } from "@/lib/briefingRoom/api";
import { useEffect, useState } from "react";
import { BriefingMasthead } from "@/components/briefing-room/BriefingMasthead";
import { BriefingItemCard } from "@/components/briefing-room/BriefingItemCard";
import { Newspaper } from "lucide-react";

export default function BriefingRoom() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  useTrackEngagement("service_page");
  const { data: me } = useCurrentMember();
  const { isOfficer } = useIsOfficer(me?.key_id);
  const { data: items = [], isLoading } = usePublishedItems();
  const [lastVisit] = useState<string | null>(() => getBriefingLastVisit());

  useEffect(() => {
    markBriefingVisited();
  }, []);

  const isNewItem = (item: { published_at: string | null; added_at: string }) => {
    if (!lastVisit) return false;
    return new Date(item.published_at ?? item.added_at) > new Date(lastVisit);
  };

  if (!authLoading && !user) return <Navigate to="/auth" replace />;


  const [lead, ...rest] = items;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <BriefingMasthead active="front" showReview={isOfficer || isAdmin} />

        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Newspaper className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No stories published yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <BriefingItemCard item={lead} lead isNew={isNewItem(lead)} />
            {rest.length > 0 && (
              <>
                <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  More Recent Stories
                </p>
                <div className="space-y-3">
                  {rest.map((item) => (
                    <BriefingItemCard key={item.id} item={item} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
