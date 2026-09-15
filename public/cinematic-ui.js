(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function cinematicSkin() {
    if ($('#nexaCinematicSkin')) return;
    const s = document.createElement('style');
    s.id = 'nexaCinematicSkin';
    s.textContent = `
      body:before{background-image:linear-gradient(180deg,rgba(2,10,18,.08),rgba(2,10,18,.72)),url("https://images.pexels.com/photos/20655202/pexels-photo-20655202.jpeg?auto=compress&cs=tinysrgb&w=2400")!important}
      .view:not(#home) .panel,.view:not(#home) .chat-view{position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(3,17,29,.82),rgba(5,29,47,.78)),url("https://images.pexels.com/photos/20655202/pexels-photo-20655202.jpeg?auto=compress&cs=tinysrgb&w=1800") center/cover fixed!important;backdrop-filter:blur(16px)}
      .view:not(#home) .panel:before,.view:not(#home) .chat-view:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(2,12,21,.82),rgba(2,12,21,.42),rgba(2,12,21,.72));pointer-events:none}
      .view:not(#home) .panel>* ,.view:not(#home) .chat-view>*{position:relative;z-index:1}
      .cinematic-panel-head{display:inline-flex;align-items:center;padding:6px 10px;border:1px solid rgba(105,225,188,.28);border-radius:20px;color:#69e1bc;font-size:10px;letter-spacing:.13em;text-transform:uppercase;background:rgba(2,18,28,.48);margin-bottom:8px}
      .view:not(#home) .panel h2{font-family:Georgia,serif;font-size:34px;text-shadow:0 5px 25px #0008}
      .view:not(#home) .panel .finder input,.view:not(#home) .panel .finder select,.view:not(#home) .panel textarea{background:rgba(3,17,29,.78);backdrop-filter:blur(10px)}
      .view:not(#home) .panel .result,.view:not(#home) .panel .card{background:rgba(4,20,33,.72);backdrop-filter:blur(12px)}
    `;
    document.head.appendChild(s);
  }

  function setActive(id) {
    $$('.view').forEach(v => v.classList.toggle('active', v.id === id));
    $$('.nav[data-view]').forEach(n => n.classList.toggle('active', n.dataset.view === id));
  }

  function openView(id) {
    const nav = $(`.nav[data-view="${id}"]`);
    if (nav) { nav.click(); return; }
    document.dispatchEvent(new CustomEvent('nexa:open-view', { detail: { id } }));
  }

  function focusChat() {
    openView('chat');
    setTimeout(() => $('.composerInput')?.focus(), 80);
  }

  function webSearchView() {
    let v = $('#websearch');
    if (!v) {
      v = document.createElement('section');
      v.id = 'websearch';
      v.className = 'view';
      $('.workspace')?.appendChild(v);
    }
    v.innerHTML = `<div class="panel"><div class="cinematic-panel-head">NEXA AI • LIVE WEB</div><h2>Web Search</h2><p>Search current web results through your selected search engine.</p><form class="finder" id="nexaWebForm"><input id="nexaWebQ" placeholder="Search hospitals, guidelines, research, news…" autocomplete="off"><select id="nexaWebEngine"><option value="google">Google</option><option value="bing">Bing</option><option value="duck">DuckDuckGo</option></select><button class="smallbtn send" type="submit">Search</button></form><div id="nexaWebOut" class="result">Ready.</div></div>`;
    setActive('websearch');
    $('#nexaWebForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const q = $('#nexaWebQ')?.value.trim();
      if (!q) return;
      const engine = $('#nexaWebEngine').value;
      const base = engine === 'bing' ? 'https://www.bing.com/search?q=' : engine === 'duck' ? 'https://duckduckgo.com/?q=' : 'https://www.google.com/search?q=';
      const url = base + encodeURIComponent(q);
      $('#nexaWebOut').innerHTML = `<a href="${url}" target="_blank" rel="noopener">Open live ${engine} results ↗</a>`;
      window.open(url, '_blank', 'noopener');
    });
  }

  function ensureFallback(id, label) {
    setTimeout(() => {
      if (id === 'websearch') return webSearchView();
      if (id === 'home') { setActive('home'); return; }
      const v = document.getElementById(id);
      if (!v || !v.innerHTML.trim()) {
        const target = v || document.createElement('section');
        target.id = id; target.className = 'view';
        target.innerHTML = `<div class="panel"><div class="cinematic-panel-head">NEXA AI • SPRINGNEXA</div><h2>${label}</h2><p>This workspace is connected to Nexa AI. Use the controls here or return to Home.</p><button class="smallbtn" id="fallbackChat">Ask Nexa AI</button><div class="result">Workspace ready.</div></div>`;
        if (!v) $('.workspace')?.appendChild(target);
        setActive(id);
        $('#fallbackChat')?.addEventListener('click', focusChat);
      }
    }, 160);
  }

  function bindNavigation() {
    $$('.nav[data-view]').forEach(nav => {
      if (nav.dataset.cinematicNavBound) return;
      nav.dataset.cinematicNavBound = '1';
      nav.addEventListener('click', () => {
        const id = nav.dataset.view;
        if (id === 'websearch') {
          setTimeout(webSearchView, 0);
        } else {
          ensureFallback(id, nav.querySelector('span:last-child')?.textContent?.trim() || nav.textContent.trim());
        }
      });
    });
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
    cinematicSkin();
    bindNavigation();
    bindOpeners();
    bindSearch();
    bindHeroComposer();
    bindQuickPrompts();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.addEventListener('load', init);
})();
