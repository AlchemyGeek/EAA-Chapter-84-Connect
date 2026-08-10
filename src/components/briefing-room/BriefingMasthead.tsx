import { Link } from "react-router-dom";
import { ArrowLeft, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RSS_FEED_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset"}.supabase.co/functions/v1/briefing-room-rss`;

export function BriefingMasthead({
  active,
  showReview,
}: {
  active: "front" | "archive" | "review";
  showReview?: boolean;
}) {
  return (
    <header className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/home">
          <Button variant="ghost" size="icon" aria-label="Back to home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 border-y-2 border-foreground py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            EAA Chapter 84
          </p>
          <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Briefing Room
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            Aviation &amp; homebuilding news for the chapter
          </p>
        </div>
      </div>

      <nav className="flex items-center gap-1 border-b border-border">
        <Tab to="/briefing-room" label="Front Page" active={active === "front"} />
        <Tab to="/briefing-room/archive" label="Archive" active={active === "archive"} />
        {showReview && (
          <Tab to="/briefing-room/review" label="Review Queue" active={active === "review"} />
        )}
      </nav>
    </header>
  );
}

function Tab({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "-mb-px flex min-h-[44px] items-center border-b-2 px-3 text-sm font-medium transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
