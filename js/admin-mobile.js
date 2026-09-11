/* Mobile-first admin navigation and light admin cleanup. No extra visual theme layer. */
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

  function retireStaleAppearanceControls() {
    document.querySelectorAll('[data-settings-tab="holiday"], #settings-holiday').forEach(el => el.remove());

    const settingsIntro = document.querySelector("#adminPage-settings > .small");
    if (settingsIntro) {
      settingsIntro.textContent = "Manage homepage content, uploaded brand assets, social links, pricing, news, TOS, and payments. Live colors stay locked to the single style.css design.";
    }

    const appearance = document.getElementById("settings-appearance");
    if (!appearance) return;
    const heading = appearance.querySelector("h3");
    if (heading) heading.textContent = "Assets & Branding";

    const firstColor = document.getElementById("appearanceBg");
    const colorGrid = firstColor?.closest(".color-grid");
    if (colorGrid) {
      const description = colorGrid.previousElementSibling;
      const colorHeading = description?.previousElementSibling;
      if (description?.classList?.contains("small")) description.remove();
      if (colorHeading?.tagName === "H4") colorHeading.remove();
      colorGrid.remove();
    }

    [...appearance.querySelectorAll("button")]
      .filter(button => /save appearance/i.test(button.textContent || ""))
      .forEach(button => button.remove());

    if (!appearance.querySelector("[data-permanent-theme-note]")) {
      const note = document.createElement("p");
      note.className = "small";
      note.dataset.permanentThemeNote = "true";
      note.textContent = "The permanent pink / cyan / lime visual system is controlled only by style.css. You can still change artwork, logo assets, backgrounds, and gallery framing here.";
      appearance.insertBefore(note, heading?.nextSibling || appearance.firstChild);
    }
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
    retireStaleAppearanceControls();
    buildMobileBar();
    observePageChanges();
    media.addEventListener?.("change", setMobileState);
  });
})();
