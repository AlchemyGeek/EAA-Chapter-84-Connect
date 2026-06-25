import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { usePosts, useCurrentMember, markHangarTalkVisited } from "@/lib/hangarTalk/api";
import { useWithViewAs } from "@/lib/hangarTalk/viewAs";
import { useAuth } from "@/hooks/useAuth";
import { PostCard } from "@/components/hangar-talk/PostCard";
import { PostRow } from "@/components/hangar-talk/PostRow";
import { FeedToggle, type FeedView } from "@/components/hangar-talk/FeedToggle";
import { EmptyState } from "@/components/hangar-talk/EmptyState";
import { postSection, type Post } from "@/lib/hangarTalk/types";

const STORAGE_KEY = "ht-view-pref";

export default function HangarTalk() {
  const { data: posts = [], isLoading } = usePosts();
  const { data: me } = useCurrentMember();
  const navigate = useNavigate();
  const withViewAs = useWithViewAs();
  const [view, setView] = useState<FeedView>(
    () => (localStorage.getItem(STORAGE_KEY) as FeedView) || "cards",
  );
  const [query, setQuery] = useState("");

  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, view);
  }, [view]);

  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    markHangarTalkVisited(uid);
    qc.invalidateQueries({ queryKey: ["ht-unread-count"] });
    return () => {
      // Mark visited again on unmount so returning to Home shows 0.
      markHangarTalkVisited(uid);
      qc.invalidateQueries({ queryKey: ["ht-unread-count"] });
    };
  }, [user?.id, qc]);

  const isActive = me?.current_standing === "Active";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q),
    );
  }, [posts, query]);

  const grouped = useMemo(() => {
    const fresh: Post[] = [];
    const active: Post[] = [];
    const resolved: Post[] = [];
    for (const p of filtered) {
      const s = postSection(p);
      if (s === "fresh") fresh.push(p);
      else if (s === "active") active.push(p);
      else resolved.push(p);
    }
    fresh.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    active.sort(
      (a, b) => +new Date(b.last_activity_at) - +new Date(a.last_activity_at),
    );
    resolved.sort(
      (a, b) =>
        +new Date(b.resolved_at ?? b.last_activity_at) -
        +new Date(a.resolved_at ?? a.last_activity_at),
    );
    return { fresh, active, resolved };
  }, [filtered]);

  function renderItems(items: Post[]) {
    if (view === "list") {
      return (
        <div className="rounded-md border border-border overflow-hidden bg-background">
          {items.map((p) => (
            <PostRow key={p.id} post={p} />
          ))}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-2 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="min-h-[44px] min-w-[44px]">
          <Link to={withViewAs("/home")}><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold flex-1">Hangar Talk</h1>
        <Button
          disabled={!isActive}
          onClick={() => navigate(withViewAs("/hangar-talk/new"))}
          className="min-h-[44px]"
          title={isActive ? "Create a new post" : "Active membership required to post"}
        >
          <Plus className="h-4 w-4" />
          New Post
        </Button>
      </header>

      <p className="mb-6 text-[15px] leading-relaxed text-muted-foreground/80">
        Hangar Talk is your chapter community feed — ask questions, request help, and share what's happening with fellow EAA Chapter 84 members. Simple to post, easy to respond, all in one place.
      </p>

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts…"
            className="pl-9"
          />
        </div>
        <FeedToggle value={view} onChange={setView} />
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          message="Ask a question, share an update, or request help — start the conversation."
          showPost={isActive}
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matches" message="Try a different search term." />
      ) : (
        <div className="space-y-6">
          {(["fresh", "active", "resolved"] as const).map((sec) => {
            const items = grouped[sec];
            if (!items.length) return null;
            const label =
              sec === "fresh" ? "Fresh" : sec === "active" ? "Active" : "Resolved";
            return (
              <section key={sec} className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label} <span className="ml-1 text-muted-foreground/60">({items.length})</span>
                </h2>
                {renderItems(items)}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
