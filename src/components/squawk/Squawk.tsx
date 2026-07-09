import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useQuery } from "@tanstack/react-query";
import { buildSquawkSlides } from "@/lib/squawk/build";
import { SquawkSlide, SQUAWK_KIND_PROGRESS } from "./SquawkSlide";
import { cn } from "@/lib/utils";


const MIN_MS = 7000;
const MAX_MS = 10000;
const TICK_MS = 50;

function durationFor(slide: { title: string; body?: string } | undefined): number {
  if (!slide) return MIN_MS;
  const chars = (slide.title?.length ?? 0) + (slide.body?.length ?? 0);
  // ~180 wpm reading ≈ 15 chars/sec. Add a small buffer per char above 60.
  const extra = Math.min(MAX_MS - MIN_MS, Math.max(0, (chars - 60) * 20));
  return Math.round(MIN_MS + extra);
}

export function Squawk() {
  const [seed] = useState(() => Date.now());
  const { data: slides = [] } = useQuery({
    queryKey: ["squawk", seed],
    queryFn: buildSquawkSlides,
    staleTime: Infinity,
  });

  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "start" });
  const [selected, setSelected] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const pausedRef = useRef(false);

  const activeSlide = slides[selected];
  const activeDuration = durationFor(activeSlide);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => {
      setSelected(embla.selectedScrollSnap());
      setElapsed(0);
    };
    embla.on("select", onSelect);
    onSelect();
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla]);

  useEffect(() => {
    if (!embla || slides.length < 2) return;
    const id = setInterval(() => {
      if (pausedRef.current || document.visibilityState !== "visible") return;
      setElapsed((prev) => {
        const next = prev + TICK_MS;
        if (next >= activeDuration) {
          embla.scrollNext();
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [embla, slides.length, activeDuration]);

  if (!slides.length) return null;

  const progress = slides.length > 1 ? Math.min(100, (elapsed / activeDuration) * 100) : 0;
  const progressColor = activeSlide ? SQUAWK_KIND_PROGRESS[activeSlide.kind] : "bg-primary";


  return (
    <div
      className="relative"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      <div className="overflow-hidden rounded-lg border border-border bg-card" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide) => (
            <div key={slide.key} className="min-w-0 flex-[0_0_100%]">
              <SquawkSlide slide={slide} />
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => embla?.scrollTo(i)}
              className="flex h-6 min-h-0 w-6 items-center justify-center p-0"
              style={{ minWidth: 0, minHeight: 0 }}
            >
              <span
                className={cn(
                  "block rounded-full transition-all",
                  selected === i
                    ? "h-2 w-5 bg-slate-700 dark:bg-slate-200"
                    : "h-2 w-2 bg-slate-300 dark:bg-slate-600",
                )}
              />
            </button>
          ))}
        </div>
      )}


    </div>
  );
}

