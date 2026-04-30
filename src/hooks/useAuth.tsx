import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "admin" | "officer" | "member";

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isOfficerOrAbove: boolean;
  role: AppRole;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole>("member");
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let hydrated = false;

    // Set up listener FIRST — never await async work inside the callback (deadlock risk).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      // Only flip loading=false from the listener AFTER initial hydration completes.
      // This prevents a transient INITIAL_SESSION event from racing with getSession()
      // and briefly exposing user=null to route guards (which then redirect to /auth).
      if (hydrated) {
        setLoading(false);
      }
    });

    // Then hydrate from storage. This is the authoritative source for initial state.
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        hydrated = true;
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
        hydrated = true;
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
        if (user.email) {
          await supabase.rpc("promote_pending_roles", {
            _user_id: user.id,
            _email: user.email,
          });
        }

        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (mounted) {
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
  const combinedLoading = loading || roleLoading;

  return (
    <AuthContext.Provider value={{ user, loading: combinedLoading, isAdmin, isOfficerOrAbove, role, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
