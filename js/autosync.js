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
  console.log("Realtime refresh queued:", reason);
  clearTimeout(realtimeRefreshTimer);
  realtimeRefreshTimer = setTimeout(async () => {
    try {
      if (document.getElementById("queueGrid")) await renderQueue?.();
      await refreshProgressSafely();
      if (document.getElementById("homeQueuePreview")) await renderHomeQueuePreview?.();
      if (document.getElementById("adminDashboard")) {
        await updateAdminOverview?.();
      }
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
      console.log("Realtime commissions event:", payload);
      queueRealtimeRefresh("commissions");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "progress_updates" }, payload => {
      console.log("Realtime progress event:", payload);
      queueRealtimeRefresh("progress_updates");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, payload => {
      console.log("Realtime chat event:", payload);
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

// Start realtime after the normal app initialization finishes.
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    setupRealtime();
  }, 1200);
});

setInterval(async () => {
  // Public page auto-sync. Keep this gentle so forms/chat do not flicker.
  renderQueue?.();
  renderHomeQueuePreview?.();
  renderCommissionInfo?.();

  renderGallery?.();
  renderFeaturedGallery?.();

  renderPricingPage?.();
  renderTosPage?.();
  renderSocialLinks?.();
  applySupabaseHomepageSettings?.();

  // Progress pages are special because rebuilding the whole page also rebuilds chat.
  // This only refreshes chat while typing and avoids the long close/reappear glitch.
  await refreshProgressSafely?.();

  // Admin chat boxes only update their message lists, not the full commission cards.
  if (isAdmin) {
    expandedAdminIds.forEach(id => renderAdminChat?.(id));
  }

  // Do NOT auto-render admin forms here.
  // Do NOT rebuild chat containers while typing.
}, 3000);

