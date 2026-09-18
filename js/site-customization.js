/*
  Permanent customization for the single style.css visual system.
  The retired theme/holiday palette is intentionally ignored. This module only
  applies media uploads and manages the homepage character carousel.
*/
(function initSiteCustomization() {
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

  function carouselFrom(settings) {
    const themes = parseThemeSettings(settings?.theme_settings);
    const studio = themes.studio && typeof themes.studio === "object" ? themes.studio : {};
    return {
      carousel: Array.isArray(studio.carousel) ? studio.carousel.filter(Boolean) : [],
      carouselEnabled: studio.carouselEnabled !== false,
      carouselSeconds: Math.max(3, Math.min(20, Number(studio.carouselSeconds || 6)))
    };
  }

  function clearCarouselTimer() {
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = null;
  }

  function buildCarousel(config) {
    const slot = document.querySelector(".banner-character");
    if (!slot) return;
    clearCarouselTimer();
    const images = config.carouselEnabled ? config.carousel : [];
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
    Object.assign(stage.style, { position: "relative", width: "100%", height: "100%", minHeight: "300px" });
    const slides = images.map((url, i) => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.decoding = "async";
      img.loading = i === 0 ? "eager" : "lazy";
      Object.assign(img.style, {
        position: "absolute", inset: "0", width: "100%", height: "100%",
        objectFit: "contain", objectPosition: "center bottom",
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
        current.style.opacity = "0";
        current.style.transform = "translateX(46px)";
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
      }, config.carouselSeconds * 1000);
    }
  }

  async function applyPermanentAppearance() {
    let settings = null;
    try { settings = await window.getSiteSettings?.(); } catch (error) { console.warn("Site media settings load failed", error); }
    if (!settings) settings = cachedRemoteSettings || {};
    cachedRemoteSettings = settings;

    // style.css is the sole owner of the live palette. Saved legacy/theme colors
    // are deliberately not read or applied here.
    if (settings.background_url) document.body?.style.setProperty("--custom-bg-image", `url('${settings.background_url}')`);

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
      if (doll) { dollEl.src = doll; dollEl.classList.remove("hidden"); }
      else dollEl.classList.add("hidden");
    }

    const config = carouselFrom(settings);
    buildCarousel(config);
    return config;
  }

  function field(id) { return document.getElementById(id); }

  function createCarouselPanel() {
    const settingsMenu = document.querySelector(".settings-menu");
    const settingsContent = document.querySelector(".settings-content");
    if (!settingsMenu || !settingsContent || field("settings-carousel")) return;

    // Remove a stale injected Theme Studio tab/panel if an older cached runtime created it.
    settingsMenu.querySelector('[data-settings-tab="theme-studio"]')?.remove();
    field("settings-theme-studio")?.remove();

    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "settings-tab";
    tab.dataset.settingsTab = "carousel";
    tab.textContent = "Homepage Character";
    tab.onclick = () => { window.showSettingsTab?.("carousel"); loadCarouselAdmin(); };
    const appearanceTab = settingsMenu.querySelector('[data-settings-tab="appearance"]');
    appearanceTab?.insertAdjacentElement("afterend", tab);

    const panel = document.createElement("section");
    panel.id = "settings-carousel";
    panel.className = "settings-panel hidden";
    panel.innerHTML = `
      <h3>Homepage Character Carousel</h3>
      <p class="small">Manage transparent character images for the homepage. With no images, the neutral placeholder remains visible.</p>
      <label class="small"><input id="studioCarouselEnabled" type="checkbox" checked> Enable character carousel</label>
      <label class="small">Seconds per character</label>
      <input id="studioCarouselSeconds" type="number" min="3" max="20" step="1" value="6">
      <div class="button-row"><button type="button" class="btn primary" id="saveCarouselSettingsBtn">Save Carousel Settings</button></div>
      <label class="small">Add character images</label>
      <input id="studioCarouselFiles" type="file" accept="image/*" multiple>
      <div class="button-row"><button type="button" class="btn primary" id="addStudioCarouselBtn">Upload to Carousel</button></div>
      <div id="studioCarouselList" class="admin-gallery-grid"></div>`;
    const appearancePanel = field("settings-appearance");
    appearancePanel?.insertAdjacentElement("afterend", panel);
    field("saveCarouselSettingsBtn")?.addEventListener("click", saveCarouselSettings);
    field("addStudioCarouselBtn")?.addEventListener("click", addCarouselImages);
  }

  async function loadCarouselAdmin() {
    if (!field("settings-carousel")) return;
    const settings = await window.getSiteSettings?.();
    if (!settings) return;
    cachedRemoteSettings = settings;
    const config = carouselFrom(settings);
    field("studioCarouselEnabled").checked = config.carouselEnabled;
    field("studioCarouselSeconds").value = config.carouselSeconds;
    renderCarouselAdmin(config.carousel);
  }

  function renderCarouselAdmin(images) {
    const box = field("studioCarouselList");
    if (!box) return;
    if (!images.length) {
      box.innerHTML = '<p class="small">No character images added yet. The neutral placeholder stays visible.</p>';
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
      const label = document.createElement("p"); label.className = "small"; label.textContent = `Character ${index + 1}`;
      const actions = document.createElement("div"); actions.className = "button-row";
      [["←", -1], ["→", 1]].forEach(([text, delta]) => {
        const b = document.createElement("button"); b.type = "button"; b.className = "btn"; b.textContent = text;
        b.disabled = (delta < 0 && index === 0) || (delta > 0 && index === images.length - 1);
        b.onclick = () => moveCarouselImage(index, delta); actions.appendChild(b);
      });
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "btn danger"; remove.textContent = "Remove";
      remove.onclick = () => removeCarouselImage(index); actions.appendChild(remove);
      card.append(img, label, actions); box.appendChild(card);
    });
  }

  async function saveCarouselPatch(patch, successMessage) {
    const current = await window.getSiteSettings?.();
    if (!current) return alert("Could not load site settings.");
    const themes = parseThemeSettings(current.theme_settings);
    const oldStudio = themes.studio && typeof themes.studio === "object" ? themes.studio : {};
    // Preserve unknown stored fields for compatibility, but only carousel fields are writable here.
    themes.studio = { ...oldStudio, ...patch };
    const saved = await window.updateSiteSettings?.({ theme_settings: themes });
    if (!saved) return alert("Could not save carousel settings.");
    cachedRemoteSettings = saved;
    await applyPermanentAppearance();
    await loadCarouselAdmin();
    if (successMessage) alert(successMessage);
  }

  async function saveCarouselSettings() {
    await saveCarouselPatch({
      carouselEnabled: Boolean(field("studioCarouselEnabled")?.checked),
      carouselSeconds: Math.max(3, Math.min(20, Number(field("studioCarouselSeconds")?.value || 6)))
    }, "Carousel settings saved.");
  }

  async function addCarouselImages() {
    const files = Array.from(field("studioCarouselFiles")?.files || []);
    if (!files.length) return alert("Choose at least one character image first.");
    const current = await window.getSiteSettings?.();
    if (!current) return alert("Could not load site settings.");
    const config = carouselFrom(current);
    const urls = [...config.carousel];
    for (const file of files) {
      const url = await window.uploadImage?.(file, "banners");
      if (!url) return alert(`Upload failed for ${file.name}.`);
      urls.push(url);
    }
    field("studioCarouselFiles").value = "";
    await saveCarouselPatch({ carousel: urls, carouselEnabled: true }, "Character carousel updated.");
  }

  async function moveCarouselImage(index, delta) {
    const current = await window.getSiteSettings?.(); if (!current) return;
    const config = carouselFrom(current); const next = index + delta;
    if (next < 0 || next >= config.carousel.length) return;
    const urls = [...config.carousel]; [urls[index], urls[next]] = [urls[next], urls[index]];
    await saveCarouselPatch({ carousel: urls });
  }

  async function removeCarouselImage(index) {
    const current = await window.getSiteSettings?.(); if (!current) return;
    const config = carouselFrom(current);
    await saveCarouselPatch({ carousel: config.carousel.filter((_, i) => i !== index) });
  }

  window.applySupabaseHomepageSettings = applyPermanentAppearance;
  window.applySiteSettings = applyPermanentAppearance;
  window.loadThemeStudioAdmin = loadCarouselAdmin; // compatibility for older callers only

  document.addEventListener("DOMContentLoaded", () => {
    createCarouselPanel();
    applyPermanentAppearance();
    if (document.getElementById("adminDashboard")) setTimeout(loadCarouselAdmin, 250);
  });
})();
