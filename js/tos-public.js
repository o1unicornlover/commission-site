/* Small standalone TOS renderer. Keeps this public page independent of the
   legacy application bundle used by the admin dashboard. */
(function initStandaloneTos() {
  const grid = document.getElementById('tosGrid');
  if (!grid) return;

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[char]);
  }

  function sectionsFrom(content) {
    return String(content || '').trim().split(/\n(?=##\s+)/g).map((chunk, index) => {
      const lines = chunk.trim().split('\n');
      const heading = lines.shift() || '';
      return {
        title: heading.startsWith('## ') ? heading.slice(3).trim() : `Section ${index + 1}`,
        text: lines.join('\n').trim()
      };
    }).filter(section => section.title || section.text);
  }

  function render(content) {
    const sections = sectionsFrom(content);
    grid.innerHTML = sections.map(section => `
      <article class="info-card">
        <h3>${escapeHTML(section.title)}</h3>
        <p>${escapeHTML(section.text).replace(/\n/g, '<br>')}</p>
      </article>`).join('') || '<p class="small">No TOS sections yet.</p>';
    grid.removeAttribute('aria-busy');
  }

  async function load() {
    const started = Date.now();
    while (typeof window.getTos !== 'function' && Date.now() - started < 8000) {
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    if (typeof window.getTos !== 'function') {
      grid.innerHTML = '<p class="small" role="alert">Terms could not load. Refresh to try again.</p>';
      grid.removeAttribute('aria-busy');
      return;
    }
    try {
      const tos = await Promise.race([
        window.getTos(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      ]);
      render(tos?.content || '');
    } catch (error) {
      console.error('TOS page failed to load:', error);
      grid.innerHTML = '<p class="small" role="alert">Terms could not load. Refresh to try again.</p>';
      grid.removeAttribute('aria-busy');
    }
  }

  load();
})();
