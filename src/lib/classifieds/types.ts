export type Category =
  | "for-sale"
  | "wanted"
  | "hangar-space"
  | "services"
  | "training"
  | "expertise-help"
  | "free-giveaway"
  | "miscellaneous";

export type Tag =
  | "aircraft"
  | "engine"
  | "avionics"
  | "kit-build"
  | "tools"
  | "young-eagles"
  | "fabric-covering"
  | "sheet-metal"
  | "welding"
  | "books-manuals";

export type ListingStatus = "active" | "expired" | "hidden";

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: Category;
  tags: Tag[];
  photos: string[];
  status: ListingStatus;
  authorId: string;
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

export const TAG_LABELS: Record<Tag, string> = {
  aircraft: "Aircraft",
  engine: "Engine",
  avionics: "Avionics",
  "kit-build": "Kit Build",
  tools: "Tools",
  "young-eagles": "Young Eagles",
  "fabric-covering": "Fabric & Covering",
  "sheet-metal": "Sheet Metal",
  welding: "Welding",
  "books-manuals": "Books & Manuals",
};

export const TAG_OPTIONS: { value: Tag; label: string }[] = (
  Object.keys(TAG_LABELS) as Tag[]
).map((value) => ({ value, label: TAG_LABELS[value] }));

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
