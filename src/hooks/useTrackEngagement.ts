import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks a member engagement event once per browser session per event type.
 * Uses sessionStorage to deduplicate within the same tab session.
 */
export function useTrackEngagement(eventType: string) {
  useEffect(() => {
    const sessionKey = `engagement-${eventType}`;
    if (sessionStorage.getItem(sessionKey)) return;

    // Mark immediately to prevent double-fires
    sessionStorage.setItem(sessionKey, "1");

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return;

        // Look up the member's key_id
        const { data: member } = await supabase
          .from("roster_members")
          .select("key_id")
          .ilike("email", session.user.email)
          .limit(1)
          .maybeSingle();

        if (!member?.key_id) return;

        await supabase.from("member_engagement_events").insert({
          key_id: member.key_id,
          event_type: eventType,
        });
      } catch {
        // Silent fail – engagement tracking should never block UX
      }
    })();
  }, [eventType]);
}
