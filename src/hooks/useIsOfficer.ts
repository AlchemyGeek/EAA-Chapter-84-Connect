import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIsOfficer(keyId: number | undefined | null) {
  const { data: isOfficer = false, isLoading } = useQuery({
    queryKey: ["is-officer", keyId],
    enabled: !!keyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_leadership")
        .select("id")
        .eq("key_id", keyId!)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  return { isOfficer, isLoading };
}
