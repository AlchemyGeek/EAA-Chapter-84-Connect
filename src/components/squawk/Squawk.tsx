import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useQuery } from "@tanstack/react-query";
import { buildSquawkSlides } from "@/lib/squawk/build";
import { SquawkSlide, SQUAWK_KIND_PROGRESS } from "./SquawkSlide";
import { cn } from "@/lib/utils";


const AUTO_ADVANCE_MS = 6000;
const TICK_MS = 50;

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
        if (next >= AUTO_ADVANCE_MS) {
          embla.scrollNext();
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [embla, slides.length]);

  if (!slides.length) return null;

  const progress = slides.length > 1 ? Math.min(100, (elapsed / AUTO_ADVANCE_MS) * 100) : 0;
  const activeSlide = slides[selected];
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
        {slides.length > 1 && (
          <div className="h-1 w-full bg-muted/40">
            <div
              className={cn("h-full transition-[width] ease-linear", progressColor)}
              style={{ width: `${progress}%`, transitionDuration: `${TICK_MS}ms` }}
            />
          </div>
        )}
      </div>
      {slides.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => embla?.scrollTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                selected === i
                  ? "w-4 bg-foreground/70"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

