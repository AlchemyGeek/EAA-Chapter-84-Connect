import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

// Check for new builds every 10 minutes, in addition to focus/visibility/navigation checks.
const PERIODIC_CHECK_MS = 10 * 60 * 1000;

export function PWAUpdatePrompt() {
  const location = useLocation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const check = () => {
        if (document.visibilityState === "visible") {
          registration.update().catch(() => {});
        }
      };

      const intervalId = setInterval(check, PERIODIC_CHECK_MS);
      const onVisibility = () => {
        if (document.visibilityState === "visible") check();
      };
      window.addEventListener("focus", check);
      document.addEventListener("visibilitychange", onVisibility);
      (window as any).__pwaCheckForUpdate = check;

      return () => {
        clearInterval(intervalId);
        window.removeEventListener("focus", check);
        document.removeEventListener("visibilitychange", onVisibility);
        delete (window as any).__pwaCheckForUpdate;
      };
    },
    onNeedRefresh() {
      // Show the visible banner so users (especially on iOS) can tap to update.
    },
  });

  // Re-check on every client-side route change.
  useEffect(() => {
    const check = (window as any).__pwaCheckForUpdate as (() => void) | undefined;
    check?.();
  }, [location.pathname]);

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm">
      <RefreshCw className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">A new version is available</span>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => updateServiceWorker(true)}
        className="shrink-0"
      >
        Update
      </Button>
      <button
        onClick={() => setNeedRefresh(false)}
        className="shrink-0 opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
