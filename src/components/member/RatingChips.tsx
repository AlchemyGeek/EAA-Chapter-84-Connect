import { splitRatings } from "@/lib/qualifications";

export function RatingChips({ value }: { value: string | null | undefined }) {
  const items = splitRatings(value);
  if (items.length === 0) return <span>—</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span key={t} className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-sm font-medium text-foreground">
          {t}
        </span>
      ))}
    </span>
  );
}
