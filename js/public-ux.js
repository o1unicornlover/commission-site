/* Shared public-page UX polish: navigation state, dialog focus, and lightweight accessibility announcements. */
(function initPublicUx() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith("/admin.html");
  if (onAdmin) return;

  let lastDialogTrigger = null;

  function ensureStatusRegion() {
    let region = document.getElementById("publicStatus");
    if (region) return region;
    region = document.createElement("div");
    region.id = "publicStatus";
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    Object.assign(region.style, {
      position: "fixed",
      width: "1px",
      height: "1px",
      padding: "0",
      margin: "-1px",
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      border: "0"
    });
    document.body.appendChild(region);
    return region;
  }

  function announce(message) {
    const region = ensureStatusRegion();
    region.textContent = "";
    setTimeout(() => { region.textContent = message || ""; }, 20);
  }

  function normalizePublicNav() {
    const filename = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const activeFile = ["index.html", "pricing.html", "queue.html", "gallery.html", "tos.html"].includes(filename)
      ? filename
      : "";

    document.querySelectorAll(".site-header nav a").forEach(link => {
      link.removeAttribute("aria-current");
      const href = String(link.getAttribute("href") || "").split("#")[0].split("?")[0].toLowerCase();
      if (activeFile && (href === activeFile || (activeFile === "index.html" && (href === "./" || href === "/")))) {
        link.setAttribute("aria-current", "page");
      }
    });

    const nav = document.querySelector(".site-header nav");
    if (nav && !nav.getAttribute("aria-label")) nav.setAttribute("aria-label", "Main navigation");
  }

  function setupDialog(modal, label) {
    if (!modal) return;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    if (!modal.getAttribute("aria-label") && !modal.getAttribute("aria-labelledby")) {
      const heading = modal.querySelector("h1, h2, h3");
      if (heading) {
        if (!heading.id) heading.id = `${modal.id || "dialog"}-title`;
        modal.setAttribute("aria-labelledby", heading.id);
      } else if (label) {
        modal.setAttribute("aria-label", label);
      }
    }
  }

  function focusFirst(modal) {
    const target = modal?.querySelector("input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), a[href]");
    setTimeout(() => target?.focus({ preventScroll: true }), 30);
  }

  function restoreDialogFocus() {
    const target = lastDialogTrigger;
    lastDialogTrigger = null;
    setTimeout(() => target?.focus?.({ preventScroll: true }), 30);
  }

  function wrapDialogFunctions() {
    if (typeof window.openPasswordModal === "function" && !window.openPasswordModal.__publicUxWrapped) {
      const originalOpen = window.openPasswordModal;
      const wrappedOpen = function(...args) {
        lastDialogTrigger = document.activeElement;
        const result = originalOpen.apply(this, args);
        const modal = document.getElementById("passwordModal");
        setupDialog(modal, "Private client access");
        focusFirst(modal);
        announce("Private progress access opened.");
        return result;
      };
      wrappedOpen.__publicUxWrapped = true;
      window.openPasswordModal = wrappedOpen;
    }

    if (typeof window.closeModal === "function" && !window.closeModal.__publicUxWrapped) {
      const originalClose = window.closeModal;
      const wrappedClose = function(...args) {
        const result = originalClose.apply(this, args);
        restoreDialogFocus();
        announce("Private progress access closed.");
        return result;
      };
      wrappedClose.__publicUxWrapped = true;
      window.closeModal = wrappedClose;
    }

    if (typeof window.openGalleryPreview === "function" && !window.openGalleryPreview.__publicUxWrapped) {
      const originalGalleryOpen = window.openGalleryPreview;
      const wrappedGalleryOpen = async function(...args) {
        lastDialogTrigger = document.activeElement;
        const result = await originalGalleryOpen.apply(this, args);
        const modal = document.getElementById("galleryModal");
        setupDialog(modal, "Gallery preview");
        focusFirst(modal);
        announce("Gallery preview opened.");
        return result;
      };
      wrappedGalleryOpen.__publicUxWrapped = true;
      window.openGalleryPreview = wrappedGalleryOpen;
    }

    if (typeof window.closeGalleryPreview === "function" && !window.closeGalleryPreview.__publicUxWrapped) {
      const originalGalleryClose = window.closeGalleryPreview;
      const wrappedGalleryClose = function(...args) {
        const result = originalGalleryClose.apply(this, args);
        restoreDialogFocus();
        announce("Gallery preview closed.");
        return result;
      };
      wrappedGalleryClose.__publicUxWrapped = true;
      window.closeGalleryPreview = wrappedGalleryClose;
    }
  }

  function closeVisibleDialog() {
    const passwordModal = document.getElementById("passwordModal");
    if (passwordModal && !passwordModal.classList.contains("hidden")) {
      window.closeModal?.();
      return true;
    }
    const galleryModal = document.getElementById("galleryModal");
    if (galleryModal && !galleryModal.classList.contains("hidden")) {
      window.closeGalleryPreview?.();
      return true;
    }
    return false;
  }

  function trapDialogTab(event) {
    if (event.key !== "Tab") return;
    const visible = [document.getElementById("passwordModal"), document.getElementById("galleryModal")]
      .find(modal => modal && !modal.classList.contains("hidden"));
    if (!visible) return;
    const focusable = [...visible.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])")]
      .filter(node => !node.hidden && node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function setInitialLoadingCopy() {
    const targets = [
      ["queueGrid", "Loading active commissions…"],
      ["pricingGrid", "Loading pricing…"],
      ["galleryGrid", "Loading gallery…"],
      ["progressArea", "Loading your commission…"]
    ];
    targets.forEach(([id, text]) => {
      const node = document.getElementById(id);
      if (node && !node.textContent.trim() && !node.children.length) {
        node.innerHTML = `<p class="small" aria-live="polite">${text}</p>`;
      }
    });
  }

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && closeVisibleDialog()) {
      event.preventDefault();
      return;
    }
    trapDialogTab(event);
  });

  document.addEventListener("DOMContentLoaded", () => {
    ensureStatusRegion();
    normalizePublicNav();
    setupDialog(document.getElementById("passwordModal"), "Private client access");
    setupDialog(document.getElementById("galleryModal"), "Gallery preview");
    setInitialLoadingCopy();
    wrapDialogFunctions();
  });
})();
