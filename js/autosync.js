/*
  Refactor Stage 2 - realtime and gentle auto-sync.
  Extracted from legacy-app.js without behavior changes.
*/
/* =========================================================
   REALTIME V2 STABLE BLOCK
   Listens for Supabase database changes and re-renders only
   the page sections that exist on the current page.
========================================================= */
let realtimeChannel = null;
let realtimeRefreshTimer = null;

function chatInputIsActive() {
  const active = document.activeElement;
  return Boolean(active && (active.id === "clientChatInput" || String(active.id || "").startsWith("adminChatInput-")));
}

async function refreshProgressSafely() {
  const progressArea = document.getElementById("progressArea");
  if (!progressArea) return;

  // Auto-sync must not rebuild the whole progress page.
  // This updates only progress data, payment info, and messages.
  await refreshProgressSectionsOnly?.();
}

function queueRealtimeRefresh(reason = "change") {
  clearTimeout(realtimeRefreshTimer);
  realtimeRefreshTimer = setTimeout(async () => {
    try {
      if (document.getElementById("queueGrid")) await renderQueue?.();
      await refreshProgressSafely();
      if (document.getElementById("homeQueuePreview")) await renderHomeQueuePreview?.();
      if (document.getElementById("adminDashboard")) await updateAdminOverview?.();
    } catch (error) {
      console.error("Realtime refresh failed:", error);
    }
  }, 250);
}

function setupRealtime() {
  if (!window.supabaseClient) {
    console.error("Realtime failed: supabaseClient not found.");
    return null;
  }

  if (realtimeChannel) {
    supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeChannel = supabaseClient
    .channel(`site-realtime-${Date.now()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "commissions" }, payload => {
      queueRealtimeRefresh("commissions");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "progress_updates" }, payload => {
      queueRealtimeRefresh("progress_updates");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, payload => {
      const commissionId = payload?.new?.commission_id || payload?.old?.commission_id;
      if (commissionId) {
        renderClientChat?.(commissionId);
        renderAdminChat?.(commissionId);
      }
    })
    .subscribe(status => {
      console.log("Realtime status:", status);
    });

  return realtimeChannel;
}

window.setupRealtime = setupRealtime;

function scheduleRealtimeSetup() {
  setTimeout(() => {
    setupRealtime();
  }, 1200);
}

// Public pages normally load this module while the document is still parsing.
// The admin runtime intentionally loads it after unlock, which can happen after
// DOMContentLoaded has already fired, so support both boot timings without
// creating a second realtime owner.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleRealtimeSetup, { once: true });
} else {
  scheduleRealtimeSetup();
}

async function runFallbackSync() {
  if (document.hidden) return;

  // Admin only needs its own expanded chat panels as a realtime fallback.
  if (document.getElementById("adminDashboard")) {
    if (window.expandedAdminIds) {
      for (const id of window.expandedAdminIds) await renderAdminChat?.(id);
    }
    return;
  }

  // Public pages refresh only sections that actually exist on the current page.
  if (document.getElementById("queueGrid")) await renderQueue?.();
  if (document.getElementById("homeQueuePreview")) await renderHomeQueuePreview?.();
  if (document.getElementById("commissionInfo")) await renderCommissionInfo?.();
  if (document.getElementById("galleryGrid")) await renderGallery?.();
  if (document.getElementById("featuredGallery")) await renderFeaturedGallery?.();
  if (document.getElementById("pricingPage")) await renderPricingPage?.();
  if (document.getElementById("tosPage")) await renderTosPage?.();
  if (document.querySelector(".social-links")) await renderSocialLinks?.();
  if (document.getElementById("homeHero")) await applySupabaseHomepageSettings?.();
  await refreshProgressSafely();
}

setInterval(() => {
  runFallbackSync().catch(error => console.error("Fallback sync failed:", error));
}, 12000);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) runFallbackSync().catch(() => {});
});
