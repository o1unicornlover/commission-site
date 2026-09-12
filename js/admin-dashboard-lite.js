/* Lightweight admin dashboard overview: quick actions, active work, payments, and slot capacity. */
(function initAdminDashboardLite() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith("/admin.html");
  if (!onAdmin || window.__adminDashboardLiteLoaded) return;
  window.__adminDashboardLiteLoaded = true;

  let refreshTimer = null;
  let refreshBusy = false;

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function activeDashboard() {
    return document.getElementById("adminPage-dash")?.classList.contains("active");
  }

  function openPage(page) {
    window.showAdminPage?.(page);
  }

  function openInbox() {
    const button = document.querySelector('[data-admin-page="inbox"]');
    if (button) button.click();
    else openPage("inbox");
  }

  async function openCommission(id) {
    openPage("commissions");
    if (window.expandedAdminIds?.add) window.expandedAdminIds.add(String(id));
    await window.renderAdmin?.();
    setTimeout(() => {
      const safe = window.CSS?.escape ? CSS.escape(String(id)) : String(id).replace(/[^a-zA-Z0-9_-]/g, "");
      const node = document.querySelector(`[data-commission-id="${safe}"]`) || document.getElementById(`commission-${safe}`);
      node?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function openMessages(id) {
    if (window.openAdminInboxConversation) {
      window.openAdminInboxConversation(id);
      return;
    }
    location.hash = `message-${encodeURIComponent(id)}`;
    openInbox();
  }

  function unreadFromShell() {
    const text = document.querySelector('[data-admin-page="inbox"]')?.textContent || "";
    const match = text.match(/\((\d+)\)/);
    return match ? Number(match[1]) : 0;
  }

  function needsPayment(commission) {
    const state = String(commission?.payment_status || "").toLowerCase();
    return state === "awaiting payment" || state === "requested" || state === "pending";
  }

  function ensureDashboard() {
    const dashboard = document.getElementById("adminPage-dash");
    if (!dashboard || document.getElementById("adminDashboardLite")) return;

    const section = document.createElement("section");
    section.id = "adminDashboardLite";
    section.innerHTML = `
      <hr class="soft-line">
      <div class="section-title">
        <div>
          <p class="eyebrow">Studio control center</p>
          <h2>Today at a glance</h2>
        </div>
        <button type="button" class="btn" id="adminDashboardRefresh">Refresh</button>
      </div>
      <div class="grid three">
        <article class="info-card"><h3>Unread messages</h3><p class="page-title" id="dashUnread">0</p><button type="button" class="btn" data-dash-page="inbox">Open Inbox</button></article>
        <article class="info-card"><h3>Awaiting payment</h3><p class="page-title" id="dashPayments">0</p><button type="button" class="btn" data-dash-page="commissions">Commissions</button></article>
        <article class="info-card"><h3>Open slots</h3><p class="page-title" id="dashSlots">0</p><button type="button" class="btn" data-dash-page="slots">Manage Slots</button></article>
      </div>
      <div class="panel compact-panel">
        <div class="section-title">
          <div><p class="eyebrow">Quick actions</p><h3>Jump back into work</h3></div>
        </div>
        <div class="button-row">
          <button type="button" class="btn primary" data-dash-page="commissions">Manage commissions</button>
          <button type="button" class="btn" data-dash-page="inbox">Client inbox</button>
          <button type="button" class="btn" data-dash-page="gallery">Gallery</button>
          <button type="button" class="btn" data-dash-page="settings">Site settings</button>
        </div>
      </div>
      <div class="panel compact-panel">
        <div class="section-title">
          <div><p class="eyebrow">Current work</p><h3>Active commissions</h3></div>
          <span class="pill" id="dashActiveBadge">0 active</span>
        </div>
        <div id="dashActiveWork"><p class="small">Loading active work…</p></div>
      </div>
      <div class="panel compact-panel">
        <div class="section-title">
          <div><p class="eyebrow">Money check</p><h3>Payment queue</h3></div>
          <span class="pill" id="dashPaymentBadge">0 waiting</span>
        </div>
        <div id="dashPaymentQueue"><p class="small">Loading payment queue…</p></div>
      </div>`;

    dashboard.appendChild(section);
    section.addEventListener("click", handleClick);
    document.getElementById("adminDashboardRefresh")?.addEventListener("click", () => refreshDashboard(true));
  }

  function renderActive(commissions) {
    const box = document.getElementById("dashActiveWork");
    const badge = document.getElementById("dashActiveBadge");
    if (!box) return;

    const active = (commissions || [])
      .filter(c => String(c.status || "").toLowerCase() !== "archived")
      .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

    if (badge) badge.textContent = `${active.length} active`;
    if (!active.length) {
      box.innerHTML = '<article class="info-card"><strong>No active commissions</strong><p class="small">New work will appear here automatically.</p></article>';
      return;
    }

    box.innerHTML = active.slice(0, 6).map(c => `
      <article class="info-card">
        <div class="section-title">
          <div><strong>${escapeHTML(c.display_name || c.client_name || "Private Client")}</strong><p class="small">${escapeHTML(c.commission_type || "Commission")}</p></div>
          <span class="pill">${escapeHTML(c.status || "Active")}</span>
        </div>
        <div class="button-row">
          <button type="button" class="btn primary" data-dash-commission="${escapeHTML(c.id)}">Open commission</button>
          <button type="button" class="btn" data-dash-message="${escapeHTML(c.id)}">Message</button>
        </div>
      </article>`).join("");
  }

  function renderPayments(commissions) {
    const box = document.getElementById("dashPaymentQueue");
    const badge = document.getElementById("dashPaymentBadge");
    const payments = (commissions || []).filter(c => String(c.status || "").toLowerCase() !== "archived" && needsPayment(c));
    if (badge) badge.textContent = `${payments.length} waiting`;
    const count = document.getElementById("dashPayments");
    if (count) count.textContent = String(payments.length);
    if (!box) return;

    if (!payments.length) {
      box.innerHTML = '<article class="info-card"><strong>All clear ♡</strong><p class="small">No active commissions are waiting for payment.</p></article>';
      return;
    }

    box.innerHTML = payments.slice(0, 5).map(c => `
      <article class="info-card">
        <div class="section-title">
          <div><strong>${escapeHTML(c.display_name || c.client_name || "Private Client")}</strong><p class="small">${escapeHTML(c.commission_type || "Commission")}</p></div>
          <span class="pill">${escapeHTML(c.payment_status || "Awaiting payment")}</span>
        </div>
        <div class="button-row">
          <button type="button" class="btn primary" data-dash-commission="${escapeHTML(c.id)}">Open commission</button>
          <button type="button" class="btn" data-dash-message="${escapeHTML(c.id)}">Message</button>
        </div>
      </article>`).join("");
  }

  async function refreshDashboard(force = false) {
    ensureDashboard();
    if (refreshBusy || (!force && !activeDashboard())) return;
    if (!window.getCommissions) return;
    refreshBusy = true;
    try {
      const [commissions, slots] = await Promise.all([
        window.getCommissions({ includeArchived: true }),
        window.getSlots ? window.getSlots() : Promise.resolve([])
      ]);
      const active = (commissions || []).filter(c => String(c.status || "").toLowerCase() !== "archived");
      const openSlots = (slots || []).reduce((sum, slot) => {
        if (slot.is_open === false) return sum;
        return sum + Math.max(0, Number(slot.max_slots || 0) - Number(slot.used_slots || 0));
      }, 0);
      const unread = document.getElementById("dashUnread");
      const slotCount = document.getElementById("dashSlots");
      if (unread) unread.textContent = String(unreadFromShell());
      if (slotCount) slotCount.textContent = String(openSlots);
      renderActive(active);
      renderPayments(active);
    } catch (error) {
      console.warn("Lightweight dashboard refresh failed", error);
    } finally {
      refreshBusy = false;
    }
  }

  function handleClick(event) {
    const page = event.target.closest("[data-dash-page]")?.dataset.dashPage;
    if (page) {
      if (page === "inbox") openInbox();
      else openPage(page);
      return;
    }
    const commissionId = event.target.closest("[data-dash-commission]")?.dataset.dashCommission;
    if (commissionId) {
      openCommission(commissionId);
      return;
    }
    const messageId = event.target.closest("[data-dash-message]")?.dataset.dashMessage;
    if (messageId) openMessages(messageId);
  }

  function start() {
    ensureDashboard();
    refreshDashboard(true);
    document.querySelector('[data-admin-page="dash"]')?.addEventListener("click", () => setTimeout(() => refreshDashboard(true), 0));
    window.addEventListener("focus", () => refreshDashboard(false));
    window.addEventListener("admin-runtime-ready", () => refreshDashboard(true));
    refreshTimer = setInterval(() => {
      if (!document.hidden && activeDashboard()) refreshDashboard(false);
    }, 60000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
