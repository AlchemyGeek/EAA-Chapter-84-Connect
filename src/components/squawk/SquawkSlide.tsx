import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { SquawkSlide as Slide } from "@/lib/squawk/types";

function Body({ slide }: { slide: Slide }) {
  return (
    <div className="flex min-h-[110px] items-start gap-3 p-4 sm:p-5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          {slide.label}
        </p>
        <h3 className="text-base sm:text-lg font-semibold text-foreground leading-snug">
          {slide.title}
        </h3>
        {slide.body && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {slide.body}
          </p>
        )}
      </div>
      {(slide.href || slide.mailto) && (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
      )}
    </div>
  );
}

export function SquawkSlide({ slide }: { slide: Slide }) {
  if (slide.mailto) {
    return (
      <a href={slide.mailto} className="block hover:bg-muted/40 transition-colors">
        <Body slide={slide} />
      </a>
    );
  }
  if (slide.href) {
    if (/^https?:\/\//i.test(slide.href)) {
      return (
        <a
          href={slide.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover:bg-muted/40 transition-colors"
        >
          <Body slide={slide} />
        </a>
      );
    }
    return (
      <Link to={slide.href} className="block hover:bg-muted/40 transition-colors">
        <Body slide={slide} />
      </Link>
    );
  }
  return <Body slide={slide} />;
}
