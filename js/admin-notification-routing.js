/* Keep generic PWA notification clicks useful even when no commission id is attached. */
(function initAdminNotificationRouting() {
  if (!navigator.serviceWorker) return;

  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data?.type !== "open-inbox-commission") return;
    const commissionId = String(event.data?.commissionId || "").trim();
    if (commissionId) return; // Commission-specific routing is handled by admin-app/admin-routing.

    history.replaceState(null, "", "#inbox");
    if (typeof window.showAdminPage === "function") {
      window.showAdminPage("inbox");
      window.renderAdminInbox?.(true);
    }
  });
})();
