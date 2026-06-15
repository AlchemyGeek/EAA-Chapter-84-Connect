import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  HANGAR_TALK_BUCKET,
  type AuthorRef,
  type Post,
  type PostImage,
  type PostType,
  type Reply,
} from "./types";

// ─── Current member ──────────────────────────────────────────────────────
export function useCurrentMember() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ht-current-member", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, nickname, current_standing, email")
        .ilike("email", user!.email!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────
async function signPaths(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage
    .from(HANGAR_TALK_BUCKET)
    .createSignedUrls(paths, 60 * 60);
  if (error) return {};
  const map: Record<string, string> = {};
  (data ?? []).forEach((d) => {
    if (d.signedUrl && d.path) map[d.path] = d.signedUrl;
  });
  return map;
}

async function fetchAuthors(keyIds: number[]): Promise<Map<number, AuthorRef>> {
  const unique = Array.from(new Set(keyIds.filter((k) => k != null)));
  if (!unique.length) return new Map();
  const { data, error } = await supabase.rpc("get_roster_display_names", {
    _key_ids: unique,
  });
  if (error) return new Map();
  const map = new Map<number, AuthorRef>();
  (data ?? []).forEach((r: AuthorRef) => map.set(r.key_id, r));
  return map;
}

// ─── Posts list ──────────────────────────────────────────────────────────
export function usePosts() {
  return useQuery({
    queryKey: ["ht-posts"],
    queryFn: async (): Promise<Post[]> => {
      const { data: postRows, error } = await supabase
        .from("hangar_talk_posts" as any)
        .select("*")
        .order("last_activity_at", { ascending: false });
      if (error) throw error;
      const posts = (postRows ?? []) as any[];
      const postIds = posts.map((p) => p.id);

      const [{ data: imgRows }, { data: replyCounts }, authors] = await Promise.all([
        postIds.length
          ? supabase
              .from("hangar_talk_post_images" as any)
              .select("*")
              .in("post_id", postIds)
          : Promise.resolve({ data: [] as any[] }),
        postIds.length
          ? supabase
              .from("hangar_talk_replies" as any)
              .select("post_id")
              .in("post_id", postIds)
          : Promise.resolve({ data: [] as any[] }),
        fetchAuthors(posts.map((p) => p.author_key_id)),
      ]);

      const imgs = (imgRows ?? []) as any[];
      const replies = (replyCounts ?? []) as any[];
      const signed = await signPaths(imgs.map((i) => i.storage_path));

      const imgsByPost = new Map<string, PostImage[]>();
      for (const i of imgs) {
        const arr = imgsByPost.get(i.post_id) ?? [];
        arr.push({
          id: i.id,
          storage_path: i.storage_path,
          signed_url: signed[i.storage_path] ?? null,
          position: i.position,
        });
        imgsByPost.set(i.post_id, arr);
      }
      const countByPost = new Map<string, number>();
      for (const r of replies) {
        countByPost.set(r.post_id, (countByPost.get(r.post_id) ?? 0) + 1);
      }

      return posts.map((p) => ({
        id: p.id,
        type: p.type as PostType,
        title: p.title,
        body: p.body,
        author_key_id: p.author_key_id,
        author: authors.get(p.author_key_id) ?? null,
        resolved_at: p.resolved_at,
        last_activity_at: p.last_activity_at,
        created_at: p.created_at,
        updated_at: p.updated_at,
        images: (imgsByPost.get(p.id) ?? []).sort((a, b) => a.position - b.position),
        reply_count: countByPost.get(p.id) ?? 0,
      }));
    },
  });
}

// ─── Single post + replies ───────────────────────────────────────────────
export function usePost(id: string | undefined) {
  return useQuery({
    queryKey: ["ht-post", id],
    enabled: !!id,
    queryFn: async (): Promise<{ post: Post; replies: Reply[] } | null> => {
      const { data: postRow, error } = await supabase
        .from("hangar_talk_posts" as any)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!postRow) return null;
      const p = postRow as any;

      const [{ data: imgRows }, { data: replyRows }] = await Promise.all([
        supabase.from("hangar_talk_post_images" as any).select("*").eq("post_id", p.id),
        supabase
          .from("hangar_talk_replies" as any)
          .select("*")
          .eq("post_id", p.id)
          .order("created_at", { ascending: true }),
      ]);
      const imgs = (imgRows ?? []) as any[];
      const replies = (replyRows ?? []) as any[];

      const authors = await fetchAuthors([
        p.author_key_id,
        ...replies.map((r) => r.author_key_id),
      ]);

      const allPaths = [
        ...imgs.map((i) => i.storage_path),
        ...replies.map((r) => r.image_storage_path).filter(Boolean),
      ];
      const signed = await signPaths(allPaths);

      const post: Post = {
        id: p.id,
        type: p.type,
        title: p.title,
        body: p.body,
        author_key_id: p.author_key_id,
        author: authors.get(p.author_key_id) ?? null,
        resolved_at: p.resolved_at,
        last_activity_at: p.last_activity_at,
        created_at: p.created_at,
        updated_at: p.updated_at,
        images: imgs
          .map((i) => ({
            id: i.id,
            storage_path: i.storage_path,
            signed_url: signed[i.storage_path] ?? null,
            position: i.position,
          }))
          .sort((a, b) => a.position - b.position),
        reply_count: replies.length,
      };

      const replyList: Reply[] = replies.map((r) => ({
        id: r.id,
        post_id: r.post_id,
        author_key_id: r.author_key_id,
        author: authors.get(r.author_key_id) ?? null,
        body: r.body,
        image_storage_path: r.image_storage_path,
        image_signed_url: r.image_storage_path ? signed[r.image_storage_path] ?? null : null,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));

      return { post, replies: replyList };
    },
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────
export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      author_key_id: number;
      type: PostType;
      title: string;
      body: string;
      images: File[];
    }) => {
      const { data: postRow, error } = await supabase
        .from("hangar_talk_posts" as any)
        .insert({
          author_key_id: args.author_key_id,
          type: args.type,
          title: args.title,
          body: args.body,
        })
        .select("id")
        .single();
      if (error) throw error;
      const postId = (postRow as any).id as string;

      if (args.images.length) {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (!uid) throw new Error("Not signed in");
        const uploads: { storage_path: string; position: number }[] = [];
        for (let i = 0; i < args.images.length; i++) {
          const f = args.images[i];
          const path = `${uid}/${postId}/${Date.now()}-${i}-${f.name.replace(/[^\w.\-]/g, "_")}`;
          const { error: upErr } = await supabase.storage
            .from(HANGAR_TALK_BUCKET)
            .upload(path, f, { upsert: false });
          if (upErr) throw upErr;
          uploads.push({ storage_path: path, position: i });
        }
        const { error: imgErr } = await supabase
          .from("hangar_talk_post_images" as any)
          .insert(uploads.map((u) => ({ ...u, post_id: postId })));
        if (imgErr) throw imgErr;
      }
      return postId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ht-posts"] }),
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      type: PostType;
      title: string;
      body: string;
    }) => {
      const { error } = await supabase
        .from("hangar_talk_posts" as any)
        .update({ type: args.type, title: args.title, body: args.body })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ht-posts"] });
      qc.invalidateQueries({ queryKey: ["ht-post", vars.id] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; imagePaths: string[] }) => {
      if (args.imagePaths.length) {
        await supabase.storage.from(HANGAR_TALK_BUCKET).remove(args.imagePaths);
      }
      const { error } = await supabase
        .from("hangar_talk_posts" as any)
        .delete()
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ht-posts"] }),
  });
}

export function useToggleResolved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; resolved: boolean }) => {
      const { error } = await supabase
        .from("hangar_talk_posts" as any)
        .update({ resolved_at: args.resolved ? new Date().toISOString() : null })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ht-posts"] });
      qc.invalidateQueries({ queryKey: ["ht-post", vars.id] });
    },
  });
}

export function useCreateReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      post_id: string;
      author_key_id: number;
      body: string;
      image: File | null;
    }) => {
      let imagePath: string | null = null;
      if (args.image) {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (!uid) throw new Error("Not signed in");
        imagePath = `${uid}/${args.post_id}/reply-${Date.now()}-${args.image.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from(HANGAR_TALK_BUCKET)
          .upload(imagePath, args.image, { upsert: false });
        if (upErr) throw upErr;
      }
      const { error } = await supabase
        .from("hangar_talk_replies" as any)
        .insert({
          post_id: args.post_id,
          author_key_id: args.author_key_id,
          body: args.body,
          image_storage_path: imagePath,
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ht-post", vars.post_id] });
      qc.invalidateQueries({ queryKey: ["ht-posts"] });
    },
  });
}

export function useDeleteReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; post_id: string; imagePath: string | null }) => {
      if (args.imagePath) {
        await supabase.storage.from(HANGAR_TALK_BUCKET).remove([args.imagePath]);
      }
      const { error } = await supabase
        .from("hangar_talk_replies" as any)
        .delete()
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ht-post", vars.post_id] });
    },
  });
}

// ─── Tags ────────────────────────────────────────────────────────────────
export interface TagCategory {
  id: string;
  slug: string;
  label: string;
  position: number;
}
export interface TagRow {
  id: string;
  category_id: string;
  label: string;
  position: number;
  archived: boolean;
}

export function useTagCategories() {
  return useQuery({
    queryKey: ["ht-tag-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hangar_talk_tag_categories" as any)
        .select("*")
        .order("position");
      if (error) throw error;
      return (data ?? []) as unknown as TagCategory[];
    },
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["ht-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hangar_talk_tags" as any)
        .select("*")
        .order("position");
      if (error) throw error;
      return (data ?? []) as unknown as TagRow[];
    },
  });
}

export function useMemberTags(keyId: number | null | undefined) {
  return useQuery({
    queryKey: ["ht-member-tags", keyId],
    enabled: !!keyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hangar_talk_member_tags" as any)
        .select("tag_id")
        .eq("key_id", keyId!);
      if (error) throw error;
      return new Set<string>((data ?? []).map((r: any) => r.tag_id));
    },
  });
}

export function useSetMemberTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { key_id: number; tag_id: string; on: boolean }) => {
      if (args.on) {
        const { error } = await supabase
          .from("hangar_talk_member_tags" as any)
          .insert({ key_id: args.key_id, tag_id: args.tag_id });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("hangar_talk_member_tags" as any)
          .delete()
          .eq("key_id", args.key_id)
          .eq("tag_id", args.tag_id);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["ht-member-tags", vars.key_id] }),
  });
}

// Admin tag management
export function useUpsertTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id?: string;
      category_id: string;
      label: string;
      position: number;
      archived?: boolean;
    }) => {
      if (args.id) {
        const { error } = await supabase
          .from("hangar_talk_tags" as any)
          .update({
            category_id: args.category_id,
            label: args.label,
            position: args.position,
            archived: args.archived ?? false,
          })
          .eq("id", args.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hangar_talk_tags" as any).insert({
          category_id: args.category_id,
          label: args.label,
          position: args.position,
          archived: args.archived ?? false,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ht-tags"] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hangar_talk_tags" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ht-tags"] }),
  });
}

// ─── Unread tracking (per-device, localStorage) ──────────────────────────
export function hangarTalkLastVisitKey(userId: string | undefined) {
  return userId ? `ht-last-visit-${userId}` : null;
}

export function getHangarTalkLastVisit(userId: string | undefined): string {
  const key = hangarTalkLastVisitKey(userId);
  if (!key) return new Date(0).toISOString();
  return localStorage.getItem(key) ?? new Date(0).toISOString();
}

export function markHangarTalkVisited(userId: string | undefined) {
  const key = hangarTalkLastVisitKey(userId);
  if (!key) return;
  localStorage.setItem(key, new Date().toISOString());
}

export function useHangarTalkUnreadCount() {
  const { user } = useAuth();
  const { data: me } = useCurrentMember();
  return useQuery({
    queryKey: ["ht-unread-count", user?.id, me?.key_id],
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 60_000,
    queryFn: async () => {
      const since = getHangarTalkLastVisit(user?.id);
      const myKey = me?.key_id ?? -1;

      const [postsCreated, postsUpdated, repliesTouched] = await Promise.all([
        supabase
          .from("hangar_talk_posts" as any)
          .select("id", { count: "exact", head: true })
          .gt("created_at", since)
          .neq("author_key_id", myKey),
        supabase
          .from("hangar_talk_posts" as any)
          .select("id", { count: "exact", head: true })
          .gt("updated_at", since)
          .lte("created_at", since)
          .neq("author_key_id", myKey),
        supabase
          .from("hangar_talk_replies" as any)
          .select("id", { count: "exact", head: true })
          .or(`created_at.gt.${since},updated_at.gt.${since}`)
          .neq("author_key_id", myKey),
      ]);

      return (
        (postsCreated.count ?? 0) +
        (postsUpdated.count ?? 0) +
        (repliesTouched.count ?? 0)
      );
    },
  });
}

