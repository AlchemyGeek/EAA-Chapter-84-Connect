import { Link } from "react-router-dom";
import { ChevronRight, Megaphone, Sparkles, UserPlus, Tag, MessageSquare, Quote } from "lucide-react";
import type { SquawkSlide as Slide, SquawkSlideKind } from "@/lib/squawk/types";
import { cn } from "@/lib/utils";

type KindStyle = {
  icon: typeof Megaphone;
  border: string;
  iconWrap: string;
  progress: string;
};

export const SQUAWK_KIND_PROGRESS: Record<SquawkSlideKind, string> = {
  announcement: "bg-amber-500",
  whats_new: "bg-violet-500",
  welcome: "bg-emerald-500",
  classifieds: "bg-blue-500",
  hangar_talk: "bg-sky-500",
  quote: "bg-slate-400",
};



const KIND_STYLES: Record<SquawkSlideKind, KindStyle> = {
  announcement: {
    icon: Megaphone,
    border: "border-l-amber-500",
    iconWrap: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  whats_new: {
    icon: Sparkles,
    border: "border-l-violet-500",
    iconWrap: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  },
  welcome: {
    icon: UserPlus,
    border: "border-l-emerald-500",
    iconWrap: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  classifieds: {
    icon: Tag,
    border: "border-l-blue-500",
    iconWrap: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  hangar_talk: {
    icon: MessageSquare,
    border: "border-l-sky-500",
    iconWrap: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  },
  quote: {
    icon: Quote,
    border: "border-l-slate-400",
    iconWrap: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
};

function Body({ slide }: { slide: Slide }) {
  const style = KIND_STYLES[slide.kind];
  const Icon = style.icon;
  return (
    <div
      className={cn(
        "flex min-h-[110px] items-start gap-3 border-l-4 p-4 sm:p-5",
        style.border,
      )}
    >
      <div className={cn("shrink-0 rounded-full p-2", style.iconWrap)}>
        <Icon className="h-4 w-4" />
      </div>
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
