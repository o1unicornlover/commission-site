/* Mobile-first admin navigation without introducing another visual theme layer. */
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
  const media = window.matchMedia("(max-width: 760px)");

  function currentPage() {
    const active = document.querySelector(".admin-page.active[id^='adminPage-']");
    return active?.id.replace("adminPage-", "") || "dash";
  }

  function syncSelect() {
    if (!pageSelect) return;
    const page = currentPage();
    if ([...pageSelect.options].some(option => option.value === page)) pageSelect.value = page;
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
      if (destination === "inbox" && typeof window.openAdminInbox === "function") {
        window.openAdminInbox();
      } else if (typeof window.showAdminPage === "function") {
        window.showAdminPage(destination);
      }
      syncSelect();
      window.scrollTo({ top: Math.max(0, dashboard.offsetTop - 76), behavior: "smooth" });
    });

    mobileBar.querySelectorAll("[data-mobile-jump]").forEach(button => {
      button.addEventListener("click", () => {
        const destination = button.dataset.mobileJump;
        if (destination === "inbox" && typeof window.openAdminInbox === "function") {
          window.openAdminInbox();
        } else if (typeof window.showAdminPage === "function") {
          window.showAdminPage(destination);
        }
        syncSelect();
      });
    });

    setMobileState();
    syncSelect();
  }

  function observePageChanges() {
    const content = document.querySelector(".admin-content");
    if (!content) return;
    const observer = new MutationObserver(syncSelect);
    observer.observe(content, { subtree: true, attributes: true, attributeFilter: ["class"] });
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildMobileBar();
    observePageChanges();
    media.addEventListener?.("change", setMobileState);
  });
})();
