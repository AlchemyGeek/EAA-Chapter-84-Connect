import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useQuery } from "@tanstack/react-query";
import { buildSquawkSlides } from "@/lib/squawk/build";
import { SquawkSlide } from "./SquawkSlide";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_MS = 6000;

export function Squawk() {
  // Fresh selection on every mount (per spec: refreshes on every homepage load).
  const [seed] = useState(() => Date.now());
  const { data: slides = [] } = useQuery({
    queryKey: ["squawk", seed],
    queryFn: buildSquawkSlides,
    staleTime: Infinity,
  });

  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "start" });
  const [selected, setSelected] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    onSelect();
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla]);

  useEffect(() => {
    if (!embla || slides.length < 2) return;
    const id = setInterval(() => {
      if (!pausedRef.current && document.visibilityState === "visible") {
        embla.scrollNext();
      }
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [embla, slides.length]);

  if (!slides.length) return null;

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
        <div className="mt-2 flex justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => embla?.scrollTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                selected === i ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
