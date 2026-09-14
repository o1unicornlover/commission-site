/* Mobile-first admin navigation. No extra visual theme layer. */
(function initAdminMobileNavigation() {
  const ADMIN_PAGES = [
    ["dash", "Dashboard"],
    ["commissions", "Commissions"],
    ["inbox", "Inbox"],
    ["slots", "Slots"],
    ["gallery", "Gallery"],
    ["archives", "Archives"],
    ["settings", "Settings"]
  ];

  let mobileBar = null;
  let pageSelect = null;
  let inboxBadgeObserver = null;
  let initialized = false;
  const media = window.matchMedia("(max-width: 760px)");

  function currentPage() {
    const active = document.querySelector(".admin-page.active[id^='adminPage-']");
    return active?.id.replace("adminPage-", "") || "dash";
  }

  function syncSelect(page = currentPage()) {
    if (!pageSelect) return;
    if ([...pageSelect.options].some(option => option.value === page)) pageSelect.value = page;
  }

  function unreadInboxCount() {
    const label = document.querySelector('[data-admin-page="inbox"]')?.textContent || "";
    const match = label.match(/\((\d+)\)/);
    return match ? Number(match[1]) || 0 : 0;
  }

  function syncInboxBadge() {
    const unread = unreadInboxCount();
    const label = unread ? `Inbox (${unread})` : "Inbox";
    const quickButton = mobileBar?.querySelector('[data-mobile-jump="inbox"]');
    if (quickButton) quickButton.textContent = label;
    const option = pageSelect?.querySelector('option[value="inbox"]');
    if (option) option.textContent = label;
  }

  function watchInboxBadge() {
    inboxBadgeObserver?.disconnect();
    inboxBadgeObserver = null;
    const source = document.querySelector('[data-admin-page="inbox"]');
    if (!source || !("MutationObserver" in window)) return;
    inboxBadgeObserver = new MutationObserver(syncInboxBadge);
    inboxBadgeObserver.observe(source, { childList: true, characterData: true, subtree: true });
  }

  function setMobileState() {
    if (!mobileBar) return;
    mobileBar.hidden = !media.matches;
    const sidebar = document.querySelector(".admin-sidebar");
    if (sidebar) sidebar.hidden = media.matches;
  }

  function buildMobileBar() {
    const dashboard = document.getElementById("adminDashboard");
    const content = dashboard?.querySelector(".admin-content");
    if (!dashboard || !content || document.getElementById("adminMobileNav")) return;

    mobileBar = document.createElement("section");
    mobileBar.id = "adminMobileNav";
    mobileBar.className = "panel compact-panel";
    mobileBar.setAttribute("aria-label", "Admin section navigation");
    mobileBar.innerHTML = `
      <p class="eyebrow">Admin app</p>
      <div class="form-grid">
        <label class="small">Section
          <select id="adminMobilePageSelect" aria-label="Choose admin section"></select>
        </label>
      </div>
      <div class="button-row">
        <button type="button" class="btn" data-mobile-jump="dash">Dashboard</button>
        <button type="button" class="btn" data-mobile-jump="inbox">Inbox</button>
        <button type="button" class="btn" data-mobile-jump="commissions">Commissions</button>
      </div>
    `;

    dashboard.insertBefore(mobileBar, content);
    pageSelect = mobileBar.querySelector("#adminMobilePageSelect");

    ADMIN_PAGES.forEach(([value, label]) => {
      if (value !== "inbox" && !document.getElementById(`adminPage-${value}`)) return;
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      pageSelect.appendChild(option);
    });

    pageSelect.addEventListener("change", () => {
      const destination = pageSelect.value;
      window.showAdminPage?.(destination, "mobile-select");
      const dashboardTop = Math.max(0, dashboard.offsetTop - 76);
      window.scrollTo({ top: dashboardTop, behavior: "smooth" });
    });

    setMobileState();
    syncSelect();
    syncInboxBadge();
    watchInboxBadge();
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    buildMobileBar();
    media.addEventListener?.("change", setMobileState);
  }

  window.addEventListener("admin-page-change", event => {
    syncSelect(event.detail?.page || currentPage());
    syncInboxBadge();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  window.addEventListener("admin-runtime-ready", () => {
    if (!document.getElementById("adminMobileNav")) buildMobileBar();
    syncSelect();
    syncInboxBadge();
    watchInboxBadge();
    setMobileState();
  });
})();
