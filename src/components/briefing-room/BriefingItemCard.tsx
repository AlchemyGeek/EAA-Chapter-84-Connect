import { useState } from "react";
import { ExternalLink, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_CLASS, CATEGORY_LABEL, displayDate, type BriefingItem } from "@/lib/briefingRoom/types";

export function CategoryChip({ category }: { category: BriefingItem["category"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        CATEGORY_CLASS[category],
      )}
    >
      {CATEGORY_LABEL[category]}
    </span>
  );
}

export function BriefingItemCard({
  item,
  lead = false,
}: {
  item: BriefingItem;
  lead?: boolean;
}) {
  const [open, setOpen] = useState(lead);
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!item.image_url && !imgFailed;

  return (
    <article
      className={cn(
        "rounded-lg border border-border bg-card",
        lead ? "p-5" : "p-4",
      )}
    >
      {lead && showImage && (
        <img
          src={item.image_url!}
          alt={item.headline}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="mb-4 aspect-video w-full rounded-md border border-border object-cover"
        />
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-3">
          {!lead && showImage && (
            <img
              src={item.image_url!}
              alt={item.headline}
              loading="lazy"
              onError={() => setImgFailed(true)}
              className="h-[88px] w-[88px] shrink-0 rounded-md border border-border object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <CategoryChip category={item.category} />
              <span className="text-xs text-muted-foreground">{item.source_name}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{displayDate(item)}</span>
            </div>
            <h3
              className={cn(
                "font-semibold leading-snug text-foreground",
                lead ? "text-xl sm:text-2xl" : "text-base",
              )}
            >
              {item.headline}
            </h3>
            <p
              className={cn(
                "mt-1.5 text-muted-foreground leading-relaxed",
                lead ? "text-base" : "text-sm",
                open ? "" : "line-clamp-2",
              )}
            >
              {item.summary}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
      </button>


      {open && (
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Read the full story at {item.source_name}
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </article>
  );
}
