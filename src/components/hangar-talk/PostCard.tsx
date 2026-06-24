import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { TypeBadge } from "./TypeBadge";
import { PostTagChips } from "./PostTagChips";
import { authorDisplayName, isStale, timeAgo, type Post } from "@/lib/hangarTalk/types";
import { useWithViewAs } from "@/lib/hangarTalk/viewAs";
import { useSubscribedPostIds } from "@/lib/hangarTalk/subscriptions";
import { Bell, MessageSquare, CheckCircle2 } from "lucide-react";

export function PostCard({ post }: { post: Post }) {
  const stale = isStale(post) && !post.resolved_at;
  const thumb = post.images[0]?.signed_url;
  const withViewAs = useWithViewAs();
  return (
    <Link
      to={withViewAs(`/hangar-talk/${post.id}`)}
      className={`block transition-opacity ${stale ? "opacity-60 hover:opacity-100" : ""}`}
    >
      <Card className="p-4 hover:bg-muted/40 transition-colors">
        <div className="flex items-start gap-3">
          {thumb && (
            <img
              src={thumb}
              alt=""
              className="h-16 w-16 rounded-md object-cover border border-border shrink-0"
            />
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <TypeBadge type={post.type} />
              {post.resolved_at && (
                <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  Resolved
                </span>
              )}
            </div>
            <h3 className="font-semibold leading-tight">{post.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
              {post.body}
            </p>
            {post.tag_ids.length > 0 && <PostTagChips tagIds={post.tag_ids} size="xs" />}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <span className="truncate">{authorDisplayName(post.author)}</span>
              <span>·</span>
              <span>{timeAgo(post.last_activity_at)}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {post.reply_count}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
