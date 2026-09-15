(()=>{
  function run(){
    document.querySelectorAll('.profile').forEach(p=>{const b=p.querySelector('b'),s=p.querySelector('small');if(b)b.textContent='Public User';if(s)s.textContent='Nexa AI Public Access'});
    document.querySelectorAll('.avatar').forEach(a=>{a.textContent='N';a.title='Public Nexa AI'});
    document.querySelectorAll('.nexa-admin-btn,.nexa-admin-panel').forEach(e=>e.remove());
    document.querySelectorAll('.stat').forEach(s=>{const txt=s.textContent.toLowerCase();if(txt.includes('live users')){const b=s.querySelector('b');if(b)b.textContent='—';const sp=s.querySelector('span');if(sp)sp.textContent='Live users (admin only)'}else if(txt.includes('total queries')){const b=s.querySelector('b');if(b)b.textContent='—';const sp=s.querySelector('span');if(sp)sp.textContent='Queries (live analytics)'}else if(txt.includes('hospitals')){const b=s.querySelector('b');if(b)b.textContent='Verified only';const sp=s.querySelector('span');if(sp)sp.textContent='Provider directory'}else if(txt.includes('active sessions')){const b=s.querySelector('b');if(b)b.textContent='—';const sp=s.querySelector('span');if(sp)sp.textContent='Active sessions (admin only)'}});
    document.querySelectorAll('.online').forEach(e=>{e.textContent='● Nexa AI API checking…'});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
