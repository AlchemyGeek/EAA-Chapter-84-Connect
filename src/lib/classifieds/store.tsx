import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { SEED_LISTINGS } from "./mockData";
import type { Listing } from "./types";

interface ClassifiedsContextValue {
  listings: Listing[];
  getById: (id: string) => Listing | undefined;
  toggleHidden: (id: string) => void;
  remove: (id: string) => void;
  renew: (id: string, months: 1 | 2 | 3) => void;
}

const ClassifiedsContext = createContext<ClassifiedsContextValue | null>(null);

export function ClassifiedsProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>(SEED_LISTINGS);

  const getById = useCallback(
    (id: string) => listings.find((l) => l.id === id),
    [listings],
  );

  const toggleHidden = useCallback((id: string) => {
    setListings((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        // hidden <-> active toggle. Expired listings hide-back to expired.
        const wasHidden = l.status === "hidden";
        if (wasHidden) {
          const stillExpired = new Date(l.expiresAt).getTime() <= Date.now();
          return { ...l, status: stillExpired ? "expired" : "active" };
        }
        return { ...l, status: "hidden" };
      }),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const renew = useCallback((id: string, months: 1 | 2 | 3) => {
    setListings((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = new Date();
        next.setMonth(next.getMonth() + months);
        return { ...l, status: "active", expiresAt: next.toISOString() };
      }),
    );
  }, []);

  const value = useMemo(
    () => ({ listings, getById, toggleHidden, remove, renew }),
    [listings, getById, toggleHidden, remove, renew],
  );

  return <ClassifiedsContext.Provider value={value}>{children}</ClassifiedsContext.Provider>;
}

export function useClassifieds(): ClassifiedsContextValue {
  const ctx = useContext(ClassifiedsContext);
  if (!ctx) throw new Error("useClassifieds must be used within ClassifiedsProvider");
  return ctx;
}
