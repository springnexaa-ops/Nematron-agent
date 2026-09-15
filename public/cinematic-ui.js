(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function openView(id) {
    const nav = $(`.nav[data-view="${id}"]`);
    if (nav) { nav.click(); return; }
    document.dispatchEvent(new CustomEvent('nexa:open-view', { detail: { id } }));
  }

  function focusChat() {
    openView('chat');
    setTimeout(() => $('.composerInput')?.focus(), 80);
  }

  function bindOpeners() {
    $$('[data-open-view]').forEach(el => {
      if (el.dataset.cinematicBound) return;
      el.dataset.cinematicBound = '1';
      el.addEventListener('click', e => {
        e.preventDefault();
        const id = el.dataset.openView;
        if (id === 'chat') focusChat(); else openView(id);
      });
    });
  }

  function bindSearch() {
    const input = $('#cinematicSearch');
    const form = $('#cinematicSearchForm');
    if (!input || !form || form.dataset.bound) return;
    form.dataset.bound = '1';
    form.addEventListener('submit', e => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return focusChat();
      focusChat();
      setTimeout(() => window.NexaApp?.chat?.(q), 100);
    });
  }

  function bindHeroComposer() {
    const form = $('#heroComposer');
    const input = $('#heroInput');
    if (!form || !input || form.dataset.bound) return;
    form.dataset.bound = '1';
    form.addEventListener('submit', e => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return input.focus();
      input.value = '';
      focusChat();
      setTimeout(() => window.NexaApp?.chat?.(q), 100);
    });
  }

  function bindQuickPrompts() {
    $$('[data-prompt]').forEach(el => {
      if (el.dataset.promptBound) return;
      el.dataset.promptBound = '1';
      el.addEventListener('click', () => {
        focusChat();
        setTimeout(() => window.NexaApp?.chat?.(el.dataset.prompt), 100);
      });
    });
  }

  function init() {
    bindOpeners();
    bindSearch();
    bindHeroComposer();
    bindQuickPrompts();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.addEventListener('load', init);
})();
