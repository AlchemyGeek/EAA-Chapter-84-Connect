import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for updates every hour
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onNeedRefresh() {
      // Auto-apply updates so users always see the latest version
      updateServiceWorker(true);
    },
  });

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
