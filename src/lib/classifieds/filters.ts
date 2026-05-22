import type { Category, Listing, Tag } from "./types";

export interface FilterState {
  search: string;
  category: Category | "all";
  tags: Tag[];
}

export const DEFAULT_FILTERS: FilterState = {
  search: "",
  category: "all",
  tags: [],
};

export function isFilterActive(f: FilterState): boolean {
  return f.search.trim() !== "" || f.category !== "all" || f.tags.length > 0;
}

export function applyFilters(listings: Listing[], f: FilterState): Listing[] {
  const q = f.search.trim().toLowerCase();
  return listings.filter((l) => {
    if (f.category !== "all" && l.category !== f.category) return false;
    if (f.tags.length > 0 && !f.tags.every((t) => l.tags.includes(t))) return false;
    if (q) {
      const hay = `${l.title} ${l.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays <= 0) {
    const hours = Math.floor(diffMs / 3600000);
    if (hours <= 0) return "Just now";
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(diffDays / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function expiresLabel(iso: string): { text: string; expired: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { text: "Expired", expired: true };
  const days = Math.ceil(ms / 86400000);
  return { text: `Expires in ${days} day${days === 1 ? "" : "s"}`, expired: false };
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
