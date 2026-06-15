import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Returns the `viewAs` key_id from the current URL, if any.
 * Used by Hangar Talk to honor admin "View as Member" impersonation across
 * the feed, post detail, new, and edit screens.
 */
export function useViewAsKeyId(): number | null {
  const [sp] = useSearchParams();
  const v = sp.get("viewAs");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Returns a builder that appends the current `viewAs` param (if present)
 * to any in-app path. Preserves existing query strings.
 */
export function useWithViewAs() {
  const viewAs = useViewAsKeyId();
  return useCallback(
    (path: string) => {
      if (!viewAs) return path;
      const sep = path.includes("?") ? "&" : "?";
      return `${path}${sep}viewAs=${viewAs}`;
    },
    [viewAs],
  );
}
