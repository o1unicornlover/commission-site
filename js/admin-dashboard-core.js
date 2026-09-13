/* Core admin resilience: navigation, dashboard counts, and tracker-to-slot sync. */
(function initAdminDashboardCore() {
  if (window.__adminDashboardCoreReady) return;
  window.__adminDashboardCoreReady = true;

  let refreshBusy = false;
  let createCommissionWrapped = false;

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
      const activeBadge = document.getElementById("dashActiveBadge");
      if (activeBadge) activeBadge.textContent = `${active.length} active`;

      window.dispatchEvent(new CustomEvent("admin-dashboard-core-refreshed", {
        detail: { commissions: all, active, gallery: galleryItems }
      }));
    } catch (error) {
      console.warn("Core dashboard refresh failed", error);
    } finally {
      refreshBusy = false;
    }
  }

  function activateAdminPage(name) {
    if (!name) return;
    document.querySelectorAll(".admin-page").forEach(page => page.classList.remove("active"));
    const target = document.getElementById(`adminPage-${name}`);
    if (!target) return;
    target.classList.add("active");
    document.querySelectorAll(".admin-nav-btn").forEach(button => {
      button.classList.toggle("active", button.dataset.adminPage === name);
    });
    if (name === "dash") {
      queueMicrotask(refreshDashboardCore);
      queueMicrotask(() => window.refreshAdminDashboard?.(true));
    }
    if (name === "inbox") queueMicrotask(() => window.renderAdminInbox?.());
  }

  function activateSettingsTab(name) {
    if (!name) return;
    document.querySelectorAll(".settings-tab").forEach(button => {
      button.classList.toggle("active", button.dataset.settingsTab === name);
    });
    document.querySelectorAll(".settings-panel").forEach(panel => panel.classList.add("hidden"));
    document.getElementById(`settings-${name}`)?.classList.remove("hidden");
  }

  function installReliableNavigation() {
    window.showAdminPage = activateAdminPage;
    window.showSettingsTab = activateSettingsTab;
    if (window.__adminReliableNavigationInstalled) return;
    window.__adminReliableNavigationInstalled = true;

    document.addEventListener("click", event => {
      const pageButton = event.target.closest("[data-admin-page]");
      if (pageButton) {
        event.preventDefault();
        event.stopImmediatePropagation();
        activateAdminPage(pageButton.dataset.adminPage);
        return;
      }

      const jumpButton = event.target.closest("[data-admin-jump], [data-quick-page], [data-mobile-jump]");
      if (jumpButton) {
        const destination = jumpButton.dataset.adminJump || jumpButton.dataset.quickPage || jumpButton.dataset.mobileJump;
        if (!destination) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        activateAdminPage(destination);
        return;
      }

      const settingsButton = event.target.closest("[data-settings-tab]");
      if (settingsButton) {
        event.preventDefault();
        event.stopImmediatePropagation();
        activateSettingsTab(settingsButton.dataset.settingsTab);
      }
    }, true);
  }

  function canonicalType(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return "";
    if (/(^|\b)(2d|illustration|drawing|art)(\b|$)/.test(text) && !/3d/.test(text)) return "2d";
    if (/(^|\b)(3d|model|modeling|modelling|sculpt|sculpting)(\b|$)/.test(text)) return "3d";
    if (/(^|\b)(animation|animated|animatic|motion)(\b|$)/.test(text)) return "animation";
    return text.replace(/[^a-z0-9]+/g, " ").trim();
  }

  function slotMatchScore(slot, commissionType) {
    const slotText = String(slot?.commission_type || "").trim().toLowerCase();
    const typeText = String(commissionType || "").trim().toLowerCase();
    if (!slotText || !typeText) return 0;
    if (slotText === typeText) return 100;
    if (canonicalType(slotText) === canonicalType(typeText)) return 80;
    if (typeText.includes(slotText) || slotText.includes(typeText)) return 60;
    return 0;
  }

  async function consumeMatchingSlot(commissionType) {
    if (typeof window.getSlots !== "function" || typeof window.updateSlot !== "function") return null;
    const slots = await window.getSlots();
    const match = (slots || [])
      .map(slot => ({ slot, score: slotMatchScore(slot, commissionType) }))
      .filter(row => row.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.slot;

    if (!match) {
      console.warn(`No matching slot found for commission type: ${commissionType}`);
      return null;
    }

    const max = Math.max(1, Number(match.max_slots || 1));
    const used = Math.max(0, Number(match.used_slots || 0));
    const nextUsed = Math.min(max, used + 1);
    const manuallyClosed = match.is_open === false && used < max;
    const nextOpen = manuallyClosed ? false : nextUsed < max;

    const updated = await window.updateSlot(match.id, {
      used_slots: nextUsed,
      is_open: nextOpen
    });

    if (updated) {
      await Promise.allSettled([
        Promise.resolve(window.renderSlotAdmin?.()),
        Promise.resolve(window.renderCommissionInfo?.()),
        Promise.resolve(refreshDashboardCore()),
        Promise.resolve(window.refreshAdminDashboard?.(true))
      ]);
    }
    return updated;
  }

  async function addCommissionTypeSuggestions() {
    const input = document.getElementById("commissionType");
    if (!input || typeof window.getSlots !== "function") return;
    const slots = await window.getSlots();
    let list = document.getElementById("commissionTypeOptions");
    if (!list) {
      list = document.createElement("datalist");
      list.id = "commissionTypeOptions";
      input.insertAdjacentElement("afterend", list);
      input.setAttribute("list", list.id);
    }
    list.replaceChildren(...(slots || []).map(slot => {
      const option = document.createElement("option");
      option.value = String(slot.commission_type || "");
      return option;
    }));
  }

  function installTrackerSlotSync() {
    if (createCommissionWrapped || typeof window.createCommission !== "function") return;
    const original = window.createCommission;
    createCommissionWrapped = true;
    window.createCommission = async function createCommissionWithSlotSync(values = {}) {
      const created = await original.call(this, values);
      if (created) {
        try { await consumeMatchingSlot(created.commission_type || values.commission_type || ""); }
        catch (error) { console.warn("Commission created, but automatic slot sync failed", error); }
      }
      return created;
    };
  }

  function start() {
    installReliableNavigation();
    installTrackerSlotSync();
    addCommissionTypeSuggestions().catch(error => console.warn("Commission type suggestions failed", error));
    refreshDashboardCore();
    window.addEventListener("focus", () => {
      if (document.getElementById("adminPage-dash")?.classList.contains("active")) refreshDashboardCore();
    });
  }

  window.refreshAdminDashboardCore = refreshDashboardCore;
  window.installAdminDashboardNavigationRefresh = installReliableNavigation;
  window.consumeMatchingSlot = consumeMatchingSlot;
  window.refreshCommissionTypeSuggestions = addCommissionTypeSuggestions;
  window.addEventListener("admin-runtime-ready", start, { once: true });

  // admin-dashboard-core.js is loaded after the legacy admin functions, so install now too.
  start();
})();