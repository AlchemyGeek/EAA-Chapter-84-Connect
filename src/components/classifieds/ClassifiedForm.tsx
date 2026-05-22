import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoUploader, type ExistingPhoto } from "./PhotoUploader";
import {
  CATEGORY_OPTIONS,
  TAG_OPTIONS,
  type Category,
  type Tag,
} from "@/lib/classifieds/types";
import type { ListingFormValues } from "@/lib/classifieds/api";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Max 100 characters"),
  description: z.string().trim().min(20, "Description must be at least 20 characters"),
  category: z.string().min(1, "Category is required"),
});

interface Props {
  mode: "create" | "edit";
  initial?: {
    title: string;
    description: string;
    category: Category;
    tags: Tag[];
    existingPhotos: ExistingPhoto[];
  };
  submitting?: boolean;
  onSubmit: (values: ListingFormValues) => void | Promise<void>;
  onCancel?: () => void;
  cancelHref?: string;
  /** Slot rendered above the submit row (e.g. officer note + hide toggle). */
  preSubmitSlot?: React.ReactNode;
  /** Slot rendered below the form (e.g. danger zone). */
  belowSlot?: React.ReactNode;
}

function addMonths(date: Date, m: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + m);
  return d;
}

export function ClassifiedForm({
  mode,
  initial,
  submitting,
  onSubmit,
  onCancel,
  cancelHref,
  preSubmitSlot,
  belowSlot,
}: Props) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<Category | "">(initial?.category ?? "");
  const [tags, setTags] = useState<Tag[]>(initial?.tags ?? []);
  const [keptPhotoIds, setKeptPhotoIds] = useState<string[]>(
    initial?.existingPhotos.map((p) => p.id) ?? [],
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [duration, setDuration] = useState<1 | 2 | 3>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description);
      setCategory(initial.category);
      setTags(initial.tags);
      setKeptPhotoIds(initial.existingPhotos.map((p) => p.id));
    }
  }, [initial]);

  const expirationPreview = useMemo(
    () =>
      addMonths(new Date(), duration).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [duration],
  );

  const toggleTag = (t: Tag) => {
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse({ title, description, category });
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errs[issue.path[0] as string] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    onSubmit({
      title,
      description,
      category: category as Category,
      tags,
      keptPhotoIds,
      newPhotos: newFiles,
      durationMonths: mode === "create" ? duration : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          maxLength={100}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Lycoming O-320 cylinders"
          aria-invalid={!!errors.title}
        />
        <div className="flex items-center justify-between text-xs">
          <span className={errors.title ? "text-destructive" : "text-muted-foreground"}>
            {errors.title ?? " "}
          </span>
          <span className="text-muted-foreground">{title.length}/100</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          Category <span className="text-destructive">*</span>
        </Label>
        <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
          <SelectTrigger aria-invalid={!!errors.category}>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-xs text-destructive">{errors.category}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map((o) => {
            const active = tags.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggleTag(o.value)}
                className={`min-h-[36px] rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          placeholder="Provide details about your listing…"
          aria-invalid={!!errors.description}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Photos</Label>
        <PhotoUploader
          existingPhotos={initial?.existingPhotos ?? []}
          keptPhotoIds={keptPhotoIds}
          onKeptChange={setKeptPhotoIds}
          newFiles={newFiles}
          onNewFilesChange={setNewFiles}
        />
      </div>

      {mode === "create" && (
        <div className="space-y-2">
          <Label>
            Duration <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDuration(m as 1 | 2 | 3)}
                className={`min-h-[44px] rounded-md border px-3 py-2 text-sm transition-colors ${
                  duration === m
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                {m} month{m === 1 ? "" : "s"}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Your listing will expire on <strong>{expirationPreview}</strong>.
          </p>
        </div>
      )}

      {preSubmitSlot}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={submitting}>
          {mode === "create" ? "Post Listing" : "Save Changes"}
        </Button>
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          onClick={() => (onCancel ? onCancel() : navigate(cancelHref ?? "/classifieds"))}
        >
          Cancel
        </button>
      </div>

      {belowSlot}
    </form>
  );
}
