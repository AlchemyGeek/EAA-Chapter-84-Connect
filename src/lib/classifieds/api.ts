import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Category, ClassifiedLink, Listing, Tag } from "./types";
import { STORAGE_BUCKET } from "./types";

function normalizeLinks(raw: unknown): ClassifiedLink[] {
  if (!Array.isArray(raw)) return [];
  const out: ClassifiedLink[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      out.push({ url: item, label: item });
    } else if (item && typeof item === "object") {
      const url = (item as { url?: unknown }).url;
      const label = (item as { label?: unknown }).label;
      if (typeof url === "string" && url) {
        out.push({
          url,
          label: typeof label === "string" && label ? label : url,
        });
      }
    }
  }
  return out;
}

interface ClassifiedRow {
  id: string;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  price: number | string | null;
  links: unknown;
  status: "active" | "expired" | "hidden";
  author_key_id: number;
  author_name: string;
  author_email: string;
  author_phone: string | null;
  author_phone_visible: boolean;
  posted_at: string;
  expires_at: string;
}

interface PhotoRow {
  id: string;
  classified_id: string;
  storage_path: string;
  sort_order: number;
}

async function signPaths(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(paths, 60 * 60);
  if (error) return {};
  const map: Record<string, string> = {};
  (data ?? []).forEach((d) => {
    if (d.signedUrl && d.path) map[d.path] = d.signedUrl;
  });
  return map;
}

function deriveStatus(row: ClassifiedRow): "active" | "expired" | "hidden" {
  if (row.status === "hidden") return "hidden";
  if (row.status === "expired") return "expired";
  return new Date(row.expires_at).getTime() <= Date.now() ? "expired" : "active";
}

async function buildListings(
  rows: ClassifiedRow[],
  photos: PhotoRow[],
): Promise<Listing[]> {
  const allPaths = photos.map((p) => p.storage_path);
  const signed = await signPaths(allPaths);
  const byClassified = new Map<string, PhotoRow[]>();
  for (const p of photos) {
    if (!byClassified.has(p.classified_id)) byClassified.set(p.classified_id, []);
    byClassified.get(p.classified_id)!.push(p);
  }
  for (const list of byClassified.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }
  return rows.map((r) => {
    const ps = byClassified.get(r.id) ?? [];
    const photoRows = ps.map((p) => ({
      id: p.id,
      storagePath: p.storage_path,
      url: signed[p.storage_path] ?? "",
    }));
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      tags: (r.tags ?? []) as Tag[],
      price: r.price === null || r.price === undefined ? null : Number(r.price),
      links: normalizeLinks(r.links),
      photos: photoRows.map((p) => p.url).filter(Boolean),
      photoRows,
      status: deriveStatus(r),
      dbStatus: r.status,
      authorId: String(r.author_key_id),
      authorKeyId: r.author_key_id,
      authorName: r.author_name,
      authorEmail: r.author_email,
      authorPhone: r.author_phone,
      authorPhoneVisible: r.author_phone_visible,
      postedAt: r.posted_at,
      expiresAt: r.expires_at,
    } satisfies Listing;
  });
}

export function useListings() {
  return useQuery({
    queryKey: ["classifieds"],
    staleTime: 0,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("classifieds")
        .select("*")
        .order("posted_at", { ascending: false });
      if (error) throw error;
      const ids = (rows ?? []).map((r) => r.id);
      let photos: PhotoRow[] = [];
      if (ids.length) {
        const { data: ph, error: pErr } = await supabase
          .from("classified_photos")
          .select("*")
          .in("classified_id", ids);
        if (pErr) throw pErr;
        photos = (ph ?? []) as PhotoRow[];
      }
      return buildListings((rows ?? []) as ClassifiedRow[], photos);
    },
  });
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ["classifieds", id],
    enabled: !!id,
    staleTime: 0,
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from("classifieds")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!row) return null;
      const { data: photos, error: pErr } = await supabase
        .from("classified_photos")
        .select("*")
        .eq("classified_id", id!);
      if (pErr) throw pErr;
      const list = await buildListings([row as ClassifiedRow], (photos ?? []) as PhotoRow[]);
      return list[0] ?? null;
    },
  });
}

export interface CurrentMember {
  key_id: number;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  email: string | null;
  cell_phone: string | null;
  cell_phone_private: boolean | null;
  current_standing: string | null;
  contact_visible_in_directory: boolean;
}

export function useCurrentMember() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["classifieds-current-member", user?.email],
    enabled: !!user?.email,
    staleTime: 0,
    queryFn: async (): Promise<CurrentMember | null> => {
      const { data: rm, error } = await supabase
        .from("roster_members")
        .select(
          "key_id, first_name, last_name, nickname, email, cell_phone, cell_phone_private, current_standing",
        )
        .ilike("email", user!.email!)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!rm) return null;
      const { data: mcd } = await supabase
        .from("member_chapter_data")
        .select("contact_visible_in_directory")
        .eq("key_id", rm.key_id)
        .maybeSingle();
      return {
        ...rm,
        contact_visible_in_directory: !!mcd?.contact_visible_in_directory,
      };
    },
  });
}

export interface ListingFormValues {
  title: string;
  description: string;
  category: Category;
  tags: Tag[];
  price: number | null;
  links: ClassifiedLink[];
  /** Existing photo rows kept after edit. */
  keptPhotoIds: string[];
  /** New photo files to upload. */
  newPhotos: File[];
  /** For new listing only. */
  durationMonths?: 1 | 2 | 3;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      values: ListingFormValues;
      member: CurrentMember;
    }) => {
      const { values, member } = args;
      const months = values.durationMonths ?? 1;
      const expires = addMonths(new Date(), months);
      const authorName =
        [member.nickname || member.first_name, member.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() || (member.email ?? "Member");
      const phoneVisible =
        !!member.cell_phone &&
        !member.cell_phone_private &&
        member.contact_visible_in_directory;

      const { data: inserted, error } = await supabase
        .from("classifieds")
        .insert({
          title: values.title.trim(),
          description: values.description.trim(),
          category: values.category,
          tags: values.tags,
          price: values.category === "for-sale" ? values.price : null,
          links: values.links as unknown as string[],
          status: "active",
          author_key_id: member.key_id,
          author_name: authorName,
          author_email: member.email ?? "",
          author_phone: phoneVisible ? member.cell_phone : null,
          author_phone_visible: phoneVisible,
          expires_at: expires.toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;

      const id = inserted.id as string;
      await uploadAndAttachPhotos(id, member.key_id, values.newPhotos, 0);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classifieds"] });
    },
  });
}

export function useUpdateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      values: ListingFormValues;
      authorKeyId: number;
      existingPhotos: { id: string; storagePath: string }[];
    }) => {
      const { id, values, authorKeyId, existingPhotos } = args;
      const { error } = await supabase
        .from("classifieds")
        .update({
          title: values.title.trim(),
          description: values.description.trim(),
          category: values.category,
          tags: values.tags,
          price: values.category === "for-sale" ? values.price : null,
          links: values.links as unknown as string[],
        })
        .eq("id", id);
      if (error) throw error;

      // Determine removed photos
      const removed = existingPhotos.filter(
        (p) => !values.keptPhotoIds.includes(p.id),
      );
      if (removed.length) {
        // Delete storage objects (best-effort)
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(removed.map((p) => p.storagePath));
        // Delete photo rows
        await supabase
          .from("classified_photos")
          .delete()
          .in(
            "id",
            removed.map((p) => p.id),
          );
      }

      const keptCount = values.keptPhotoIds.length;
      await uploadAndAttachPhotos(id, authorKeyId, values.newPhotos, keptCount);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["classifieds"] });
      qc.invalidateQueries({ queryKey: ["classifieds", vars.id] });
    },
  });
}

export function useDeleteListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      photoPaths: string[];
    }) => {
      if (args.photoPaths.length) {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(args.photoPaths);
      }
      const { error } = await supabase
        .from("classifieds")
        .delete()
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["classifieds"] });
      qc.removeQueries({ queryKey: ["classifieds", vars.id] });
    },
  });
}

export function useRenewListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; months: 1 | 2 | 3 }) => {
      const expires = addMonths(new Date(), args.months);
      const { error } = await supabase
        .from("classifieds")
        .update({
          status: "active",
          expires_at: expires.toISOString(),
        })
        .eq("id", args.id);
      if (error) throw error;
      return expires;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["classifieds"] });
      qc.invalidateQueries({ queryKey: ["classifieds", vars.id] });
    },
  });
}

export function useToggleHidden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      currentDbStatus: "active" | "expired" | "hidden";
      expiresAt: string;
    }) => {
      let nextStatus: "active" | "expired" | "hidden";
      if (args.currentDbStatus === "hidden") {
        nextStatus =
          new Date(args.expiresAt).getTime() <= Date.now() ? "expired" : "active";
      } else {
        nextStatus = "hidden";
      }
      const { error } = await supabase
        .from("classifieds")
        .update({ status: nextStatus })
        .eq("id", args.id);
      if (error) throw error;
      return nextStatus;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["classifieds"] });
      qc.invalidateQueries({ queryKey: ["classifieds", vars.id] });
    },
  });
}

async function uploadAndAttachPhotos(
  classifiedId: string,
  authorKeyId: number,
  files: File[],
  startSortOrder: number,
) {
  if (!files.length) return;
  const rows: { classified_id: string; storage_path: string; sort_order: number }[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${authorKeyId}/${classifiedId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    rows.push({
      classified_id: classifiedId,
      storage_path: path,
      sort_order: startSortOrder + i,
    });
  }
  if (rows.length) {
    const { error } = await supabase.from("classified_photos").insert(rows);
    if (error) throw error;
  }
}
