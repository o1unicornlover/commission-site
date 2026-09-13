/* Keep commission tracker creation and slot capacity in sync. */
(function initAdminSlotSync() {
  if (window.__adminSlotSyncReady) return;
  window.__adminSlotSyncReady = true;

  function canonicalType(value) {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return '';
    if (/(^|\b)(2d|illustration|drawing|art)(\b|$)/.test(text) && !/3d/.test(text)) return '2d';
    if (/(^|\b)(3d|model|modeling|modelling|sculpt|sculpting)(\b|$)/.test(text)) return '3d';
    if (/(^|\b)(animation|animated|animatic|motion)(\b|$)/.test(text)) return 'animation';
    return text.replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function scoreSlot(slot, commissionType) {
    const rawSlot = String(slot?.commission_type || '').trim().toLowerCase();
    const rawType = String(commissionType || '').trim().toLowerCase();
    if (!rawSlot || !rawType) return 0;
    if (rawSlot === rawType) return 100;
    const slotKind = canonicalType(rawSlot);
    const typeKind = canonicalType(rawType);
    if (slotKind && typeKind && slotKind === typeKind) return 80;
    if (rawType.includes(rawSlot) || rawSlot.includes(rawType)) return 60;
    return 0;
  }

  async function findMatchingSlot(commissionType) {
    if (typeof window.getSlots !== 'function') return null;
    const slots = await window.getSlots();
    return (slots || [])
      .map(slot => ({ slot, score: scoreSlot(slot, commissionType) }))
      .filter(row => row.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.slot || null;
  }

  async function consumeMatchingSlot(commissionType) {
    const slot = await findMatchingSlot(commissionType);
    if (!slot || typeof window.updateSlot !== 'function') {
      console.warn(`No matching slot found for commission type: ${commissionType}`);
      return null;
    }

    const max = Math.max(1, Number(slot.max_slots || 1));
    const used = Math.max(0, Number(slot.used_slots || 0));
    const nextUsed = Math.min(max, used + 1);
    const manuallyClosed = slot.is_open === false && used < max;
    const nextOpen = manuallyClosed ? false : nextUsed < max;

    const updated = await window.updateSlot(slot.id, {
      used_slots: nextUsed,
      is_open: nextOpen
    });

    if (updated) {
      await Promise.allSettled([
        Promise.resolve(window.renderSlotAdmin?.()),
        Promise.resolve(window.renderCommissionInfo?.()),
        Promise.resolve(window.refreshAdminDashboardCore?.()),
        Promise.resolve(window.refreshAdminDashboard?.(true))
      ]);
      window.dispatchEvent(new CustomEvent('admin-slots-changed', {
        detail: { slot: updated, commissionType, consumed: nextUsed > used }
      }));
    }
    return updated;
  }

  async function addCommissionTypeSuggestions() {
    const input = document.getElementById('commissionType');
    if (!input || typeof window.getSlots !== 'function') return;
    const slots = await window.getSlots();
    let list = document.getElementById('commissionTypeOptions');
    if (!list) {
      list = document.createElement('datalist');
      list.id = 'commissionTypeOptions';
      input.insertAdjacentElement('afterend', list);
      input.setAttribute('list', list.id);
    }
    list.innerHTML = (slots || [])
      .map(slot => `<option value="${String(slot.commission_type || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}"></option>`)
      .join('');
  }

  function wrapCreateCommission() {
    if (window.__adminCreateCommissionSlotWrapped || typeof window.createCommission !== 'function') return;
    const original = window.createCommission;
    window.__adminCreateCommissionSlotWrapped = true;
    window.createCommission = async function createCommissionWithSlotSync(values = {}) {
      const created = await original.call(this, values);
      if (created) {
        try { await consumeMatchingSlot(created.commission_type || values.commission_type || ''); }
        catch (error) { console.warn('Commission created, but slot sync failed', error); }
      }
      return created;
    };
  }

  function start() {
    wrapCreateCommission();
    addCommissionTypeSuggestions().catch(error => console.warn('Commission type suggestions failed', error));
  }

  window.consumeMatchingSlot = consumeMatchingSlot;
  window.refreshCommissionTypeSuggestions = addCommissionTypeSuggestions;
  start();
  window.addEventListener('admin-runtime-ready', start, { once: true });
})();