/*
  Permanent visual customization for the single style.css system.
  Adds one editable live palette plus a homepage character-PNG carousel.
  No seasonal CSS layers are created; everything maps to the existing style.css variables.
*/
(function initSiteCustomization() {
  const CLEAN_PALETTE = {
    paper: "#fffdfc",
    paper2: "#fff7fb",
    ink: "#19171d",
    muted: "#4f4a55",
    line: "#19171d",
    pink: "#ff4da8",
    pinkSoft: "#ffd7e9",
    cyan: "#79dfe9",
    lime: "#dff36a"
  };

  let carouselTimer = null;
  let carouselIndex = 0;
  let cachedRemoteSettings = null;

  function parseThemeSettings(raw) {
    if (!raw) return {};
    if (typeof raw === "string") {
      try { return JSON.parse(raw) || {}; } catch { return {}; }
    }
    return typeof raw === "object" ? { ...raw } : {};
  }

  function studioFrom(settings) {
    const themes = parseThemeSettings(settings?.theme_settings);
    const studio = themes.studio && typeof themes.studio === "object" ? themes.studio : {};
    return {
      enabled: studio.enabled !== false,
      colors: { ...CLEAN_PALETTE, ...(studio.colors || {}) },
      carousel: Array.isArray(studio.carousel) ? studio.carousel.filter(Boolean) : [],
      carouselEnabled: studio.carouselEnabled !== false,
      carouselSeconds: Math.max(3, Math.min(20, Number(studio.carouselSeconds || 6)))
    };
  }

  function setVar(name, value) {
    if (value) document.documentElement.style.setProperty(name, value);
  }

  function applyPalette(studio) {
    const c = studio.enabled ? studio.colors : CLEAN_PALETTE;
    setVar("--paper", c.paper);
    setVar("--paper-2", c.paper2);
    setVar("--ink", c.ink);
    setVar("--ink-soft", c.muted);
    setVar("--line", c.line);
    setVar("--pink", c.pink);
    setVar("--pink-soft", c.pinkSoft);
    setVar("--pink-pale", c.pinkSoft);
    setVar("--cyan", c.cyan);
    setVar("--cyan-soft", c.cyan);
    setVar("--lime", c.lime);
    setVar("--lime-soft", c.lime);
  }

  function clearCarouselTimer() {
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = null;
  }

  function buildCarousel(studio) {
    const slot = document.querySelector(".banner-character");
    if (!slot) return;

    clearCarouselTimer();
    const images = studio.carouselEnabled ? studio.carousel : [];
    if (!images.length) {
      slot.removeAttribute("data-carousel-ready");
      return;
    }

    slot.setAttribute("data-carousel-ready", "true");
    slot.innerHTML = "";
    slot.style.overflow = "visible";
    slot.style.pointerEvents = "none";

    const stage = document.createElement("div");
    stage.className = "character-carousel-stage";
    Object.assign(stage.style, {
      position: "relative",
      width: "100%",
      height: "100%",
      minHeight: "300px"
    });

    const slides = images.map((url, i) => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.decoding = "async";
      img.loading = i === 0 ? "eager" : "lazy";
      Object.assign(img.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        objectFit: "contain",
        objectPosition: "center bottom",
        opacity: i === 0 ? "1" : "0",
        transform: i === 0 ? "translateX(0)" : "translateX(-22px)",
        transition: "opacity 720ms ease, transform 760ms cubic-bezier(.2,.75,.25,1)",
        filter: "drop-shadow(0 18px 24px rgba(25,23,29,.12))"
      });
      stage.appendChild(img);
      return img;
    });

    slot.appendChild(stage);
    carouselIndex = 0;

    if (slides.length > 1) {
      carouselTimer = setInterval(() => {
        const current = slides[carouselIndex];
        const nextIndex = (carouselIndex + 1) % slides.length;
        const next = slides[nextIndex];

        // Current character exits to the right while fading away.
        current.style.opacity = "0";
        current.style.transform = "translateX(46px)";

        // New character enters softly from the left and settles into place.
        next.style.transition = "none";
        next.style.opacity = "0";
        next.style.transform = "translateX(-24px)";
        requestAnimationFrame(() => requestAnimationFrame(() => {
          next.style.transition = "opacity 720ms ease, transform 760ms cubic-bezier(.2,.75,.25,1)";
          next.style.opacity = "1";
          next.style.transform = "translateX(0)";
        }));

        setTimeout(() => {
          current.style.transition = "none";
          current.style.transform = "translateX(-22px)";
          requestAnimationFrame(() => { current.style.transition = "opacity 720ms ease, transform 760ms cubic-bezier(.2,.75,.25,1)"; });
        }, 800);

        carouselIndex = nextIndex;
      }, studio.carouselSeconds * 1000);
    }
  }

  async function applyPermanentAppearance() {
    let settings = null;
    try { settings = await window.getSiteSettings?.(); } catch (error) { console.warn("Theme studio settings load failed", error); }
    if (!settings) settings = cachedRemoteSettings || {};
    cachedRemoteSettings = settings;

    const studio = studioFrom(settings);
    applyPalette(studio);

    // Keep the clean-system behavior for ordinary banner/page-doll/background uploads.
    if (settings.background_url) {
      document.body?.style.setProperty("--custom-bg-image", `url('${settings.background_url}')`);
    }

    const hero = document.getElementById("homeHero");
    if (hero) {
      const banner = settings.banner_url || "";
      hero.style.backgroundImage = banner
        ? `linear-gradient(100deg, rgba(255,255,255,.68), rgba(255,215,233,.14)), url('${banner}')`
        : "";
    }

    const dollEl = document.getElementById("pageDoll");
    if (dollEl) {
      const doll = settings.pagedoll_url || "";
      if (doll) {
        dollEl.src = doll;
        dollEl.classList.remove("hidden");
      } else {
        dollEl.classList.add("hidden");
      }
    }

    buildCarousel(studio);
    return studio;
  }

  function field(id) { return document.getElementById(id); }

  function createThemeStudioPanel() {
    const settingsMenu = document.querySelector(".settings-menu");
    const settingsContent = document.querySelector(".settings-content");
    if (!settingsMenu || !settingsContent || field("settings-theme-studio")) return;

    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "settings-tab";
    tab.dataset.settingsTab = "theme-studio";
    tab.textContent = "Theme Studio";
    tab.onclick = () => {
      window.showSettingsTab?.("theme-studio");
      loadThemeStudioAdmin();
    };
    const appearanceTab = settingsMenu.querySelector('[data-settings-tab="appearance"]');
    appearanceTab?.insertAdjacentElement("afterend", tab);

    const panel = document.createElement("section");
    panel.id = "settings-theme-studio";
    panel.className = "settings-panel hidden";
    panel.innerHTML = `
      <h3>Theme Studio</h3>
      <p class="small">One permanent live theme. These controls edit the variables already used by <code>style.css</code>; they do not create extra theme files or seasonal layers.</p>
      <label class="small"><input id="studioThemeEnabled" type="checkbox" checked> Use custom theme colors</label>
      <div class="color-grid">
        <label>Canvas <input id="studioPaper" type="color"></label>
        <label>Soft canvas <input id="studioPaper2" type="color"></label>
        <label>Text <input id="studioInk" type="color"></label>
        <label>Muted text <input id="studioMuted" type="color"></label>
        <label>Graphic outline <input id="studioLine" type="color"></label>
        <label>Hot pink <input id="studioPink" type="color"></label>
        <label>Pastel pink <input id="studioPinkSoft" type="color"></label>
        <label>Cyan <input id="studioCyan" type="color"></label>
        <label>Lime accent <input id="studioLime" type="color"></label>
      </div>
      <div class="button-row">
        <button type="button" class="btn primary" id="saveThemeStudioBtn">Save Live Theme</button>
        <button type="button" class="btn" id="resetThemeStudioBtn">Reset Clean Palette</button>
      </div>

      <hr class="soft-line">
      <h3>Banner Character Carousel</h3>
      <p class="small">Upload transparent character PNGs here. The homepage character slot will cycle through them; the outgoing character moves right while fading out.</p>
      <label class="small"><input id="studioCarouselEnabled" type="checkbox" checked> Enable character carousel</label>
      <label class="small">Seconds per character</label>
      <input id="studioCarouselSeconds" type="number" min="3" max="20" step="1" value="6">
      <label class="small">Add character PNGs</label>
      <input id="studioCarouselFiles" type="file" accept="image/*" multiple>
      <div class="button-row"><button type="button" class="btn primary" id="addStudioCarouselBtn">Upload to Carousel</button></div>
      <div id="studioCarouselList" class="admin-gallery-grid"></div>
    `;

    const appearancePanel = field("settings-appearance");
    appearancePanel?.insertAdjacentElement("afterend", panel);

    field("saveThemeStudioBtn")?.addEventListener("click", saveThemeStudio);
    field("resetThemeStudioBtn")?.addEventListener("click", resetThemeStudio);
    field("addStudioCarouselBtn")?.addEventListener("click", addCarouselImages);
  }

  function setColorInput(id, value) {
    const el = field(id);
    if (el) el.value = value || "#000000";
  }

  async function loadThemeStudioAdmin() {
    if (!field("settings-theme-studio")) return;
    const settings = await window.getSiteSettings?.();
    if (!settings) return;
    cachedRemoteSettings = settings;
    const studio = studioFrom(settings);
    field("studioThemeEnabled").checked = studio.enabled;
    field("studioCarouselEnabled").checked = studio.carouselEnabled;
    field("studioCarouselSeconds").value = studio.carouselSeconds;
    setColorInput("studioPaper", studio.colors.paper);
    setColorInput("studioPaper2", studio.colors.paper2);
    setColorInput("studioInk", studio.colors.ink);
    setColorInput("studioMuted", studio.colors.muted);
    setColorInput("studioLine", studio.colors.line);
    setColorInput("studioPink", studio.colors.pink);
    setColorInput("studioPinkSoft", studio.colors.pinkSoft);
    setColorInput("studioCyan", studio.colors.cyan);
    setColorInput("studioLime", studio.colors.lime);
    renderCarouselAdmin(studio.carousel);
  }

  function renderCarouselAdmin(images) {
    const box = field("studioCarouselList");
    if (!box) return;
    if (!images.length) {
      box.innerHTML = '<p class="small">No character PNGs added yet. The neutral placeholder stays visible until you upload one.</p>';
      return;
    }
    box.innerHTML = "";
    images.forEach((url, index) => {
      const card = document.createElement("article");
      card.className = "info-card";
      const img = document.createElement("img");
      img.src = url;
      img.alt = `Carousel character ${index + 1}`;
      Object.assign(img.style, { width: "100%", height: "180px", objectFit: "contain", background: "var(--paper-2)", borderRadius: "16px" });
      const label = document.createElement("p");
      label.className = "small";
      label.textContent = `Character ${index + 1}`;
      const actions = document.createElement("div");
      actions.className = "button-row";
      [["←", -1], ["→", 1]].forEach(([text, delta]) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "btn"; b.textContent = text;
        b.disabled = (delta < 0 && index === 0) || (delta > 0 && index === images.length - 1);
        b.onclick = () => moveCarouselImage(index, delta);
        actions.appendChild(b);
      });
      const remove = document.createElement("button");
      remove.type = "button"; remove.className = "btn danger"; remove.textContent = "Remove";
      remove.onclick = () => removeCarouselImage(index);
      actions.appendChild(remove);
      card.append(img, label, actions);
      box.appendChild(card);
    });
  }

  function colorsFromAdmin() {
    return {
      paper: field("studioPaper")?.value || CLEAN_PALETTE.paper,
      paper2: field("studioPaper2")?.value || CLEAN_PALETTE.paper2,
      ink: field("studioInk")?.value || CLEAN_PALETTE.ink,
      muted: field("studioMuted")?.value || CLEAN_PALETTE.muted,
      line: field("studioLine")?.value || CLEAN_PALETTE.line,
      pink: field("studioPink")?.value || CLEAN_PALETTE.pink,
      pinkSoft: field("studioPinkSoft")?.value || CLEAN_PALETTE.pinkSoft,
      cyan: field("studioCyan")?.value || CLEAN_PALETTE.cyan,
      lime: field("studioLime")?.value || CLEAN_PALETTE.lime
    };
  }

  async function saveStudioPatch(patch, successMessage) {
    const current = await window.getSiteSettings?.();
    if (!current) return alert("Could not load site settings.");
    const themes = parseThemeSettings(current.theme_settings);
    const studio = studioFrom(current);
    themes.studio = { ...studio, ...patch };
    const saved = await window.updateSiteSettings?.({ theme_settings: themes });
    if (!saved) return alert("Could not save Theme Studio settings.");
    cachedRemoteSettings = saved;
    await applyPermanentAppearance();
    await loadThemeStudioAdmin();
    if (successMessage) alert(successMessage);
  }

  async function saveThemeStudio() {
    await saveStudioPatch({
      enabled: Boolean(field("studioThemeEnabled")?.checked),
      colors: colorsFromAdmin(),
      carouselEnabled: Boolean(field("studioCarouselEnabled")?.checked),
      carouselSeconds: Math.max(3, Math.min(20, Number(field("studioCarouselSeconds")?.value || 6)))
    }, "Live theme saved.");
  }

  async function resetThemeStudio() {
    if (!confirm("Reset the live colors to the clean pink / cyan / lime palette? Your carousel images will stay.")) return;
    await saveStudioPatch({ enabled: true, colors: { ...CLEAN_PALETTE } }, "Clean palette restored.");
  }

  async function addCarouselImages() {
    const files = Array.from(field("studioCarouselFiles")?.files || []);
    if (!files.length) return alert("Choose at least one character image first.");
    const current = await window.getSiteSettings?.();
    if (!current) return alert("Could not load site settings.");
    const studio = studioFrom(current);
    const urls = [...studio.carousel];

    for (const file of files) {
      const url = await window.uploadImage?.(file, "banners");
      if (!url) return alert(`Upload failed for ${file.name}.`);
      urls.push(url);
    }

    field("studioCarouselFiles").value = "";
    await saveStudioPatch({ carousel: urls, carouselEnabled: true }, "Character carousel updated.");
  }

  async function moveCarouselImage(index, delta) {
    const current = await window.getSiteSettings?.();
    if (!current) return;
    const studio = studioFrom(current);
    const next = index + delta;
    if (next < 0 || next >= studio.carousel.length) return;
    const urls = [...studio.carousel];
    [urls[index], urls[next]] = [urls[next], urls[index]];
    await saveStudioPatch({ carousel: urls });
  }

  async function removeCarouselImage(index) {
    const current = await window.getSiteSettings?.();
    if (!current) return;
    const studio = studioFrom(current);
    const urls = studio.carousel.filter((_, i) => i !== index);
    // This only removes the image from the carousel list; it does not delete storage data.
    await saveStudioPatch({ carousel: urls });
  }

  // Keep autosync from reviving retired seasonal variables every three seconds.
  window.applySupabaseHomepageSettings = applyPermanentAppearance;
  window.applySiteSettings = applyPermanentAppearance;
  window.loadThemeStudioAdmin = loadThemeStudioAdmin;
  window.saveThemeStudio = saveThemeStudio;

  document.addEventListener("DOMContentLoaded", () => {
    createThemeStudioPanel();
    applyPermanentAppearance();
    if (document.getElementById("adminDashboard")) setTimeout(loadThemeStudioAdmin, 250);
  });
})();
