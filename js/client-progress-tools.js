/* Client progress-page quality-of-life tools. Preserves existing realtime/polling render flow. */
(function initClientProgressTools() {
  const onProgress = /(^|\/)progress\.html$/i.test(location.pathname) || location.pathname.endsWith('/progress.html');
  if (!onProgress) return;

  const DRAFT_PREFIX = 'clientProgressDraft:';
  let observer = null;
  let activeTextarea = null;
  let activeMessages = null;

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

  function ensureConnectionNote(textarea) {
    const parent = textarea?.parentElement;
    if (!parent) return null;
    let note = parent.querySelector('[data-client-connection-note]');
    if (!note) {
      note = document.createElement('p');
      note.className = 'small';
      note.dataset.clientConnectionNote = 'true';
      note.setAttribute('role', 'status');
      note.setAttribute('aria-live', 'polite');
      textarea.insertAdjacentElement('beforebegin', note);
    }
    return note;
  }

  function updateConnectionState() {
    const textarea = document.getElementById('clientChatInput');
    const button = textarea?.parentElement?.querySelector('button[onclick*="sendChatMessage"]');
    const note = ensureConnectionNote(textarea);
    if (!textarea || !note) return;

    const online = navigator.onLine !== false;
    const message = online
      ? 'Messages sync with the artist automatically.'
      : 'You are offline. Your draft is saved on this device and can be sent when you reconnect.';
    if (note.textContent !== message) note.textContent = message;
    note.dataset.state = online ? 'online' : 'offline';
    textarea.setAttribute('aria-describedby', note.id || '');
    if (!note.id) {
      note.id = 'clientChatConnectionState';
      textarea.setAttribute('aria-describedby', note.id);
    }
    if (button) {
      button.disabled = !online;
      button.title = online ? '' : 'Reconnect to send this message';
    }
  }

  function decorateComposer() {
    const textarea = document.getElementById('clientChatInput');
    if (!textarea) return;
    restoreDraft(textarea);
    updateConnectionState();
    if (activeTextarea === textarea) return;
    activeTextarea = textarea;

    textarea.setAttribute('aria-label', 'Message to artist');
    textarea.setAttribute('enterkeyhint', 'send');

    const button = textarea.parentElement?.querySelector('button[onclick*="sendChatMessage"]');
    if (button) button.setAttribute('aria-label', 'Send message to artist');

    textarea.addEventListener('keydown', event => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
      event.preventDefault();
      if (!textarea.value.trim() || navigator.onLine === false) return;
      button?.click();
    });
  }

  function nearBottom(node) {
    if (!node) return true;
    return node.scrollHeight - node.scrollTop - node.clientHeight < 90;
  }

  function watchSuccessfulSend() {
    const messages = document.getElementById('clientChatMessages');
    if (!messages || messages.dataset.clientToolsWatched === 'true') return;
    messages.dataset.clientToolsWatched = 'true';
    activeMessages = messages;
    let previous = messages.textContent || '';
    let shouldFollow = true;

    messages.addEventListener('scroll', () => {
      shouldFollow = nearBottom(messages);
    }, { passive: true });

    const messageObserver = new MutationObserver(() => {
      const current = messages.textContent || '';
      if (current !== previous) {
        previous = current;
        const textarea = document.getElementById('clientChatInput');
        if (textarea && !textarea.value.trim()) {
          localStorage.removeItem(draftKey());
          announce('Conversation updated');
        }
        if (shouldFollow) requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
      }
    });
    messageObserver.observe(messages, { childList: true, subtree: true, characterData: true });

    if (nearBottom(messages)) requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
  }

  function decorate() {
    decorateComposer();
    watchSuccessfulSend();
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => decorate());
    // The workspace is replaced as a direct child of progressArea. Observing
    // descendants also catches this helper's own note updates and can loop.
    observer.observe(document.getElementById('progressArea') || document.body, { childList: true });
  }

  function handleOnline() {
    updateConnectionState();
    announce('Back online. You can send your saved draft now.');
  }

  function handleOffline() {
    updateConnectionState();
    announce('You are offline. Your message draft will stay saved on this device.');
  }

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      decorate();
      startObserver();
      updateConnectionState();
    }, 700);
  });
})();
