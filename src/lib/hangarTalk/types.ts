export const HANGAR_TALK_BUCKET = "hangar-talk";

export type PostType = "question" | "help_wanted" | "fyi";

export const POST_TYPE_LABEL: Record<PostType, string> = {
  question: "Question",
  help_wanted: "Help Wanted",
  fyi: "FYI",
};

export interface AuthorRef {
  key_id: number;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
}

export interface PostImage {
  id: string;
  storage_path: string;
  signed_url: string | null;
  position: number;
}

export interface Reply {
  id: string;
  post_id: string;
  author_key_id: number;
  author: AuthorRef | null;
  body: string;
  image_storage_path: string | null;
  image_signed_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  type: PostType;
  title: string;
  body: string;
  author_key_id: number;
  author: AuthorRef | null;
  resolved_at: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  images: PostImage[];
  reply_count: number;
  tag_ids: string[];
}

export type FeedSection = "fresh" | "active" | "resolved";

export function authorDisplayName(a: AuthorRef | null | undefined): string {
  if (!a) return "Unknown member";
  const nick = a.nickname?.trim();
  const first = a.first_name?.trim() ?? "";
  const last = a.last_name?.trim() ?? "";
  if (nick) return `${first} (${nick}) ${last}`.trim();
  return `${first} ${last}`.trim() || "Unknown member";
}

export function postSection(post: Post): FeedSection {
  if (post.resolved_at) return "resolved";
  if (post.reply_count > 0) return "active";
  return "fresh";
}

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
export function isStale(post: Post): boolean {
  return Date.now() - new Date(post.last_activity_at).getTime() > FOURTEEN_DAYS_MS;
}

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}
