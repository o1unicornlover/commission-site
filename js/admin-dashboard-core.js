/* Core admin dashboard resilience. Keeps the Dashboard usable even if optional PWA layers load late. */
(function initAdminDashboardCore() {
  if (window.__adminDashboardCoreReady) return;
  window.__adminDashboardCoreReady = true;

  let refreshBusy = false;
  let wrappedNavigation = false;

  const setText = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = String(value ?? 0);
  };

  function isArchived(commission) {
    return String(commission?.status || "").toLowerCase() === "archived";
  }

  async function refreshDashboardCore() {
    if (refreshBusy || typeof window.getCommissions !== "function") return;
    refreshBusy = true;
    try {
      const [commissions, gallery] = await Promise.all([
        window.getCommissions({ includeArchived: true }),
        typeof window.getGalleryItems === "function" ? window.getGalleryItems() : Promise.resolve([])
      ]);
      const all = Array.isArray(commissions) ? commissions : [];
      const active = all.filter(commission => !isArchived(commission));
      const galleryItems = Array.isArray(gallery) ? gallery : [];

      setText("adminTotalCommissions", all.length);
      setText("adminActiveCommissions", active.length);
      setText("adminGalleryCount", galleryItems.length);

      // If the enhanced dashboard is present, keep its summary counts alive too.
      setText("dashActiveBadge", `${active.length} active`);
      window.dispatchEvent(new CustomEvent("admin-dashboard-core-refreshed", {
        detail: { commissions: all, active, gallery: galleryItems }
      }));
    } catch (error) {
      console.warn("Core dashboard refresh failed", error);
    } finally {
      refreshBusy = false;
    }
  }

  function installNavigationRefresh() {
    if (wrappedNavigation || typeof window.showAdminPage !== "function") return;
    const original = window.showAdminPage;
    wrappedNavigation = true;
    window.showAdminPage = function showAdminPageWithDashboardRefresh(page, ...args) {
      const result = original.call(this, page, ...args);
      if (page === "dash") queueMicrotask(refreshDashboardCore);
      return result;
    };
  }

  function start() {
    installNavigationRefresh();
    refreshDashboardCore();
    document.addEventListener("click", event => {
      if (event.target.closest('[data-admin-page="dash"], [data-quick-page="dash"], [data-mobile-jump="dash"]')) {
        queueMicrotask(refreshDashboardCore);
      }
    });
    window.addEventListener("focus", () => {
      if (document.getElementById("adminPage-dash")?.classList.contains("active")) refreshDashboardCore();
    });
  }

  window.refreshAdminDashboardCore = refreshDashboardCore;
  window.installAdminDashboardNavigationRefresh = installNavigationRefresh;
  window.addEventListener("admin-runtime-ready", start, { once: true });

  if (document.documentElement.dataset.adminBoot === "ready") queueMicrotask(start);
})();
