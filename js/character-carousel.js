/* Homepage character carousel for the single fixed visual system.
   Reads only carousel settings from site_settings.theme_settings.
   Stored legacy/theme color values are intentionally ignored. */
(function initCharacterCarousel() {
  if (window.__characterCarouselReady) return;
  window.__characterCarouselReady = true;

  let timer = null;
  let runToken = 0;

  function parseSettings(raw) {
    if (!raw) return {};
    if (typeof raw === "string") {
      try { return JSON.parse(raw) || {}; } catch { return {}; }
    }
    return typeof raw === "object" ? raw : {};
  }

  function carouselConfig(settings) {
    const themeSettings = parseSettings(settings?.theme_settings);
    const studio = themeSettings?.studio && typeof themeSettings.studio === "object"
      ? themeSettings.studio
      : {};
    return {
      images: Array.isArray(studio.carousel) ? studio.carousel.filter(Boolean) : [],
      enabled: studio.carouselEnabled !== false,
      seconds: Math.max(3, Math.min(20, Number(studio.carouselSeconds || 6)))
    };
  }

  function clearTimer() {
    if (timer) clearInterval(timer);
    timer = null;
    runToken += 1;
  }

  function restoreNeutralPlaceholder(slot) {
    if (!slot || !slot.dataset.carouselReady) return;
    const original = slot.dataset.carouselPlaceholder || "";
    if (original) slot.innerHTML = original;
    slot.removeAttribute("data-carousel-ready");
  }

  function buildCarousel(config) {
    const slot = document.querySelector(".banner-character");
    if (!slot) return;

    clearTimer();
    if (!slot.dataset.carouselPlaceholder) {
      slot.dataset.carouselPlaceholder = slot.innerHTML;
    }

    const images = config.enabled ? config.images : [];
    if (!images.length) {
      restoreNeutralPlaceholder(slot);
      return;
    }

    slot.dataset.carouselReady = "true";
    slot.innerHTML = "";

    const stage = document.createElement("div");
    stage.className = "character-carousel-stage";
    stage.setAttribute("aria-hidden", "true");
    Object.assign(stage.style, {
      position: "relative",
      width: "100%",
      height: "100%",
      minHeight: "300px"
    });

    const slides = images.map((url, index) => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.decoding = "async";
      img.loading = index === 0 ? "eager" : "lazy";
      Object.assign(img.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        objectFit: "contain",
        objectPosition: "center bottom",
        opacity: index === 0 ? "1" : "0",
        transform: index === 0 ? "translateX(0)" : "translateX(-22px)",
        transition: "opacity 720ms ease, transform 760ms cubic-bezier(.2,.75,.25,1)",
        filter: "drop-shadow(0 18px 24px rgba(25,23,29,.12))"
      });
      img.addEventListener("error", () => {
        img.style.display = "none";
      }, { once: true });
      stage.appendChild(img);
      return img;
    });

    slot.appendChild(stage);
    if (slides.length < 2) return;

    let index = 0;
    const token = runToken;
    timer = setInterval(() => {
      if (token !== runToken || document.hidden) return;
      const current = slides[index];
      const nextIndex = (index + 1) % slides.length;
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
        if (token !== runToken) return;
        current.style.transition = "none";
        current.style.transform = "translateX(-22px)";
        requestAnimationFrame(() => {
          current.style.transition = "opacity 720ms ease, transform 760ms cubic-bezier(.2,.75,.25,1)";
        });
      }, 800);
      index = nextIndex;
    }, config.seconds * 1000);
  }

  async function refreshCharacterCarousel() {
    let settings = null;
    try { settings = await window.getSiteSettings?.(); }
    catch (error) { console.warn("Character carousel settings load failed", error); }
    buildCarousel(carouselConfig(settings || {}));
  }

  window.refreshCharacterCarousel = refreshCharacterCarousel;

  const start = () => refreshCharacterCarousel();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.addEventListener("focus", () => {
    if (!document.hidden) refreshCharacterCarousel();
  });
})();
