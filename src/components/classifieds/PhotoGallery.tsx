import { useState } from "react";

export function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (!photos.length) return null;
  const visibleThumbs = photos.slice(0, 4);
  return (
    <div className="space-y-3">
      <div className="aspect-[16/10] w-full overflow-hidden rounded-md border bg-muted">
        <img src={photos[active]} alt={alt} className="h-full w-full object-cover" />
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2">
          {visibleThumbs.map((p, i) => (
            <button
              key={p + i}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-20 overflow-hidden rounded border transition-opacity ${
                active === i ? "border-primary" : "border-border opacity-70 hover:opacity-100"
              }`}
            >
              <img src={p} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
