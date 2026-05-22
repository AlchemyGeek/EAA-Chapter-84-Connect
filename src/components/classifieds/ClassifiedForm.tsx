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
import { TagInput } from "./TagInput";
import { LinksInput } from "./LinksInput";
import {
  CATEGORY_OPTIONS,
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
    price: number | null;
    links: string[];
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
  const [priceInput, setPriceInput] = useState<string>(
    initial?.price !== undefined && initial?.price !== null
      ? String(initial.price)
      : "",
  );
  const [links, setLinks] = useState<string[]>(initial?.links ?? []);
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
      setPriceInput(
        initial.price !== null && initial.price !== undefined
          ? String(initial.price)
          : "",
      );
      setLinks(initial.links);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse({ title, description, category });
    const errs: Record<string, string> = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        errs[issue.path[0] as string] = issue.message;
      }
    }
    let parsedPrice: number | null = null;
    if (category === "for-sale") {
      const trimmed = priceInput.trim();
      if (trimmed === "") {
        errs.price = "Price is required for For Sale listings.";
      } else {
        const num = Number(trimmed.replace(/[^0-9.]/g, ""));
        if (Number.isNaN(num) || num < 0) {
          errs.price = "Enter a valid non-negative price.";
        } else {
          parsedPrice = Math.round(num * 100) / 100;
        }
      }
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onSubmit({
      title,
      description,
      category: category as Category,
      tags,
      price: parsedPrice,
      links,
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

      {category === "for-sale" && (
        <div className="space-y-2">
          <Label htmlFor="price">
            Price (USD) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="price"
              type="text"
              inputMode="decimal"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="0.00"
              className="pl-7"
              aria-invalid={!!errors.price}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enter <strong>0</strong> to mark as free or open to offers.
          </p>
          {errors.price && (
            <p className="text-xs text-destructive">{errors.price}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Tags</Label>
        <TagInput value={tags} onChange={setTags} />
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
        <Label>Links</Label>
        <LinksInput value={links} onChange={setLinks} />
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
