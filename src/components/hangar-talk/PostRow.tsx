import { Link } from "react-router-dom";
import { TypeBadge } from "./TypeBadge";
import { isStale, timeAgo, type Post } from "@/lib/hangarTalk/types";
import { MessageSquare, CheckCircle2 } from "lucide-react";

export function PostRow({ post }: { post: Post }) {
  const stale = isStale(post) && !post.resolved_at;
  return (
    <Link
      to={`/hangar-talk/${post.id}`}
      className={`flex items-center gap-3 px-3 py-3 min-h-[44px] border-b border-border hover:bg-muted/40 transition-colors ${
        stale ? "opacity-60 hover:opacity-100" : ""
      }`}
    >
      <TypeBadge type={post.type} className="shrink-0" />
      <span className="flex-1 truncate text-sm font-medium">{post.title}</span>
      {post.resolved_at && (
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
      )}
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <MessageSquare className="h-3 w-3" />
        {post.reply_count}
      </span>
      <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
        {timeAgo(post.last_activity_at)}
      </span>
    </Link>
  );
}
