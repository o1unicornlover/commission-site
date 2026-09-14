/* Public visual-system lock.
   Keeps the single style.css palette authoritative while preserving permanent
   banner/page-doll/background assets and the homepage character carousel.
   Stored legacy/theme-studio data is left untouched; it simply cannot recolor
   the live site.
*/
(function lockPublicVisualSystem() {
  if (window.__fixedVisualSystemReady) return;
  window.__fixedVisualSystemReady = true;

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

  // Variables written by the retired Theme Studio. None are part of the live
  // style.css system anymore, so remove inline values instead of allowing old
  // saved palettes to linger in the DOM or briefly flash during initialization.
  const RETIRED_THEME_VARS = [
    "--bg", "--panel", "--panel2", "--text", "--muted", "--accent", "--accent2",
    "--danger", "--site-line-color", "--theme-border", "--theme-panel-soft",
    "--theme-card-soft", "--theme-button-soft", "--theme-body-gradient",
    "--theme-hero-gradient"
  ];

  function enforceFixedPalette() {
    const root = document.documentElement;
    RETIRED_THEME_VARS.forEach(name => root.style.removeProperty(name));
    Object.entries(FIXED_VARS).forEach(([name, value]) => root.style.setProperty(name, value));
    document.body?.removeAttribute("data-theme");
    document.getElementById("themeParticles")?.remove();
  }

  function retireLiveColorEditor() {
    document.querySelector('[data-settings-tab="theme-studio"]')?.remove();
    document.getElementById("settings-theme-studio")?.remove();
  }

  function wrapAppearanceFunction(name) {
    const original = window[name];
    if (typeof original !== "function" || original.__fixedVisualWrapped) return;

    const wrapped = async function fixedAppearanceWrapper(...args) {
      const result = await original.apply(this, args);
      enforceFixedPalette();
      retireLiveColorEditor();
      return result;
    };
    wrapped.__fixedVisualWrapped = true;
    window[name] = wrapped;
  }

  function disableRetiredThemePainter() {
    if (typeof window.applyThemeVariables !== "function" || window.applyThemeVariables.__fixedVisualNoop) return;
    const retiredPainter = window.applyThemeVariables;
    const noThemePaint = function noThemePaint() {
      enforceFixedPalette();
    };
    noThemePaint.__fixedVisualNoop = true;
    noThemePaint.__retiredThemePainter = retiredPainter;
    window.applyThemeVariables = noThemePaint;
  }

  function install() {
    disableRetiredThemePainter();
    wrapAppearanceFunction("applySiteSettings");
    wrapAppearanceFunction("applySupabaseHomepageSettings");
    enforceFixedPalette();
    retireLiveColorEditor();
  }

  install();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  }
  window.addEventListener("load", install, { once: true });

  // A delayed pass catches legacy customization initialization without keeping
  // a permanent MutationObserver alive on public pages.
  setTimeout(install, 500);
})();
