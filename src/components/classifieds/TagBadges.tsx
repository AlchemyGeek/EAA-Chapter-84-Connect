import type { Tag } from "@/lib/classifieds/types";

export function TagBadges({ tags, max }: { tags: Tag[]; max?: number }) {
  if (!tags.length) return null;
  const limit = max ?? tags.length;
  const shown = tags.slice(0, limit);
  const overflow = tags.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((t) => (
        <span
          key={t}
          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        >
          {t}
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          +{overflow} more
        </span>
      )}
    </div>
  );
}
