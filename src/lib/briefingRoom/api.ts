import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BriefingCategory, BriefingItem, BriefingStatus } from "./types";

const TABLE = "briefing_room_items";

export interface ArchiveFilters {
  search?: string;
  category?: BriefingCategory | "all";
  source?: string | "all";
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export const PAGE_SIZE = 20;

export function usePublishedItems(limit = 12) {
  return useQuery({
    queryKey: ["briefing-room", "published", limit],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as any)
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("added_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as BriefingItem[];
    },
  });
}

export function useArchiveItems(filters: ArchiveFilters, page: number) {
  return useQuery({
    queryKey: ["briefing-room", "archive", filters, page],
    staleTime: 0,
    queryFn: async () => {
      let q = supabase
        .from(TABLE as any)
        .select("*", { count: "exact" })
        .eq("status", "published");

      const search = filters.search?.trim();
      if (search) {
        const escaped = search.replace(/[%,()]/g, " ");
        q = q.or(`headline.ilike.%${escaped}%,summary.ilike.%${escaped}%`);
      }
      if (filters.category && filters.category !== "all") q = q.eq("category", filters.category);
      if (filters.source && filters.source !== "all") q = q.eq("source_name", filters.source);
      if (filters.from) q = q.gte("added_at", new Date(filters.from).toISOString());
      if (filters.to) {
        const to = new Date(filters.to);
        to.setHours(23, 59, 59, 999);
        q = q.lte("added_at", to.toISOString());
      }

      const { data, error, count } = await q
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("added_at", { ascending: false })
        .range(0, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return {
        items: (data ?? []) as unknown as BriefingItem[],
        total: count ?? 0,
      };
    },
  });
}

export function useSources() {
  return useQuery({
    queryKey: ["briefing-room", "sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as any)
        .select("source_name")
        .eq("status", "published");
      if (error) throw error;
      const set = new Set((data ?? []).map((r: any) => r.source_name as string));
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },
  });
}

export function usePendingItems() {
  return useQuery({
    queryKey: ["briefing-room", "pending"],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as any)
        .select("*")
        .eq("status", "pending_review")
        .order("added_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BriefingItem[];
    },
  });
}

export function useRecentPublishedForReview() {
  return useQuery({
    queryKey: ["briefing-room", "review-published"],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as any)
        .select("*")
        .in("status", ["published", "archived"])
        .order("added_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as BriefingItem[];
    },
  });
}

export function usePendingCount(enabled: boolean) {
  return useQuery({
    queryKey: ["briefing-room", "pending-count"],
    enabled,
    staleTime: 0,
    queryFn: async () => {
      const { count, error } = await supabase
        .from(TABLE as any)
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useRecentPublishedCount() {
  return useQuery({
    queryKey: ["briefing-room", "recent-count"],
    staleTime: 0,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from(TABLE as any)
        .select("*", { count: "exact", head: true })
        .eq("status", "published")
        .gte("published_at", since);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export interface ItemEdit {
  headline?: string;
  summary?: string;
  category?: BriefingCategory;
  source_name?: string;
  image_url?: string | null;
}

export function useUpdateItem(editorName: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      changes,
      status,
      markEdited,
    }: {
      id: string;
      changes?: ItemEdit;
      status?: BriefingStatus;
      markEdited?: boolean;
    }) => {
      const patch: Record<string, unknown> = { ...(changes ?? {}) };
      if ("image_url" in patch) {
        const raw = String(patch.image_url ?? "").trim();
        patch.image_url = raw && /^https:\/\//i.test(raw) ? raw : null;
      }
      if (status) {
        patch.status = status;
        if (status === "published") patch.published_at = new Date().toISOString();
      }
      if (markEdited) {
        const { data: auth } = await supabase.auth.getUser();
        patch.edited = true;
        patch.edited_at = new Date().toISOString();
        patch.edited_by = auth.user?.id ?? null;
        patch.edited_by_name = editorName;
      }
      const { error } = await supabase.from(TABLE as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["briefing-room"] });
    },
  });
}
