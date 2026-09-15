(()=>{
const K='nexa.user.session';
function isAuth(){return !!sessionStorage.getItem(K)}
function loadGuestGate(){if(document.querySelector('script[data-guest-gate]'))return;const s=document.createElement('script');s.src='/guest-gate.js';s.defer=true;s.dataset.guestGate='1';document.head.appendChild(s)}
function add(){
  const path=location.pathname;
  if(path==='/admin.html'||path==='/auth.html'||path==='/trust.html'||path==='/architecture.html')return;
  document.querySelectorAll('a[href="/admin.html"]').forEach(e=>e.remove());
  loadGuestGate();
  if(document.getElementById('nexaAccountLink'))return;
  const style=document.createElement('style');style.textContent='.nexa-account{display:inline-flex;align-items:center;gap:7px;text-decoration:none;border:1px solid rgba(180,218,255,.24);background:rgba(7,25,41,.82);color:#e7f5ff;border-radius:20px;padding:7px 11px;font-size:11px;font-weight:800;white-space:nowrap}.nexa-account:hover{border-color:#1689ff;background:#0b2a45}.nexa-account-dot{width:7px;height:7px;border-radius:50%;background:#58dfad;box-shadow:0 0 10px #58dfad}.nexa-account-out{border:0;background:transparent;color:#91abc0;font-size:10px;cursor:pointer;margin-left:2px}';document.head.appendChild(style);
  const a=document.createElement('a');a.id='nexaAccountLink';a.className='nexa-account';a.href='/auth.html';a.innerHTML='<span class="nexa-account-dot"></span><span>Sign in / Register</span>';
  const target=document.querySelector('.top-actions')||document.querySelector('.topbar');if(target)target.prepend(a);else{a.style.position='fixed';a.style.right='16px';a.style.top='14px';a.style.zIndex='100';document.body.appendChild(a)}
  refresh(a);
}
async function refresh(a){const t=sessionStorage.getItem(K);if(!t)return;try{const r=await fetch('/v1/auth/me',{headers:{authorization:'Bearer '+t},cache:'no-store'});if(!r.ok){sessionStorage.removeItem(K);return}const d=await r.json();a.href='/auth.html';a.innerHTML='<span class="nexa-account-dot"></span><span>'+esc(d.user.name)+'</span><button type="button" class="nexa-account-out">Sign out</button>';a.querySelector('button').onclick=async e=>{e.preventDefault();try{await fetch('/v1/auth/logout',{method:'POST',headers:{authorization:'Bearer '+t}})}finally{sessionStorage.removeItem(K);location.reload()}}}catch{}}
function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
})();
