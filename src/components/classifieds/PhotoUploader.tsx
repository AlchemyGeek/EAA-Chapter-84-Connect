import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { MAX_PHOTOS } from "@/lib/classifieds/types";
import { toast } from "sonner";

export interface ExistingPhoto {
  id: string;
  url: string;
}

interface Props {
  existingPhotos: ExistingPhoto[];
  keptPhotoIds: string[];
  onKeptChange: (ids: string[]) => void;
  newFiles: File[];
  onNewFilesChange: (files: File[]) => void;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

export function PhotoUploader({
  existingPhotos,
  keptPhotoIds,
  onKeptChange,
  newFiles,
  onNewFilesChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  const totalCount =
    keptPhotoIds.length + newFiles.length;
  const remaining = Math.max(0, MAX_PHOTOS - totalCount);

  const updatePreviews = useCallback((files: File[]) => {
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (!incoming.length) return;
      const room = MAX_PHOTOS - (keptPhotoIds.length + newFiles.length);
      if (room <= 0) {
        toast.error("Maximum of 4 photos allowed.");
        return;
      }
      if (incoming.length > room) {
        toast.error("Maximum of 4 photos allowed.");
      }
      const next = [...newFiles, ...incoming.slice(0, room)];
      onNewFilesChange(next);
      updatePreviews(next);
    },
    [newFiles, keptPhotoIds.length, onNewFilesChange, updatePreviews],
  );

  const removeNewAt = (idx: number) => {
    const next = newFiles.filter((_, i) => i !== idx);
    onNewFilesChange(next);
    updatePreviews(next);
  };

  const removeExisting = (id: string) => {
    onKeptChange(keptPhotoIds.filter((x) => x !== id));
  };

  const visibleExisting = existingPhotos.filter((p) => keptPhotoIds.includes(p.id));

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-8 text-center text-sm transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-border bg-muted/20"
        }`}
      >
        <ImageIcon className="h-6 w-6 text-muted-foreground" />
        <p className="text-muted-foreground">
          Drag & drop photos here, or
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={remaining === 0}
        >
          <Upload className="h-4 w-4" /> Choose photos
        </Button>
        <p className="text-xs text-muted-foreground">
          Up to {MAX_PHOTOS} photos. {remaining} remaining.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {(visibleExisting.length > 0 || newFiles.length > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {visibleExisting.map((p) => (
            <div
              key={p.id}
              className="relative aspect-square overflow-hidden rounded-md border bg-muted"
            >
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => removeExisting(p.id)}
                className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full border bg-background/90 text-foreground hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {newFiles.map((f, i) => (
            <div
              key={i + f.name}
              className="relative aspect-square overflow-hidden rounded-md border bg-muted"
            >
              <img
                src={previews[i] ?? URL.createObjectURL(f)}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => removeNewAt(i)}
                className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full border bg-background/90 text-foreground hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
