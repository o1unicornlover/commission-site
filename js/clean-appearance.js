/*
  Single visual-system guard.
  Retires the old seasonal/theme runtime without deleting any stored user data.
  The live site always uses the one style.css design, while uploaded banner,
  page-doll, favicon, gallery-frame, nav-icon, and homepage text remain supported.
*/

(function enforceSingleAppearanceSystem() {
  function removeRetiredThemeArtifacts() {
    if (document.body) {
      document.body.removeAttribute("data-theme");
    }

    const particles = document.getElementById("themeParticles");
    if (particles) particles.remove();

    document.documentElement.style.removeProperty("--theme-bg");
    document.documentElement.style.removeProperty("--theme-panel");
    document.documentElement.style.removeProperty("--theme-panel2");
    document.documentElement.style.removeProperty("--theme-text");
    document.documentElement.style.removeProperty("--theme-muted");
    document.documentElement.style.removeProperty("--theme-accent");
    document.documentElement.style.removeProperty("--theme-accent2");
    document.documentElement.style.removeProperty("--theme-border");
  }

  window.getActiveTheme = function getActiveThemeClean() {
    return "default";
  };

  window.loadThemeEditor = function loadThemeEditorRetired() {
    removeRetiredThemeArtifacts();
  };

  window.saveHolidaySettings = function saveHolidaySettingsRetired() {
    removeRetiredThemeArtifacts();
    alert("Seasonal themes are retired. The site now uses one clean visual system.");
  };

  window.applySiteSettings = function applySingleSiteSettings() {
    const settings = typeof loadSiteSettings === "function" ? loadSiteSettings() : {};
    removeRetiredThemeArtifacts();

    if (settings.backgroundImage) {
      document.body.style.setProperty("--custom-bg-image", `url('${settings.backgroundImage}')`);
    } else {
      document.body.style.removeProperty("--custom-bg-image");
    }

    if (settings.galleryBorderImage) {
      document.body.style.setProperty("--gallery-border-image", `url('${settings.galleryBorderImage}')`);
    } else {
      document.body.style.removeProperty("--gallery-border-image");
    }
    document.body.classList.toggle("gallery-border-enabled", Boolean(settings.galleryBorderEnabled && settings.galleryBorderImage));

    const brand = document.querySelector(".brand");
    if (brand) {
      const existingText = brand.textContent.trim();
      const label = existingText.replace(/^[✦✧♡☆★]+\s*/, "") || "YourName";
      brand.innerHTML = `<span class="brand-icon">${settings.navIcon || "✦"}</span> ${label}`;
    }

    if (settings.favicon && typeof setFavicon === "function") setFavicon(settings.favicon);

    const title = document.getElementById("homeTitle");
    const sub = document.getElementById("homeSubtitle");
    const note = document.getElementById("commissionInfoNote");
    if (title) title.textContent = settings.title || "Welcome!";
    if (sub) sub.textContent = settings.subtitle || "Commission hub and progress tracker.";
    if (note) note.textContent = settings.commissionNote || "";

    const hero = document.getElementById("homeHero");
    if (hero) {
      const banner = settings.defaultBanner || "";
      hero.style.backgroundImage = banner
        ? `linear-gradient(100deg, rgba(255,255,255,.68), rgba(255,215,233,.14)), url('${banner}')`
        : "";
    }

    const dollEl = document.getElementById("pageDoll");
    const dollFallback = document.getElementById("pageDollFallback");
    if (dollEl) {
      const doll = settings.defaultDoll || "";
      if (doll) {
        dollEl.src = doll;
        dollEl.classList.remove("hidden");
        dollFallback?.classList.add("hidden");
      } else {
        dollEl.classList.add("hidden");
        dollFallback?.classList.remove("hidden");
      }
    }

    if (typeof renderSocialLinks === "function") renderSocialLinks();
    if (typeof renderFeaturedGallery === "function") renderFeaturedGallery();
    if (typeof renderHomeQueuePreview === "function") renderHomeQueuePreview();
    if (typeof renderLatestNews === "function") renderLatestNews();
    if (typeof renderPricingPage === "function") renderPricingPage();
    if (typeof renderTosPage === "function") renderTosPage();
  };

  function retireThemeControls() {
    document.querySelectorAll('[data-settings-tab="holiday"], #settings-holiday').forEach(el => el.remove());

    const settingsIntro = document.querySelector("#adminPage-settings > .small");
    if (settingsIntro && /holiday/i.test(settingsIntro.textContent || "")) {
      settingsIntro.textContent = "Customize the public homepage, branding assets, live palette, social links, pricing, news, terms, and payments.";
    }

    const appearanceTab = document.querySelector('[data-settings-tab="appearance"]');
    if (appearanceTab) appearanceTab.textContent = "Assets & Branding";

    const appearancePanel = document.getElementById("settings-appearance");
    if (!appearancePanel) return;

    const heading = appearancePanel.querySelector("h3");
    if (heading) heading.textContent = "Assets & Branding";

    // The permanent Theme Studio owns the live style.css palette. Strip the retired
    // dark/default color editor while preserving banner, page-doll, background,
    // favicon, nav icon, gallery-frame, and clear-image controls.
    const legacyColorInput = appearancePanel.querySelector("#appearanceBg");
    const legacyColorGrid = legacyColorInput?.closest(".color-grid");
    if (legacyColorGrid) {
      const colorHeading = Array.from(appearancePanel.querySelectorAll("h4"))
        .find(el => /default site colors/i.test(el.textContent || ""));
      const colorDescription = colorHeading?.nextElementSibling?.matches("p.small")
        ? colorHeading.nextElementSibling
        : null;
      const divider = colorHeading?.previousElementSibling?.matches("hr.soft-line")
        ? colorHeading.previousElementSibling
        : null;

      legacyColorGrid.remove();
      colorDescription?.remove();
      colorHeading?.remove();
      divider?.remove();
    }

    appearancePanel.querySelectorAll('button[onclick*="saveDefaultAppearance"]').forEach(button => button.remove());

    const manualTheme = document.getElementById("manualTheme");
    if (manualTheme) manualTheme.closest("label")?.remove();
  }

  document.addEventListener("DOMContentLoaded", () => {
    removeRetiredThemeArtifacts();
    retireThemeControls();
    window.applySiteSettings();
  });
})();
