(() => {
  const $ = id => document.getElementById(id);
  const toast = message => window.toast ? window.toast(message) : alert(message);
  const panel = (title, body) => `<div class="panel"><h2>${title}</h2>${body}</div>`;
  const safe = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function mount(id, html) { const el = $(id); if (el) el.innerHTML = html; }

  // Web Search
  const webView = document.createElement('div');
  webView.id = 'websearch'; webView.className = 'view';
  webView.innerHTML = panel('Web Search', '<p>Search the live web through your preferred search provider. No API key is exposed to the browser.</p><div class="finder"><input id="webQuery" placeholder="Search the web…"><select id="webEngine"><option value="google">Google</option><option value="bing">Bing</option><option value="duck">DuckDuckGo</option></select><button class="smallbtn send" id="webGo">Search</button></div><div id="webResults"></div>');
  const workspace = document.querySelector('.workspace'); if (workspace) workspace.appendChild(webView);
  $('webGo')?.addEventListener('click', () => { const q = $('webQuery').value.trim(); if (!q) return toast('Enter a search query'); const engines={google:'https://www.google.com/search?q=',bing:'https://www.bing.com/search?q=',duck:'https://duckduckgo.com/?q='}; const url=engines[$('webEngine').value]+encodeURIComponent(q); $('webResults').innerHTML=`<div class="result"><b>Web search ready</b><p>Open results for <b>${safe(q)}</b>.</p><a href="${url}" target="_blank" rel="noopener">Open search results ↗</a></div>`; window.open(url,'_blank','noopener'); });

  // Functional file/document workspace.
  const docView = $('documents');
  if (docView) docView.innerHTML = panel('Documents', '<p>Upload a text, Markdown, JSON, CSV or compatible text document for instant browser-side extraction. Files remain in your browser unless you explicitly send their text to Nexa AI.</p><div class="finder"><input type="file" id="docFile" accept=".txt,.md,.json,.csv,.log,.xml,.html,.htm,.rtf"><button class="smallbtn send" id="docAnalyze">Analyze</button></div><div id="docOutput"></div>');
  $('docAnalyze')?.addEventListener('click', async () => { const f=$('docFile')?.files?.[0]; if(!f) return toast('Choose a document first'); if(f.size>5*1024*1024) return toast('File is larger than 5 MB'); try { const text=await f.text(); const preview=text.slice(0,12000); $('docOutput').innerHTML=`<div class="card"><h3>${safe(f.name)}</h3><p>${text.length.toLocaleString()} characters · ${f.type||'text document'}</p><pre style="white-space:pre-wrap;max-height:320px;overflow:auto;background:#f5f8fc;padding:12px;border-radius:8px;font-size:11px">${safe(preview)}</pre><button class="primary" id="docAsk">Ask Nexa AI about this document</button></div>`; $('docAsk').onclick=()=>window.ask(`Summarize and extract the key points from this document:\n\n${preview}`); } catch { toast('Unable to read this document in the browser'); } });

  // Image analysis workspace: preview + safe handoff prompt.
  const imageView=$('images');
  if(imageView) imageView.innerHTML=panel('Image Analysis','<p>Preview an image locally and send a description request to Nexa AI. The current backend accepts text chat; image bytes are not uploaded without an explicit image-capable endpoint.</p><div class="finder"><input type="file" id="imageFile" accept="image/*"><button class="smallbtn send" id="imageLoad">Preview</button></div><div id="imageOutput"></div>');
  $('imageLoad')?.addEventListener('click',()=>{const f=$('imageFile')?.files?.[0];if(!f)return toast('Choose an image first');const u=URL.createObjectURL(f);$('imageOutput').innerHTML=`<div class="card"><h3>${safe(f.name)}</h3><img src="${u}" alt="Selected image" style="max-width:100%;max-height:420px;border-radius:10px;margin-top:8px"><p>Image preview loaded locally. When an image-capable backend is enabled, this workspace can be connected to direct visual analysis.</p></div>`});

  // Research workspace.
  const research=$('research');
  if(research) research.innerHTML=panel('Research & Guidelines','<p>Build a research question, evidence-search query or guideline review prompt.</p><div class="finder"><input id="researchTopic" placeholder="e.g. telemedicine access in rural J&K"><select id="researchType"><option>Research question</option><option>Literature search</option><option>Guideline review</option><option>Study outline</option></select><button class="smallbtn send" id="researchGo">Generate</button></div><div id="researchOutput"></div>');
  $('researchGo')?.addEventListener('click',()=>{const t=$('researchTopic').value.trim();if(!t)return toast('Enter a research topic');const type=$('researchType').value;window.ask(`Act as a research assistant. Create a ${type.toLowerCase()} for this topic: ${t}. Clearly separate established evidence from questions that require current authoritative sources.`)});

  // Integrations: live backend capability check.
  const integrations=$('integrations');
  if(integrations) integrations.innerHTML=panel('Integrations','<p>Connected services are detected from the protected Nexa AI backend. Secrets are never displayed.</p><div id="integrationStatus" class="cards"><div class="card"><h3>Checking…</h3><p>Loading service capabilities.</p></div></div>');
  fetch('/v1/voice/capabilities').then(r=>r.json()).then(d=>{const p=d.providers||{};const x=$('integrationStatus');if(x)x.innerHTML=`<div class="card"><h3>Voice Services</h3><p>Speech-to-text: <b>${d.speechToText?'Online':'Unavailable'}</b><br>Text-to-speech: <b>${d.textToSpeech?'Online':'Unavailable'}</b><br>ElevenLabs: <b>${p.elevenlabs?'Connected':'Fallback mode'}</b><br>Cloudflare Voice: <b>${p.cloudflare?'Available':'Unavailable'}</b></p></div>`}).catch(()=>{const x=$('integrationStatus');if(x)x.innerHTML='<div class="card"><h3>Backend unavailable</h3><p>Check Pages Functions and environment bindings.</p></div>'});

  // Community links / actions.
  const community=$('community');
  if(community) community.innerHTML=panel('Community','<p>SpringNexa community initiatives focused on rural healthcare, digital inclusion and skill development.</p><div class="cards"><div class="card"><h3>Rural Healthcare</h3><p>Explore ideas for improving access to diagnostics and telehealth.</p><button class="smallbtn" data-community="rural healthcare">Explore</button></div><div class="card"><h3>Skill Development</h3><p>Generate a community training plan for healthcare or technology skills.</p><button class="smallbtn" data-community="skill development">Create plan</button></div><div class="card"><h3>Digital Inclusion</h3><p>Plan technology access initiatives for underserved communities.</p><button class="smallbtn" data-community="digital inclusion">Plan initiative</button></div></div>');
  document.querySelectorAll('[data-community]').forEach(b=>b.onclick=()=>window.ask(`Help SpringNexa design a practical ${b.dataset.community} initiative for Jammu & Kashmir.`));

  // Settings persist locally.
  const settings=$('settings');
  if(settings) { const lang=localStorage.getItem('nexa.language')||'English'; settings.innerHTML=panel('Settings',`<p>Preferences are stored locally in this browser.</p><div class="finder"><select id="prefLang"><option>English</option><option>Hindi</option><option>Urdu</option><option>Kashmiri</option><option>Dogri</option><option>Gojri</option></select><select id="prefTheme"><option value="system">System theme</option><option value="light">Light</option><option value="dark">Dark</option></select><button class="smallbtn send" id="savePrefs">Save</button></div><div id="prefSaved" class="result">Current language: ${safe(lang)}</div>`; $('prefLang').value=lang; $('savePrefs').onclick=()=>{localStorage.setItem('nexa.language',$('prefLang').value);localStorage.setItem('nexa.theme',$('prefTheme').value);$('prefSaved').textContent='Preferences saved.';toast('Nexa AI preferences saved')}; }

  // Replace the Web Search tab's previous toast-only handler.
  document.querySelectorAll('.tab').forEach(t=>{if(t.textContent.includes('Web Search'))t.onclick=()=>window.show('websearch')});

  // Make every sidebar workspace item resolve to a real view.
  document.querySelectorAll('.nav[data-view]').forEach(n=>{const id=n.dataset.view;if(!$(id)){n.onclick=()=>toast(`${n.textContent.trim()} is not available in this build`)} });
})();
