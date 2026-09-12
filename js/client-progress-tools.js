/* Client progress-page quality-of-life tools. Preserves existing realtime/polling render flow. */
(function initClientProgressTools() {
  const onProgress = /(^|\/)progress\.html$/i.test(location.pathname) || location.pathname.endsWith('/progress.html');
  if (!onProgress) return;

  const DRAFT_PREFIX = 'clientProgressDraft:';
  let observer = null;
  let activeTextarea = null;

  function commissionId() {
    return new URLSearchParams(location.search).get('id') || 'unknown';
  }

  function draftKey() {
    return `${DRAFT_PREFIX}${commissionId()}`;
  }

  function announce(message) {
    let node = document.getElementById('clientProgressLiveStatus');
    if (!node) {
      node = document.createElement('div');
      node.id = 'clientProgressLiveStatus';
      node.className = 'sr-only';
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      document.body.appendChild(node);
    }
    node.textContent = '';
    requestAnimationFrame(() => { node.textContent = message; });
  }

  function restoreDraft(textarea) {
    if (!textarea || textarea.dataset.draftReady === 'true') return;
    textarea.dataset.draftReady = 'true';
    const saved = localStorage.getItem(draftKey()) || '';
    if (!textarea.value && saved) textarea.value = saved;
    textarea.addEventListener('input', () => {
      const value = textarea.value;
      if (value.trim()) localStorage.setItem(draftKey(), value);
      else localStorage.removeItem(draftKey());
    });
  }

  function decorateComposer() {
    const textarea = document.getElementById('clientChatInput');
    if (!textarea) return;
    restoreDraft(textarea);
    if (activeTextarea === textarea) return;
    activeTextarea = textarea;

    textarea.setAttribute('aria-label', 'Message to artist');
    textarea.setAttribute('enterkeyhint', 'send');

    const button = textarea.parentElement?.querySelector('button[onclick*="sendChatMessage"]');
    if (button) button.setAttribute('aria-label', 'Send message to artist');

    textarea.addEventListener('keydown', async event => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
      event.preventDefault();
      if (!textarea.value.trim()) return;
      button?.click();
    });
  }

  function watchSuccessfulSend() {
    const messages = document.getElementById('clientChatMessages');
    if (!messages || messages.dataset.clientToolsWatched === 'true') return;
    messages.dataset.clientToolsWatched = 'true';
    let previous = messages.textContent || '';
    const messageObserver = new MutationObserver(() => {
      const current = messages.textContent || '';
      if (current !== previous) {
        previous = current;
        const textarea = document.getElementById('clientChatInput');
        if (textarea && !textarea.value.trim()) {
          localStorage.removeItem(draftKey());
          announce('Conversation updated');
        }
      }
    });
    messageObserver.observe(messages, { childList: true, subtree: true, characterData: true });
  }

  function decorate() {
    decorateComposer();
    watchSuccessfulSend();
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => decorate());
    observer.observe(document.getElementById('progressArea') || document.body, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      decorate();
      startObserver();
    }, 700);
  });
})();
