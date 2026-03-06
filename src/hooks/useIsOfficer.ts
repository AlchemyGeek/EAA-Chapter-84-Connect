import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIsOfficer(keyId: number | undefined | null) {
  const { data, isLoading } = useQuery({
    queryKey: ["is-officer", keyId],
    enabled: !!keyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_leadership")
        .select("id, role")
        .eq("key_id", keyId!)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return { isOfficer: !!data, role: data?.role ?? null, isLoading };
}
