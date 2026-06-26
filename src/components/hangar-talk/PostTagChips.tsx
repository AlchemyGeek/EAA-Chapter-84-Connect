import { useTags } from "@/lib/hangarTalk/api";

export function PostTagChips({
  tagIds,
  size = "sm",
}: {
  tagIds: string[];
  size?: "xs" | "sm";
}) {
  const { data: tags = [] } = useTags();
  if (!tagIds.length) return null;
  const labels = tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);
  if (!labels.length) return null;
  const cls =
    size === "xs"
      ? "text-[10px] px-1.5 py-0.5"
      : "text-xs px-2 py-0.5";
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((t) => (
        <span
          key={t.id}
          className={`inline-flex items-center rounded-full border border-border bg-muted text-foreground ${cls}`}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}
