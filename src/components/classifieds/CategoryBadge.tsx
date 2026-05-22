import { cn } from "@/lib/utils";
import { CATEGORY_BADGE_CLASS, CATEGORY_LABELS, type Category } from "@/lib/classifieds/types";

export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        CATEGORY_BADGE_CLASS[category],
        className,
      )}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}
