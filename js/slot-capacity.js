/* Public slot-capacity guard. Capacity reached always reads as closed without rewriting stored data. */
(function installSlotCapacityGuard() {
  if (window.__slotCapacityGuardReady) return;
  window.__slotCapacityGuardReady = true;

  const escapeText = value => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  function slotState(slot) {
    const max = Math.max(1, Number(slot?.max_slots || 1));
    const used = Math.max(0, Math.min(max, Number(slot?.used_slots || 0)));
    const open = slot?.is_open !== false && used < max;
    return { max, used, open };
  }

  async function renderCapacityAwareCommissionInfo() {
    const grid = document.getElementById("commissionInfoGrid");
    if (!grid || typeof window.getSlots !== "function") return;

    const slots = await window.getSlots();
    grid.innerHTML = (slots || []).map(slot => {
      const state = slotState(slot);
      return `
        <article class="info-card slot-home-row">
          <div><h3>${escapeText(slot.commission_type || "Commission Type")}</h3></div>
          <span class="pill ${state.open ? "" : "closed-pill"}">
            ${state.open ? `${state.used}/${state.max} slots` : "Closed"}
          </span>
        </article>`;
    }).join("") || '<p class="small">Commission availability will appear here.</p>';
  }

  window.slotCapacityState = slotState;
  window.renderCommissionInfo = renderCapacityAwareCommissionInfo;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderCapacityAwareCommissionInfo, { once: true });
  } else {
    renderCapacityAwareCommissionInfo();
  }

  window.addEventListener("focus", () => {
    if (!document.hidden) renderCapacityAwareCommissionInfo();
  });
})();
