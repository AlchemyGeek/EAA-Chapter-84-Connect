import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentMember } from "./api";

// All hooks key by current member's key_id. Subscriptions are private (RLS).

export function useSubscribedPostIds() {
  const { data: me } = useCurrentMember();
  const keyId = me?.key_id ?? null;
  return useQuery({
    queryKey: ["ht-subs", keyId],
    enabled: !!keyId,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("hangar_talk_subscriptions" as any)
        .select("post_id")
        .eq("key_id", keyId!);
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.post_id as string));
    },
  });
}

export function useIsSubscribed(postId: string | undefined) {
  const { data: ids } = useSubscribedPostIds();
  return !!postId && !!ids?.has(postId);
}

export function useToggleSubscription() {
  const qc = useQueryClient();
  const { data: me } = useCurrentMember();
  return useMutation({
    mutationFn: async ({ postId, subscribe }: { postId: string; subscribe: boolean }) => {
      if (!me?.key_id) throw new Error("Not signed in");
      if (subscribe) {
        const { error } = await supabase
          .from("hangar_talk_subscriptions" as any)
          .insert({ post_id: postId, key_id: me.key_id });
        // Ignore unique-violation if already subscribed.
        if (error && !String(error.message).includes("duplicate key")) throw error;
      } else {
        const { error } = await supabase
          .from("hangar_talk_subscriptions" as any)
          .delete()
          .eq("post_id", postId)
          .eq("key_id", me.key_id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ht-subs"] });
    },
  });
}
