export type BriefingCategory =
  | "homebuilding"
  | "safety_regulatory"
  | "industry_news"
  | "events_airshows"
  | "eaa";

export type BriefingStatus = "pending_review" | "published" | "rejected" | "archived";

export const BRIEFING_CATEGORIES: BriefingCategory[] = [
  "homebuilding",
  "safety_regulatory",
  "industry_news",
  "events_airshows",
  "eaa",
];

export const CATEGORY_LABEL: Record<BriefingCategory, string> = {
  homebuilding: "Homebuilding",
  safety_regulatory: "Safety & Regulatory",
  industry_news: "Industry News",
  events_airshows: "Events & Airshows",
  eaa: "EAA",
};

export const CATEGORY_CLASS: Record<BriefingCategory, string> = {
  homebuilding: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  safety_regulatory: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  industry_news: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  events_airshows: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  eaa: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
};

export interface BriefingItem {
  id: string;
  headline: string;
  summary: string;
  source_name: string;
  source_url: string;
  source_published_at: string | null;
  added_at: string;
  published_at: string | null;
  category: BriefingCategory;
  status: BriefingStatus;
  edited: boolean;
  edited_by_name: string | null;
  edited_at: string | null;
}

export function displayDate(item: Pick<BriefingItem, "source_published_at" | "published_at" | "added_at">): string {
  const iso = item.source_published_at ?? item.published_at ?? item.added_at;
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
