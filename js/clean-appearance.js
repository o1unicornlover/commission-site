/*
  Single visual-system guard.
  Retires the old seasonal/theme runtime without deleting stored user data.
  The live site always uses the one style.css design, while permanent banner,
  page-doll, background, favicon, gallery-frame, nav-icon, and homepage content
  remain supported.
*/

(function enforceSingleAppearanceSystem() {
  if (window.__singleAppearanceSystemReady) return;
  window.__singleAppearanceSystemReady = true;

  const FIXED_VARS = {
    "--paper": "#fffdfc",
    "--paper-2": "#fff7fb",
    "--ink": "#19171d",
    "--ink-soft": "#4f4a55",
    "--line": "#19171d",
    "--pink": "#ff4da8",
    "--pink-soft": "#ffd7e9",
    "--pink-pale": "#fff0f7",
    "--cyan": "#79dfe9",
    "--cyan-soft": "#dff9fb",
    "--lime": "#dff36a",
    "--lime-soft": "#f4ffc7"
  };

  const RETIRED_THEME_VARS = [
    "--bg", "--panel", "--panel2", "--text", "--muted", "--accent", "--accent2",
    "--danger", "--site-line-color", "--theme-bg", "--theme-panel", "--theme-panel2",
    "--theme-text", "--theme-muted", "--theme-accent", "--theme-accent2", "--theme-border",
    "--theme-panel-soft", "--theme-card-soft", "--theme-button-soft", "--theme-body-gradient",
    "--theme-hero-gradient"
  ];

  function enforceFixedPalette() {
    const root = document.documentElement;
    RETIRED_THEME_VARS.forEach(property => root.style.removeProperty(property));
    Object.entries(FIXED_VARS).forEach(([property, value]) => root.style.setProperty(property, value));
    document.body?.removeAttribute("data-theme");
    document.getElementById("themeParticles")?.remove();
  }

  function setBrandIcon(icon) {
    const brand = document.querySelector(".brand");
    if (!brand) return;
    const existingText = brand.textContent.trim();
    const label = existingText.replace(/^[✦✧♡☆★]+\s*/, "") || "YourName";
    brand.innerHTML = `<span class="brand-icon">${icon || "✦"}</span> ${label}`;
  }

  function setBackground(url) {
    if (!document.body) return;
    if (url) document.body.style.setProperty("--custom-bg-image", `url('${url}')`);
    else document.body.style.removeProperty("--custom-bg-image");
  }

  function setGalleryFrame(url, enabled) {
    if (!document.body) return;
    if (url) document.body.style.setProperty("--gallery-border-image", `url('${url}')`);
    else document.body.style.removeProperty("--gallery-border-image");
    document.body.classList.toggle("gallery-border-enabled", Boolean(enabled && url));
  }

  function setHeroBanner(url) {
    const hero = document.getElementById("homeHero");
    if (!hero) return;
    if (url) {
      const image = `linear-gradient(100deg, rgba(255,255,255,.72), rgba(255,215,233,.16)), url('${url}')`;
      hero.classList.add("has-custom-banner");
      hero.style.setProperty("--hero-banner-image", image);
      hero.style.backgroundImage = image;
      hero.style.backgroundSize = "cover";
      hero.style.backgroundPosition = "center";
    } else {
      hero.classList.remove("has-custom-banner");
      hero.style.removeProperty("--hero-banner-image");
      hero.style.backgroundImage = "";
      hero.style.removeProperty("background-size");
      hero.style.removeProperty("background-position");
    }
  }

  function setPageDoll(url) {
    const doll = document.getElementById("pageDoll");
    const fallback = document.getElementById("pageDollFallback");
    if (!doll) return;
    if (url) {
      doll.src = url;
      doll.classList.remove("hidden");
      fallback?.classList.add("hidden");
    } else {
      doll.removeAttribute("src");
      doll.classList.add("hidden");
      fallback?.classList.remove("hidden");
    }
  }

  function applyHomepageText(settings = {}) {
    const title = document.getElementById("homeTitle");
    const subtitle = document.getElementById("homeSubtitle");
    const note = document.getElementById("commissionInfoNote");
    if (title) title.textContent = settings.homepage_title || settings.title || "Welcome!";
    if (subtitle) subtitle.textContent = settings.homepage_subtitle || settings.subtitle || "Commission hub and progress tracker.";
    if (note) note.textContent = settings.homepage_news || settings.commissionNote || "";
  }

  window.getActiveTheme = function getActiveThemeClean() {
    return "default";
  };

  // Legacy code still calls these names. Keep them harmless so old seasonal
  // settings remain stored but can never repaint or auto-switch the live site.
  window.activeThemeKeyFromSettings = function activeThemeKeyRetired() {
    return "default";
  };

  window.applyThemeVariables = function applyThemeVariablesRetired() {
    enforceFixedPalette();
  };

  window.loadThemeEditor = function loadThemeEditorRetired() {
    enforceFixedPalette();
  };

  window.saveHolidaySettings = function saveHolidaySettingsRetired() {
    enforceFixedPalette();
    alert("Seasonal themes are retired. The site now uses one clean visual system.");
  };

  window.applySiteSettings = function applySingleSiteSettings() {
    const settings = typeof loadSiteSettings === "function" ? loadSiteSettings() : {};
    enforceFixedPalette();
    setBackground(settings.backgroundImage || "");
    setGalleryFrame(settings.galleryBorderImage || "", settings.galleryBorderEnabled);
    setBrandIcon(settings.navIcon || "✦");
    if (settings.favicon && typeof setFavicon === "function") setFavicon(settings.favicon);
    applyHomepageText(settings);
    setHeroBanner(settings.defaultBanner || "");
    setPageDoll(settings.defaultDoll || "");

    if (typeof renderSocialLinks === "function") renderSocialLinks();
    if (typeof renderFeaturedGallery === "function") renderFeaturedGallery();
    if (typeof renderHomeQueuePreview === "function") renderHomeQueuePreview();
    if (typeof renderLatestNews === "function") renderLatestNews();
    if (typeof renderPricingPage === "function") renderPricingPage();
    if (typeof renderTosPage === "function") renderTosPage();
  };

  window.applySupabaseHomepageSettings = async function applySingleSupabaseHomepageSettings() {
    if (typeof getSiteSettings !== "function") return;
    const settings = await getSiteSettings();
    if (!settings) return;

    enforceFixedPalette();
    applyHomepageText(settings);
    setBackground(settings.background_url || "");
    setGalleryFrame(settings.gallery_border_url || "", settings.gallery_border_enabled);
    setBrandIcon(settings.nav_icon || "✦");
    setHeroBanner(settings.banner_url || "");
    setPageDoll(settings.pagedoll_url || "");

    if (settings.favicon_url && typeof setFaviconUrl === "function") setFaviconUrl(settings.favicon_url);
    if (typeof renderLatestNews === "function") renderLatestNews();
  };

  async function saveBrandingAssetsOnly() {
    if (typeof getSiteSettings !== "function" || typeof updateSiteSettings !== "function") return;
    const current = await getSiteSettings();
    if (!current) return alert("Could not load site settings. Make sure your settings row exists.");

    const updates = {};
    const upload = async (inputId, bucket, field, failureMessage) => {
      const file = document.getElementById(inputId)?.files?.[0];
      if (!file) return true;
      const url = await uploadImage(file, bucket);
      if (!url) {
        alert(failureMessage);
        return false;
      }
      updates[field] = url;
      return true;
    };

    if (!await upload("defaultBannerFile", "banners", "banner_url", "Banner upload failed. Check the banners bucket policy.")) return;
    if (!await upload("defaultDollFile", "pagedolls", "pagedoll_url", "Page doll upload failed. Check the pagedolls bucket policy.")) return;
    if (!await upload("backgroundFile", "backgrounds", "background_url", "Background upload failed. Check the backgrounds bucket policy.")) return;
    if (!await upload("faviconFile", "backgrounds", "favicon_url", "Favicon upload failed. This uses the backgrounds bucket.")) return;
    if (!await upload("galleryBorderFile", "gallery-borders", "gallery_border_url", "Gallery border upload failed. Check the gallery-borders bucket policy.")) return;

    const navIcon = document.getElementById("navIconInput")?.value.trim();
    if (navIcon) updates.nav_icon = navIcon;
    updates.gallery_border_enabled = Boolean(document.getElementById("galleryBorderEnabled")?.checked);

    const saved = await updateSiteSettings(updates);
    if (!saved) return alert("Branding assets could not be saved.");
    await window.applySupabaseHomepageSettings();
    await window.renderGallery?.();
    alert("Branding assets saved.");
  }

  // Keep the existing button/function name for compatibility, but stop writing
  // retired color/theme settings whenever permanent assets are saved.
  window.saveDefaultAppearance = saveBrandingAssetsOnly;

  function ensureBrandingSaveButton(appearancePanel) {
    if (!appearancePanel) return;

    let button = appearancePanel.querySelector('[data-save-branding-assets]');
    if (!button) button = appearancePanel.querySelector('button[onclick*="saveDefaultAppearance"]');

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
    document.querySelectorAll('[data-settings-tab="holiday"], [data-settings-tab="theme-studio"], #settings-holiday, #settings-theme-studio').forEach(el => el.remove());

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
    document.getElementById("holidayEnabled")?.closest("label")?.remove();

    ensureBrandingSaveButton(appearancePanel);
  }

  function initializeAppearanceGuard() {
    enforceFixedPalette();
    retireThemeControls();
    window.applySiteSettings();
  }

  window.refreshSingleAppearanceSystem = initializeAppearanceGuard;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAppearanceGuard, { once: true });
  } else {
    initializeAppearanceGuard();
  }

  window.addEventListener("load", enforceFixedPalette, { once: true });
  window.addEventListener("admin-runtime-ready", () => {
    retireThemeControls();
    enforceFixedPalette();
  });
})();
