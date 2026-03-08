import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "admin" | "officer" | "member";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole>("member");
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (initialized) {
        setLoading(false);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        initialized = true;
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
        initialized = true;
        setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkRole = async () => {
      if (!user) {
        if (mounted) {
          setRole("member");
          setRoleLoading(false);
        }
        return;
      }

      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (mounted) {
          // Determine highest role: admin > officer > member
          const roles = (data ?? []).map((r) => r.role);
          if (roles.includes("admin")) {
            setRole("admin");
          } else if (roles.includes("officer")) {
            setRole("officer");
          } else {
            setRole("member");
          }
          setRoleLoading(false);
        }
      } catch {
        if (mounted) {
          setRole("member");
          setRoleLoading(false);
        }
      }
    };

    setRoleLoading(true);
    checkRole();

    return () => {
      mounted = false;
    };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = role === "admin";
  const isOfficerOrAbove = role === "admin" || role === "officer";

  return { user, loading: loading || roleLoading, isAdmin, isOfficerOrAbove, role, signOut };
}
