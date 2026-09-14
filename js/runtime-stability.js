/*
  Public runtime stability for the single style.css visual system.
  Autosync may ask the homepage to refresh every few seconds. This wrapper only
  reapplies permanent branding/content when those fields actually changed, so
  the character carousel is not repeatedly rebuilt and retired theme settings
  never participate in live rendering.
*/
(function stabilizeAppearanceRuntime() {
  if (window.__publicAppearanceStabilityReady) return;
  window.__publicAppearanceStabilityReady = true;

  const originalApplyHomepage = window.applySupabaseHomepageSettings;
  const originalApplySite = window.applySiteSettings;
  let lastFingerprint = "";
  let applying = false;

  function fingerprint(settings = {}) {
    return JSON.stringify({
      title: settings.homepage_title || settings.title || "",
      subtitle: settings.homepage_subtitle || settings.subtitle || "",
      news: settings.homepage_news || settings.commissionNote || "",
      banner: settings.banner_url || "",
      doll: settings.pagedoll_url || "",
      background: settings.background_url || "",
      favicon: settings.favicon_url || "",
      navIcon: settings.nav_icon || "",
      galleryFrame: settings.gallery_border_url || "",
      galleryFrameEnabled: Boolean(settings.gallery_border_enabled)
    });
  }

  function enforceFixedPalette() {
    const refresh = window.refreshSingleAppearanceSystem;
    if (typeof refresh === "function") {
      refresh();
      return;
    }

    // Minimal fallback if the appearance guard has not initialized yet.
    const root = document.documentElement;
    const fixed = {
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
    Object.entries(fixed).forEach(([property, value]) => root.style.setProperty(property, value));
  }

  async function stableApply() {
    if (applying || typeof window.getSiteSettings !== "function") return;
    applying = true;
    try {
      const settings = await window.getSiteSettings();
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

      // Never inspect or apply theme_settings here. The single visual system is
      // enforced independently of any retired seasonal/studio values in storage.
      enforceFixedPalette();
    } catch (error) {
      console.warn("Appearance stability refresh failed", error);
    } finally {
      applying = false;
    }
  }

  // Autosync calls these globals. Avoid needless DOM/carousel rebuilds while
  // still picking up real homepage content and permanent branding changes.
  window.applySupabaseHomepageSettings = stableApply;
  window.applySiteSettings = stableApply;
  window.refreshSingleAppearance = async function refreshSingleAppearance() {
    lastFingerprint = "";
    await stableApply();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", stableApply, { once: true });
  } else {
    stableApply();
  }
})();
