/* Preserve unsent client messages locally without touching Supabase data. */
(function initClientProgressDraft() {
  if (!/(^|\/)progress\.html$/i.test(location.pathname)) return;

  const commissionId = new URLSearchParams(location.search).get('id');
  if (!commissionId) return;

  const key = `commission-client-draft:${commissionId}`;
  let boundInput = null;

  function readDraft() {
    try { return localStorage.getItem(key) || ''; } catch (_) { return ''; }
  }

  function writeDraft(value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch (_) {}
  }

  function bindInput() {
    const input = document.getElementById('clientChatInput');
    if (!input || input === boundInput) return;

    boundInput = input;
    const saved = readDraft();
    if (!input.value && saved) input.value = saved;

    input.addEventListener('input', () => writeDraft(input.value));
  }

  const observer = new MutationObserver(bindInput);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  bindInput();

  window.addEventListener('pagehide', () => {
    const input = document.getElementById('clientChatInput');
    if (input) writeDraft(input.value);
  });
})();
