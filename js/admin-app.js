/* Admin-only PWA helpers: installability, client-message notifications, unread badge, and chime. */
(function initAdminApp() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith("/admin.html");
  if (!onAdmin) return;

  let unread = 0;
  let audioCtx = null;
  let notificationChannel = null;
  let notificationsEnabled = localStorage.getItem("adminMessageNotifications") === "true";

  function addManifest() {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "./admin-manifest.webmanifest";
      document.head.appendChild(link);
    }
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = "#ff4da8";
      document.head.appendChild(meta);
    }
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    try { await navigator.serviceWorker.register("./admin-sw.js"); }
    catch (error) { console.warn("Admin service worker registration failed", error); }
  }

  function ensureAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx?.state === "suspended") audioCtx.resume().catch(() => {});
  }

  function chime() {
    if (!notificationsEnabled) return;
    ensureAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    [659.25, 880].forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.13, now + index * 0.12 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.18);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + index * 0.12);
      osc.stop(now + index * 0.12 + 0.2);
    });
  }

  function updateBadge() {
    const btn = document.getElementById("adminNotificationToggle");
    if (btn) btn.textContent = notificationsEnabled ? `🔔 Messages${unread ? ` (${unread})` : ""}` : "🔕 Enable message alerts";
    document.title = unread ? `(${unread}) Admin Dashboard` : "Admin Dashboard";
    if (navigator.setAppBadge) {
      if (unread) navigator.setAppBadge(unread).catch(() => {});
      else navigator.clearAppBadge?.().catch(() => {});
    }
  }

  function clearUnread() {
    unread = 0;
    updateBadge();
  }

  async function showMessageNotification(row) {
    if (!notificationsEnabled || row?.sender !== "client") return;
    unread += 1;
    updateBadge();
    chime();

    const body = String(row?.message || "New client message").slice(0, 150);
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const registration = await navigator.serviceWorker?.ready;
        if (registration?.showNotification) {
          await registration.showNotification("New client message", {
            body,
            icon: "./admin-icon.svg",
            badge: "./admin-icon.svg",
            tag: `chat-${row?.commission_id || "message"}`,
            data: { commissionId: row?.commission_id || "" }
          });
        } else {
          new Notification("New client message", { body, icon: "./admin-icon.svg" });
        }
      } catch (error) { console.warn("Message notification failed", error); }
    }
  }

  async function enableNotifications() {
    ensureAudio();
    if (!("Notification" in window)) {
      notificationsEnabled = true;
      localStorage.setItem("adminMessageNotifications", "true");
      updateBadge();
      return alert("Chime alerts are enabled. This browser does not support desktop notifications.");
    }

    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    notificationsEnabled = permission !== "denied";
    localStorage.setItem("adminMessageNotifications", String(notificationsEnabled));
    updateBadge();
    if (notificationsEnabled) chime();
  }

  function injectControls() {
    if (document.getElementById("adminNotificationToggle")) return;
    const header = document.querySelector(".admin-header nav") || document.querySelector(".admin-header");
    if (!header) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "adminNotificationToggle";
    button.className = "btn";
    button.style.padding = "8px 12px";
    button.addEventListener("click", async () => {
      if (!notificationsEnabled) await enableNotifications();
      else clearUnread();
    });
    header.appendChild(button);
    updateBadge();
  }

  function subscribeToClientMessages() {
    if (!window.supabaseClient || notificationChannel) return;
    notificationChannel = supabaseClient
      .channel(`admin-message-alerts-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, payload => {
        showMessageNotification(payload?.new || {});
      })
      .subscribe(status => console.log("Admin message alerts:", status));
  }

  function armAfterUserGesture() {
    const once = () => {
      if (notificationsEnabled) ensureAudio();
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
    };
    window.addEventListener("pointerdown", once, { once: true });
    window.addEventListener("keydown", once, { once: true });
  }

  window.addEventListener("focus", clearUnread);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) clearUnread(); });

  document.addEventListener("DOMContentLoaded", () => {
    addManifest();
    registerServiceWorker();
    injectControls();
    armAfterUserGesture();
    setTimeout(subscribeToClientMessages, 900);
  });
})();
