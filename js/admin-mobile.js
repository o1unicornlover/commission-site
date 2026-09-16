/* Mobile-first admin navigation. No extra visual theme layer. */
(function initAdminMobileNavigation() {
  const ADMIN_PAGES = [
    ["dash", "Home"],
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
    mobileBar?.querySelectorAll("[data-mobile-jump]").forEach(button => {
      const active = button.dataset.mobileJump === page;
      button.classList.toggle("primary", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
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
    if (quickButton) {
      quickButton.textContent = label;
      quickButton.setAttribute("aria-label", unread ? `Inbox, ${unread} unread messages` : "Inbox");
    }
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

  function navigate(destination) {
    window.showAdminPage?.(destination, "mobile-nav");
    syncSelect(destination);
    const content = document.querySelector(".admin-content");
    const top = Math.max(0, (content?.offsetTop || 0) - 72);
    window.scrollTo({ top, behavior: "smooth" });
  }

  function buildMobileBar() {
    const dashboard = document.getElementById("adminDashboard");
    const content = dashboard?.querySelector(".admin-content");
    if (!dashboard || !content || document.getElementById("adminMobileNav")) return;

    mobileBar = document.createElement("nav");
    mobileBar.id = "adminMobileNav";
    mobileBar.className = "panel compact-panel";
    mobileBar.setAttribute("aria-label", "Admin section navigation");
    mobileBar.innerHTML = `
      <div class="button-row" aria-label="Primary admin sections">
        <button type="button" class="btn" data-mobile-jump="dash">Home</button>
        <button type="button" class="btn" data-mobile-jump="inbox">Inbox</button>
        <button type="button" class="btn" data-mobile-jump="commissions">Commissions</button>
      </div>
      <label class="small" for="adminMobilePageSelect">More
        <select id="adminMobilePageSelect" aria-label="Choose another admin section"></select>
      </label>
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

    mobileBar.querySelectorAll("[data-mobile-jump]").forEach(button => {
      button.addEventListener("click", () => navigate(button.dataset.mobileJump));
    });
    pageSelect.addEventListener("change", () => navigate(pageSelect.value));

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
