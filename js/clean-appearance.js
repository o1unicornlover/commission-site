/*
  Single visual-system guard.
  Retires the old seasonal/theme runtime without deleting any stored user data.
  The live site always uses the one style.css design, while uploaded banner,
  page-doll, background, favicon, gallery-frame, nav-icon, and homepage text remain supported.
*/

(function enforceSingleAppearanceSystem() {
  function removeRetiredThemeArtifacts() {
    if (document.body) document.body.removeAttribute("data-theme");

    document.getElementById("themeParticles")?.remove();

    [
      "--theme-bg", "--theme-panel", "--theme-panel2", "--theme-text",
      "--theme-muted", "--theme-accent", "--theme-accent2", "--theme-border"
    ].forEach(property => document.documentElement.style.removeProperty(property));
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

  function ensureBrandingSaveButton(appearancePanel) {
    if (!appearancePanel || typeof window.saveDefaultAppearance !== "function") return;

    let button = appearancePanel.querySelector('[data-save-branding-assets]');
    if (!button) {
      button = appearancePanel.querySelector('button[onclick*="saveDefaultAppearance"]');
    }

    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "btn primary";
      button.dataset.saveBrandingAssets = "true";
      button.addEventListener("click", () => window.saveDefaultAppearance());

      const clearButton = appearancePanel.querySelector('button[onclick*="clearDefaultImages"]');
      const row = clearButton?.closest(".button-row");
      if (row) row.prepend(button);
      else appearancePanel.appendChild(button);
    } else {
      button.dataset.saveBrandingAssets = "true";
    }

    button.textContent = "Save branding assets";
  }

  function retireThemeControls() {
    document.querySelectorAll('[data-settings-tab="holiday"], #settings-holiday').forEach(el => el.remove());

    const settingsIntro = document.querySelector("#adminPage-settings > .small");
    if (settingsIntro) {
      settingsIntro.textContent = "Manage homepage content, uploaded brand assets, social links, pricing, news, terms, and payments. The live visual style stays locked to style.css.";
    }

    const appearanceTab = document.querySelector('[data-settings-tab="appearance"]');
    if (appearanceTab) appearanceTab.textContent = "Assets & Branding";

    const appearancePanel = document.getElementById("settings-appearance");
    if (!appearancePanel) return;

    const heading = appearancePanel.querySelector("h3");
    if (heading) heading.textContent = "Assets & Branding";

    const intro = appearancePanel.querySelector("h3 + p.small");
    if (intro) {
      intro.textContent = "Manage permanent artwork and branding assets. Colors and component styling stay controlled by the single style.css visual system.";
    }

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

    const manualTheme = document.getElementById("manualTheme");
    if (manualTheme) manualTheme.closest("label")?.remove();

    ensureBrandingSaveButton(appearancePanel);
  }

  function initializeAppearanceGuard() {
    removeRetiredThemeArtifacts();
    retireThemeControls();
    window.applySiteSettings();
  }

  window.refreshSingleAppearanceSystem = initializeAppearanceGuard;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAppearanceGuard, { once: true });
  } else {
    initializeAppearanceGuard();
  }

  window.addEventListener("admin-runtime-ready", () => {
    retireThemeControls();
    removeRetiredThemeArtifacts();
  });
})();
