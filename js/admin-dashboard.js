/* Admin studio overview: attention cards, recent client activity, payments, and PWA install control. */
(function initAdminStudioDashboard() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith("/admin.html");
  if (!onAdmin) return;

  const READ_KEY = "adminConversationReadTimes";
  let installPrompt = null;
  let refreshTimer = null;

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function readTimes() {
    try { return JSON.parse(localStorage.getItem(READ_KEY) || "{}"); }
    catch { return {}; }
  }

  function timeOf(row) {
    const value = new Date(row?.created_at || 0).getTime();
    return Number.isFinite(value) ? value : 0;
  }

  function activeDashboard() {
    return document.getElementById("adminPage-dash")?.classList.contains("active");
  }

  function openInbox() {
    const inboxButton = document.querySelector('[data-admin-page="inbox"]');
    if (inboxButton) inboxButton.click();
    else window.showAdminPage?.("inbox");
  }

  function openCommissionMessages(id) {
    if (window.openAdminInboxConversation) {
      window.openAdminInboxConversation(id);
      return;
    }
    location.hash = `message-${encodeURIComponent(id)}`;
    openInbox();
  }

  function ensureStudioOverview() {
    const dashboard = document.getElementById("adminPage-dash");
    if (!dashboard || document.getElementById("adminStudioOverview")) return;

    const block = document.createElement("section");
    block.id = "adminStudioOverview";
    block.innerHTML = `
      <hr class="soft-line">
      <div class="section-title">
        <div>
          <p class="eyebrow">Studio control center</p>
          <h2>Needs attention</h2>
        </div>
        <button type="button" class="btn" id="refreshStudioOverview">Refresh</button>
      </div>
      <div class="grid three" id="adminAttentionGrid">
        <article class="info-card"><h3>Unread messages</h3><p class="page-title" id="studioUnreadCount">—</p><p class="small">Client replies waiting for you.</p></article>
        <article class="info-card"><h3>Payments</h3><p class="page-title" id="studioPaymentCount">—</p><p class="small">Commissions awaiting payment.</p></article>
        <article class="info-card"><h3>Open slots</h3><p class="page-title" id="studioOpenSlotCount">—</p><p class="small">Available commission spaces.</p></article>
      </div>
      <div class="panel compact-panel">
        <div class="section-title">
          <div><p class="eyebrow">Latest contact</p><h3>Recent client activity</h3></div>
          <button type="button" class="btn primary" id="studioOpenInbox">Open Inbox</button>
        </div>
        <div id="studioRecentActivity"><p class="small">Loading recent activity…</p></div>
      </div>
      <div class="panel compact-panel">
        <div class="section-title">
          <div><p class="eyebrow">Money check</p><h3>Payment queue</h3></div>
          <span class="pill" id="studioPaymentQueueBadge">0 waiting</span>
        </div>
        <p class="small">Quickly clear paid commissions or jump into the client conversation without rebuilding the commission editor.</p>
        <div id="studioPaymentQueue"><p class="small">Loading payment queue…</p></div>
      </div>`;

    dashboard.appendChild(block);
    document.getElementById("refreshStudioOverview")?.addEventListener("click", refreshStudioOverview);
    document.getElementById("studioOpenInbox")?.addEventListener("click", openInbox);
    document.getElementById("studioPaymentQueue")?.addEventListener("click", handlePaymentQueueClick);
  }

  async function collectMessageSummary(commissions) {
    if (!window.getChatMessages) return { unread: 0, recent: [] };
    const reads = readTimes();
    const rows = await Promise.all((commissions || []).map(async commission => {
      const messages = await window.getChatMessages(commission.id);
      const clientMessages = (messages || []).filter(message => message.sender === "client");
      const latest = clientMessages.at(-1) || null;
      const lastRead = Number(reads[String(commission.id)] || 0);
      const unread = clientMessages.filter(message => timeOf(message) > lastRead).length;
      return latest ? { commission, latest, unread } : null;
    }));
    const recent = rows.filter(Boolean).sort((a, b) => timeOf(b.latest) - timeOf(a.latest));
    return { unread: recent.reduce((sum, row) => sum + row.unread, 0), recent: recent.slice(0, 4) };
  }

  function paymentNeedsAttention(commission) {
    const state = String(commission?.payment_status || "").toLowerCase();
    return state === "awaiting payment" || state === "requested" || state === "pending";
  }

  function renderPaymentQueue(commissions) {
    const box = document.getElementById("studioPaymentQueue");
    const badge = document.getElementById("studioPaymentQueueBadge");
    if (!box) return;

    const awaiting = (commissions || []).filter(paymentNeedsAttention);
    if (badge) badge.textContent = `${awaiting.length} waiting`;

    if (!awaiting.length) {
      box.innerHTML = `<article class="info-card"><strong>All clear ♡</strong><p class="small">No active commissions are currently waiting for payment.</p></article>`;
      return;
    }

    box.innerHTML = awaiting.map(commission => {
      const id = String(commission.id || "");
      const name = commission.display_name || commission.client_name || "Private Client";
      const type = commission.commission_type || "Commission";
      const price = commission.price ? String(commission.price) : "Price not set";
      const state = commission.payment_status || "Awaiting payment";
      return `<article class="info-card" data-payment-commission="${escapeHTML(id)}">
        <div class="section-title">
          <div>
            <strong>${escapeHTML(name)}</strong>
            <p class="small">${escapeHTML(type)} • ${escapeHTML(price)}</p>
          </div>
          <span class="pill">${escapeHTML(state)}</span>
        </div>
        <div class="button-row">
          <button type="button" class="btn primary" data-payment-action="paid" data-payment-id="${escapeHTML(id)}">Mark Paid</button>
          <button type="button" class="btn" data-payment-action="message" data-payment-id="${escapeHTML(id)}">Message Client</button>
        </div>
      </article>`;
    }).join("");
  }

  async function handlePaymentQueueClick(event) {
    const button = event.target.closest("[data-payment-action]");
    if (!button) return;
    const id = button.dataset.paymentId;
    const action = button.dataset.paymentAction;
    if (!id) return;

    if (action === "message") {
      openCommissionMessages(id);
      return;
    }

    if (action === "paid") {
      if (!window.updateCommission) return alert("Commission updates are unavailable right now.");
      button.disabled = true;
      const oldText = button.textContent;
      button.textContent = "Saving…";
      try {
        const updated = await window.updateCommission(id, { payment_status: "Paid" });
        if (!updated) throw new Error("Update failed");
        await refreshStudioOverview();
        window.renderAdmin?.();
      } catch (error) {
        console.warn("Could not mark commission paid", error);
        button.disabled = false;
        button.textContent = oldText;
        alert("Could not mark this commission as paid. Please try again.");
      }
    }
  }

  async function refreshStudioOverview() {
    ensureStudioOverview();
    if (!document.getElementById("adminStudioOverview")) return;

    try {
      const commissions = window.getCommissions ? await window.getCommissions({ includeArchived: true }) : [];
      const active = (commissions || []).filter(c => String(c.status || "").toLowerCase() !== "archived");
      const [messageSummary, slots] = await Promise.all([
        collectMessageSummary(active),
        window.getSlots ? window.getSlots() : Promise.resolve([])
      ]);

      const awaiting = active.filter(paymentNeedsAttention).length;
      const openSlots = (slots || []).reduce((sum, slot) => {
        if (slot.is_open === false) return sum;
        return sum + Math.max(0, Number(slot.max_slots || 0) - Number(slot.used_slots || 0));
      }, 0);

      const unreadEl = document.getElementById("studioUnreadCount");
      const paymentEl = document.getElementById("studioPaymentCount");
      const slotsEl = document.getElementById("studioOpenSlotCount");
      if (unreadEl) unreadEl.textContent = String(messageSummary.unread);
      if (paymentEl) paymentEl.textContent = String(awaiting);
      if (slotsEl) slotsEl.textContent = String(openSlots);

      const recentBox = document.getElementById("studioRecentActivity");
      if (recentBox) {
        recentBox.innerHTML = messageSummary.recent.length ? messageSummary.recent.map(({ commission, latest, unread }) => {
          const name = commission.display_name || commission.client_name || "Private Client";
          const stamp = latest.created_at ? new Date(latest.created_at).toLocaleString() : "";
          return `<article class="info-card">
            <div class="section-title">
              <div><strong>${escapeHTML(name)}</strong><p class="small">${escapeHTML(stamp)}</p></div>
              ${unread ? `<span class="pill">${unread} unread</span>` : `<span class="pill">Read</span>`}
            </div>
            <p>${escapeHTML(String(latest.message || "").slice(0, 180))}</p>
            <div class="button-row"><button type="button" class="btn" data-recent-message-id="${escapeHTML(String(commission.id))}">Open conversation</button></div>
          </article>`;
        }).join("") : '<p class="small">No client messages yet.</p>';
        recentBox.querySelectorAll("[data-recent-message-id]").forEach(button => {
          button.addEventListener("click", () => openCommissionMessages(button.dataset.recentMessageId));
        });
      }

      renderPaymentQueue(active);
    } catch (error) {
      console.warn("Studio overview refresh failed", error);
    }
  }

  function injectInstallButton() {
    if (document.getElementById("adminInstallApp")) return;
    const header = document.querySelector(".admin-header nav") || document.querySelector(".admin-header");
    if (!header) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "adminInstallApp";
    button.className = "btn";
    button.textContent = "Install App";
    button.hidden = true;
    button.addEventListener("click", async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      try { await installPrompt.userChoice; } catch {}
      installPrompt = null;
      button.hidden = true;
    });
    header.appendChild(button);
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    injectInstallButton();
    const button = document.getElementById("adminInstallApp");
    if (button) button.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    const button = document.getElementById("adminInstallApp");
    if (button) button.hidden = true;
  });

  function startRefreshLoop() {
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      if (activeDashboard()) refreshStudioOverview();
    }, 20000);
  }

  function openFromNotification(commissionId) {
    openInbox();
    if (commissionId) location.hash = `message-${encodeURIComponent(commissionId)}`;
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", event => {
      if (event.data?.type === "open-inbox-commission") openFromNotification(event.data.commissionId || "");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureStudioOverview();
    injectInstallButton();
    setTimeout(refreshStudioOverview, 1100);
    startRefreshLoop();
    if (location.hash.startsWith("#message-")) setTimeout(openInbox, 1300);
  });
})();
