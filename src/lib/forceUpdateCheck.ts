// Detects when the deployed bundle no longer matches the running bundle and
// forces a hard reload, bypassing any stale service worker / HTTP cache.
//
// Background: users who installed an older service worker (before we enabled
// `autoUpdate` + `skipWaiting`) won't auto-upgrade. This routine runs in the
// app shell, fetches the live index.html, extracts the main JS asset hash,
// and compares it to the one that loaded the current page. On mismatch it
// unregisters every service worker, clears all CacheStorage entries, then
// reloads.

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let alreadyReloading = false;

function getRunningAssetHash(): string | null {
  // Find the <script type="module" src="/assets/index-XXXXX.js"> tag that
  // bootstrapped this page.
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]"));
  for (const s of scripts) {
    const src = s.getAttribute("src") ?? "";
    const m = src.match(/\/assets\/index-([A-Za-z0-9_-]+)\.js/);
    if (m) return m[1];
  }
  return null;
}

async function getDeployedAssetHash(): Promise<string | null> {
  try {
    const res = await fetch("/index.html", { cache: "no-store" });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/\/assets\/index-([A-Za-z0-9_-]+)\.js/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function forceReload() {
  if (alreadyReloading) return;
  alreadyReloading = true;
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // best effort
  }
  // Cache-busting reload
  const url = new URL(window.location.href);
  url.searchParams.set("_v", Date.now().toString());
  window.location.replace(url.toString());
}

async function checkOnce() {
  const running = getRunningAssetHash();
  if (!running) return;
  const deployed = await getDeployedAssetHash();
  if (!deployed) return;
  if (deployed !== running) {
    console.info("[update-check] new build detected, reloading", { running, deployed });
    await forceReload();
  }
}

export function startForceUpdateCheck() {
  // Skip in dev / preview iframes
  const host = window.location.hostname;
  if (host === "localhost" || host.includes("id-preview--") || host.includes("lovableproject.com")) {
    return;
  }
  // Initial check shortly after load
  setTimeout(checkOnce, 10_000);
  // Periodic checks
  setInterval(checkOnce, CHECK_INTERVAL_MS);
  // Re-check when the tab becomes visible again
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkOnce();
  });
}
