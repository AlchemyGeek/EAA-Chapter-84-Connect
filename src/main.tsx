import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { startForceUpdateCheck } from "./lib/forceUpdateCheck";

// SW KILL-SWITCH (transition period):
// Many users — especially on mobile — installed an older service worker before
// we enabled autoUpdate + skipWaiting. That old SW happily serves its own
// cached index.html forever, so version-check logic inside the app never even
// runs. Until we're confident everyone has been freed, unconditionally
// unregister every service worker and wipe all CacheStorage on every load.
// Once telemetry shows no stuck users (give it a few weeks), we can remove
// this block and re-enable the PWA.
(async () => {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length > 0) {
        await Promise.all(regs.map((r) => r.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        // We just unregistered the SW that served this page. The currently
        // loaded HTML/JS may still be the stale cached version, so reload
        // once to pick up fresh assets from the network.
        const url = new URL(window.location.href);
        if (!url.searchParams.has("_swkill")) {
          url.searchParams.set("_swkill", Date.now().toString());
          window.location.replace(url.toString());
          return;
        }
      } else if ("caches" in window) {
        // No SW but stale Cache Storage entries can still serve old assets.
        const keys = await caches.keys();
        if (keys.length > 0) {
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      }
    }
  } catch {
    // best effort — never block app boot
  }
})();

createRoot(document.getElementById("root")!).render(<App />);

startForceUpdateCheck();
