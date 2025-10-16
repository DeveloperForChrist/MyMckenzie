// Frontend integration to verify backend and Postgres connectivity
// Adds a small badge to the page to show DB status and exposes a helper on window
(function () {
  const STATE = {
    ok: { bg: '#0d9488', fg: '#ffffff', label: 'DB: ok' }, // teal
    error: { bg: '#dc2626', fg: '#ffffff', label: 'DB: error' }, // red
    loading: { bg: '#4b5563', fg: '#ffffff', label: 'DB: checking…' }, // gray
  };

  function fetchJson(url, options = {}, timeoutMs = 6000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const opts = { ...options, headers: { 'Accept': 'application/json', ...(options.headers || {}) }, signal: controller.signal };
    return fetch(url, opts)
      .then(async (res) => {
        clearTimeout(id);
        const text = await res.text();
        let json;
        try { json = text ? JSON.parse(text) : {}; } catch {
          json = { raw: text };
        }
        if (!res.ok) {
          const err = new Error(`HTTP ${res.status}`);
          err.response = json;
          throw err;
        }
        return json;
      })
      .catch((e) => {
        clearTimeout(id);
        throw e;
      });
  }

  function createBadge() {
    const badge = document.createElement('div');
    badge.id = 'db-status-badge';
    Object.assign(badge.style, {
      position: 'fixed',
      bottom: '12px',
      right: '12px',
      zIndex: 9999,
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
      fontSize: '12px',
      lineHeight: '1.3',
      padding: '8px 10px',
      borderRadius: '6px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      cursor: 'default',
      userSelect: 'none',
      transition: 'opacity .15s ease',
    });

    const label = document.createElement('div');
    label.style.fontWeight = '600';
    label.textContent = STATE.loading.label;

    const sub = document.createElement('div');
    sub.style.opacity = '0.9';
    sub.textContent = 'checking…';

    const hint = document.createElement('div');
    hint.style.marginTop = '4px';
    hint.style.opacity = '0.8';
    hint.style.fontSize = '11px';
    hint.textContent = 'click to retry';

    badge.appendChild(label);
    badge.appendChild(sub);
    badge.appendChild(hint);

    function setState(state, msg) {
      badge.style.background = state.bg;
      badge.style.color = state.fg;
      label.textContent = state.label;
      sub.textContent = msg || '';
    }

    badge.setState = setState;
    document.body.appendChild(badge);
    return badge;
  }

  let badge;
  function ensureBadge() {
    if (!badge) badge = document.getElementById('db-status-badge') || createBadge();
    return badge;
  }

  async function checkBackend() {
    const b = ensureBadge();
    b.setState(STATE.loading, 'checking…');
    try {
      const health = await fetchJson('/api/db/health', { method: 'GET' });
      if (!health || health.status !== 'ok') {
        throw new Error('health not ok');
      }
      // Version is informational; ignore failure
      let version = '';
      try {
        const v = await fetchJson('/api/db/version', { method: 'GET' });
        if (v && v.version) version = String(v.version).split(' on ')[0];
      } catch {}
      b.setState(STATE.ok, version ? version : 'connected');
      return { ok: true, version };
    } catch (e) {
      // Try diagnostics for more detail
      let detail = e && e.message ? e.message : 'connection error';
      try {
        const d = await fetchJson('/api/db/diag', { method: 'GET' });
        if (d && d.error) detail = d.error;
      } catch (dErr) {
        // keep original detail
      }
      b.setState(STATE.error, detail);
      return { ok: false, error: detail };
    }
  }

  function init() {
    const b = ensureBadge();
    b.addEventListener('click', () => {
      checkBackend();
    });
    // First check after DOM ready
    checkBackend();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Optional global access
  window.mckenzieBackend = {
    check: checkBackend,
  };
})();
