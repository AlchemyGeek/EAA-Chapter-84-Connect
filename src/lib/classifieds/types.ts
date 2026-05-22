export type Category =
  | "for-sale"
  | "wanted"
  | "hangar-space"
  | "services"
  | "training"
  | "expertise-help"
  | "free-giveaway"
  | "miscellaneous";

/** Tags are now user-defined free-form strings (stored capitalized). */
export type Tag = string;

export type ListingStatus = "active" | "expired" | "hidden";

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: Category;
  tags: Tag[];
  /** Price in USD. Only meaningful for "for-sale" listings. */
  price: number | null;
  /** External links (URLs). */
  links: string[];
  /** Resolved signed URLs for display. */
  photos: string[];
  /** Raw storage paths, used by editor and gallery management. */
  photoRows: { id: string; storagePath: string; url: string }[];
  /** Derived display status (hidden > expired > active). */
  status: ListingStatus;
  /** Raw DB status — distinguishes "hidden" from time-based "expired". */
  dbStatus: "active" | "expired" | "hidden";
  authorId: string; // string-cast key_id
  authorKeyId: number;
  authorName: string;
  authorEmail: string;
  authorPhone: string | null;
  authorPhoneVisible: boolean;
  postedAt: string;
  expiresAt: string;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  "for-sale": "For Sale",
  wanted: "Wanted",
  "hangar-space": "Hangar / Space",
  services: "Services",
  training: "Training",
  "expertise-help": "Expertise / Help Wanted",
  "free-giveaway": "Free / Giveaway",
  miscellaneous: "Miscellaneous",
};

export const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "for-sale", label: "For Sale" },
  { value: "wanted", label: "Wanted" },
  { value: "hangar-space", label: "Hangar / Space" },
  { value: "services", label: "Services" },
  { value: "training", label: "Training" },
  { value: "expertise-help", label: "Expertise / Help Wanted" },
  { value: "free-giveaway", label: "Free / Giveaway" },
  { value: "miscellaneous", label: "Miscellaneous" },
];

export const CATEGORY_BADGE_CLASS: Record<Category, string> = {
  "for-sale": "bg-[hsl(var(--category-for-sale))] text-white",
  wanted: "bg-[hsl(var(--category-wanted))] text-white",
  "hangar-space": "bg-[hsl(var(--category-hangar))] text-white",
  services: "bg-[hsl(var(--category-services))] text-white",
  training: "bg-[hsl(var(--category-training))] text-white",
  "expertise-help": "bg-[hsl(var(--category-expertise))] text-white",
  "free-giveaway": "bg-[hsl(var(--category-free))] text-white",
  miscellaneous: "bg-[hsl(var(--category-misc))] text-white",
};

export const DISCLAIMER_FULL =
  "EAA Chapter 84 does not endorse the safety, quality or airworthiness of any parts, products, aircraft or services listed in the Classifieds. The safety, quality or airworthiness of any parts, products, aircraft or services listed are the sole responsibility of the seller and the buyer.";

export const DISCLAIMER_SHORT =
  "EAA Chapter 84 does not endorse the safety, quality, or airworthiness of any listing.";

export const MAX_PHOTOS = 4;
export const MAX_LINKS = 5;
export const STORAGE_BUCKET = "classifieds";

/** Capitalize each whitespace-separated word, preserving hyphens/slashes. */
export function normalizeTag(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) =>
      w
        .split(/([-/])/)
        .map((p) =>
          p === "-" || p === "/"
            ? p
            : p.length === 0
              ? p
              : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(),
        )
        .join(""),
    )
    .join(" ");
}

export function formatPrice(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value === 0) return "Free";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}
