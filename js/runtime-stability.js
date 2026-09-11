/*
  Stability layer for the single style.css visual system.
  Prevents the gentle 3-second autosync from rebuilding the character carousel
  when appearance settings have not changed. Rebuilding reset the timer to the
  first PNG, which could stop a 6-second carousel from ever advancing.
*/
(function stabilizeAppearanceRuntime() {
  const originalApplyHomepage = window.applySupabaseHomepageSettings;
  const originalApplySite = window.applySiteSettings;
  let lastFingerprint = "";
  let applying = false;

  function parseThemeSettings(raw) {
    if (!raw) return {};
    if (typeof raw === "string") {
      try { return JSON.parse(raw) || {}; } catch { return {}; }
    }
    return typeof raw === "object" ? raw : {};
  }

  function cleanStudio(settings) {
    const themeSettings = parseThemeSettings(settings?.theme_settings);
    const studio = themeSettings.studio && typeof themeSettings.studio === "object"
      ? themeSettings.studio
      : {};
    return studio;
  }

  function fingerprint(settings) {
    const studio = cleanStudio(settings);
    return JSON.stringify({
      banner: settings?.banner_url || "",
      doll: settings?.pagedoll_url || "",
      background: settings?.background_url || "",
      studio
    });
  }

  function enforceSoftAccentFallbacks(settings) {
    const studio = cleanStudio(settings);
    const colors = studio.colors || {};
    const root = document.documentElement;

    // Keep the UI's pale card colors pale even when the strong accent swatches
    // are customized. Explicit soft colors are supported if added later.
    root.style.setProperty("--pink-pale", colors.pinkPale || "#fff0f7");
    root.style.setProperty("--cyan-soft", colors.cyanSoft || "#dff9fb");
    root.style.setProperty("--lime-soft", colors.limeSoft || "#f4ffc7");

    if (!settings?.background_url) {
      document.body?.style.removeProperty("--custom-bg-image");
    }
  }

  async function stableApply() {
    if (applying) return;
    applying = true;
    try {
      const settings = await window.getSiteSettings?.();
      if (!settings) return;
      const nextFingerprint = fingerprint(settings);

      if (nextFingerprint !== lastFingerprint) {
        lastFingerprint = nextFingerprint;
        if (typeof originalApplyHomepage === "function") {
          await originalApplyHomepage();
        } else if (typeof originalApplySite === "function") {
          await originalApplySite();
        }
      }

      enforceSoftAccentFallbacks(settings);
    } catch (error) {
      console.warn("Appearance stability refresh failed", error);
    } finally {
      applying = false;
    }
  }

  // Autosync calls this global every few seconds. Only rebuild visual assets if
  // the actual appearance settings changed, so carousel animation can continue.
  window.applySupabaseHomepageSettings = stableApply;
  window.applySiteSettings = stableApply;
  window.refreshSingleAppearance = async function refreshSingleAppearance() {
    lastFingerprint = "";
    await stableApply();
  };

  function cleanAdminLabels() {
    const appearanceTab = document.querySelector('[data-settings-tab="appearance"]');
    if (appearanceTab) appearanceTab.textContent = "Assets & Branding";

    const studioTab = document.querySelector('[data-settings-tab="theme-studio"]');
    if (studioTab) studioTab.textContent = "Theme & Characters";

    const settingsHeading = document.querySelector('#adminPage-settings > h2');
    const settingsIntro = settingsHeading?.nextElementSibling;
    if (settingsIntro?.classList.contains("small")) {
      settingsIntro.textContent = "Manage branding assets, the one live site palette, character carousel, social links, pricing, news, TOS, and payments.";
    }

    // The retired seasonal editor remains absent. Remove its tab/panel if older
    // cached HTML ever supplied them before this script ran.
    document.querySelectorAll('[data-settings-tab="holiday"], #settings-holiday').forEach(el => el.remove());
  }

  document.addEventListener("DOMContentLoaded", () => {
    cleanAdminLabels();
    stableApply();
    // Theme Studio is inserted dynamically on DOMContentLoaded too, so relabel it
    // once more after that insertion without rebuilding any settings forms.
    setTimeout(cleanAdminLabels, 100);
  });
})();
