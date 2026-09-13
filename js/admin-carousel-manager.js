/* Admin manager for the homepage character carousel.
   Keeps carousel settings inside existing theme_settings.studio for compatibility,
   but never reads, edits, or applies stored theme colors. */
(function initAdminCarouselManager() {
  if (window.__adminCarouselManagerReady) return;
  window.__adminCarouselManagerReady = true;

  let cachedImages = [];

  function parseSettings(raw) {
    if (!raw) return {};
    if (typeof raw === "string") {
      try { return JSON.parse(raw) || {}; } catch { return {}; }
    }
    return typeof raw === "object" ? { ...raw } : {};
  }

  function readCarousel(settings) {
    const themes = parseSettings(settings?.theme_settings);
    const studio = themes.studio && typeof themes.studio === "object" ? themes.studio : {};
    return {
      themes,
      studio,
      images: Array.isArray(studio.carousel) ? studio.carousel.filter(Boolean) : [],
      enabled: studio.carouselEnabled !== false,
      seconds: Math.max(3, Math.min(20, Number(studio.carouselSeconds || 6)))
    };
  }

  function ensurePanel() {
    const appearance = document.getElementById("settings-appearance");
    if (!appearance || document.getElementById("adminCharacterCarousel")) return;

    const section = document.createElement("section");
    section.id = "adminCharacterCarousel";
    section.innerHTML = `
      <hr class="soft-line">
      <h3>Homepage Character Carousel</h3>
      <p class="small">Upload transparent character PNGs for the homepage hero. If the carousel is empty or disabled, the neutral character placeholder remains visible.</p>
      <label class="small"><input id="adminCarouselEnabled" type="checkbox" checked> Enable character carousel</label>
      <label class="small" for="adminCarouselSeconds">Seconds per character</label>
      <input id="adminCarouselSeconds" type="number" min="3" max="20" step="1" value="6">
      <label class="small" for="adminCarouselFiles">Add character images</label>
      <input id="adminCarouselFiles" type="file" accept="image/*" multiple>
      <div class="button-row">
        <button type="button" class="btn primary" id="adminCarouselUpload">Upload characters</button>
        <button type="button" class="btn" id="adminCarouselSave">Save carousel settings</button>
      </div>
      <div id="adminCarouselList" class="admin-gallery-grid"></div>`;

    appearance.appendChild(section);
    document.getElementById("adminCarouselUpload")?.addEventListener("click", uploadCharacters);
    document.getElementById("adminCarouselSave")?.addEventListener("click", saveOptions);
    refresh().catch(error => console.warn("Carousel manager refresh failed", error));
  }

  function renderList(images) {
    cachedImages = [...images];
    const box = document.getElementById("adminCarouselList");
    if (!box) return;
    box.innerHTML = "";

    if (!images.length) {
      const empty = document.createElement("p");
      empty.className = "small";
      empty.textContent = "No carousel characters yet. The neutral placeholder will stay visible.";
      box.appendChild(empty);
      return;
    }

    images.forEach((url, index) => {
      const card = document.createElement("article");
      card.className = "info-card";

      const img = document.createElement("img");
      img.src = url;
      img.alt = `Carousel character ${index + 1}`;
      Object.assign(img.style, {
        width: "100%",
        height: "180px",
        objectFit: "contain",
        background: "var(--paper-2)",
        borderRadius: "16px"
      });

      const label = document.createElement("p");
      label.className = "small";
      label.textContent = `Character ${index + 1}`;

      const actions = document.createElement("div");
      actions.className = "button-row";

      const left = document.createElement("button");
      left.type = "button";
      left.className = "btn";
      left.textContent = "←";
      left.disabled = index === 0;
      left.addEventListener("click", () => moveImage(index, -1));

      const right = document.createElement("button");
      right.type = "button";
      right.className = "btn";
      right.textContent = "→";
      right.disabled = index === images.length - 1;
      right.addEventListener("click", () => moveImage(index, 1));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn danger";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => removeImage(index));

      actions.append(left, right, remove);
      card.append(img, label, actions);
      box.appendChild(card);
    });
  }

  async function writeCarousel(images, options = {}) {
    const current = await window.getSiteSettings?.();
    if (!current) return false;
    const parsed = readCarousel(current);
    parsed.themes.studio = {
      ...parsed.studio,
      carousel: images,
      carouselEnabled: options.enabled ?? parsed.enabled,
      carouselSeconds: options.seconds ?? parsed.seconds
    };
    const saved = await window.updateSiteSettings?.({ theme_settings: parsed.themes });
    if (!saved) return false;
    cachedImages = [...images];
    return true;
  }

  async function refresh() {
    const current = await window.getSiteSettings?.();
    if (!current) return;
    const parsed = readCarousel(current);
    const enabled = document.getElementById("adminCarouselEnabled");
    const seconds = document.getElementById("adminCarouselSeconds");
    if (enabled) enabled.checked = parsed.enabled;
    if (seconds) seconds.value = String(parsed.seconds);
    renderList(parsed.images);
  }

  async function saveOptions() {
    const enabled = Boolean(document.getElementById("adminCarouselEnabled")?.checked);
    const seconds = Math.max(3, Math.min(20, Number(document.getElementById("adminCarouselSeconds")?.value || 6)));
    const saved = await writeCarousel(cachedImages, { enabled, seconds });
    if (!saved) return alert("Could not save carousel settings.");
    alert("Carousel settings saved.");
  }

  async function uploadCharacters() {
    const input = document.getElementById("adminCarouselFiles");
    const files = Array.from(input?.files || []);
    if (!files.length) return alert("Choose at least one character image first.");

    const button = document.getElementById("adminCarouselUpload");
    if (button) {
      button.disabled = true;
      button.textContent = "Uploading…";
    }

    try {
      const next = [...cachedImages];
      for (const file of files) {
        const url = await window.uploadImage?.(file, "pagedolls");
        if (url) next.push(url);
      }
      if (next.length === cachedImages.length) return alert("No character images could be uploaded.");
      const saved = await writeCarousel(next);
      if (!saved) return alert("Images uploaded, but the carousel settings could not be saved.");
      if (input) input.value = "";
      await refresh();
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Upload characters";
      }
    }
  }

  async function moveImage(index, delta) {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= cachedImages.length) return;
    const next = [...cachedImages];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    if (await writeCarousel(next)) renderList(next);
  }

  async function removeImage(index) {
    if (!confirm("Remove this character from the carousel? The uploaded file itself will not be deleted.")) return;
    const next = cachedImages.filter((_, i) => i !== index);
    if (await writeCarousel(next)) renderList(next);
  }

  function start() {
    ensurePanel();
    const appearanceTab = document.querySelector('[data-settings-tab="appearance"]');
    appearanceTab?.addEventListener("click", () => setTimeout(() => refresh().catch(() => {}), 0));
  }

  window.refreshAdminCharacterCarousel = refresh;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
  window.addEventListener("admin-runtime-ready", start, { once: true });
})();
