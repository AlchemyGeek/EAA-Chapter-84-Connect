import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async (userId: string) => {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        if (mounted) setIsAdmin(!!data);
      } catch {
        if (mounted) setIsAdmin(false);
      }
    };

    const handleSession = async (session: any) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await checkAdmin(currentUser.id);
      } else {
        setIsAdmin(false);
      }
      if (mounted) setLoading(false);
    };

    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Mark as initialized so getSession doesn't also set state
        initializedRef.current = true;
        await handleSession(session);
      }
    );

    // Fallback: if onAuthStateChange hasn't fired after a short delay, use getSession
    const fallbackTimer = setTimeout(() => {
      if (!initializedRef.current && mounted) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!initializedRef.current) {
            handleSession(session);
          }
        }).catch(() => {
          if (mounted) setLoading(false);
        });
      }
    }, 100);

    // Safety timeout: force loading to false after 3 seconds to prevent infinite loading
    const safetyTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth loading timed out, forcing resolution");
        setLoading(false);
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, isAdmin, signOut };
}
