/* Admin app routing + legacy-control cleanup. Keeps the single style.css visual system intact. */
(function initAdminRouting() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith("/admin.html");
  if (!onAdmin) return;

  let routeTimer = null;

  function retireLegacyThemeUI() {
    document.querySelectorAll('[data-settings-tab="holiday"], #settings-holiday').forEach(el => el.remove());

    const appearanceTab = document.querySelector('[data-settings-tab="appearance"]');
    if (appearanceTab && appearanceTab.textContent.trim() !== "Assets & Branding") {
      appearanceTab.textContent = "Assets & Branding";
    }

    const appearancePanel = document.getElementById("settings-appearance");
    if (appearancePanel) {
      const heading = appearancePanel.querySelector("h3");
      if (heading) heading.textContent = "Assets & Branding";
      appearancePanel.querySelectorAll("h4").forEach(h => {
        if (/default site colors/i.test(h.textContent || "")) h.remove();
      });
      appearancePanel.querySelectorAll("p.small").forEach(p => {
        if (/holiday theme|normal site colors/i.test(p.textContent || "")) p.remove();
      });
      const oldColorGrid = appearancePanel.querySelector(".color-grid");
      if (oldColorGrid) oldColorGrid.remove();
    }

    const settingsIntro = document.querySelector("#adminPage-settings > p.small");
    if (settingsIntro) settingsIntro.textContent = "Manage homepage content, branding assets, character carousel, social links, pricing, news, TOS, and payments.";
  }

  function decodeMessageHash() {
    if (!location.hash.startsWith("#message-")) return "";
    try { return decodeURIComponent(location.hash.slice("#message-".length)); }
    catch { return location.hash.slice("#message-".length); }
  }

  async function openInboxConversation(commissionId, options = {}) {
    const id = String(commissionId || "").trim();
    const inboxButton = document.querySelector('[data-admin-page="inbox"]');
    if (inboxButton) inboxButton.click();
    else window.showAdminPage?.("inbox");

    if (!id) return;

    clearTimeout(routeTimer);
    let attempts = 0;
    const tryOpen = () => {
      attempts += 1;
      const card = document.querySelector(`[data-inbox-commission="${CSS.escape(id)}"]`);
      const openButton = card?.querySelector("[data-open-inbox-commission]");
      if (openButton) {
        if (options.updateHash !== false) history.replaceState(null, "", `#message-${encodeURIComponent(id)}`);
        openButton.click();
        return;
      }
      if (attempts < 25) routeTimer = setTimeout(tryOpen, 120);
    };
    tryOpen();
  }

  window.openAdminInboxConversation = openInboxConversation;

  function addCommissionQuickLinks() {
    const list = document.getElementById("adminList");
    if (!list) return;
    list.querySelectorAll("[data-commission-id]").forEach(card => {
      if (card.querySelector("[data-quick-open-inbox]")) return;
      const id = card.getAttribute("data-commission-id");
      if (!id) return;
      const actionRow = card.querySelector(".button-row");
      if (!actionRow) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn";
      button.dataset.quickOpenInbox = id;
      button.textContent = "Open Messages";
      button.addEventListener("click", event => {
        event.stopPropagation();
        openInboxConversation(id);
      });
      actionRow.appendChild(button);
    });
  }

  function watchAdminUI() {
    const observer = new MutationObserver(() => {
      retireLegacyThemeUI();
      addCommissionQuickLinks();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function routeFromHash() {
    const id = decodeMessageHash();
    if (id) setTimeout(() => openInboxConversation(id, { updateHash: false }), 700);
  }

  document.addEventListener("DOMContentLoaded", () => {
    retireLegacyThemeUI();
    addCommissionQuickLinks();
    watchAdminUI();
    routeFromHash();
  });

  window.addEventListener("hashchange", routeFromHash);
})();
