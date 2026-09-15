(()=>{
'use strict';
const COUNT='nexa.guest.chat.count';
const LIMIT=10;
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
function authed(){return !!sessionStorage.getItem('nexa.user.session')}
function showGate(){
 if(authed()||document.getElementById('nexaGuestGate'))return;
 const s=document.createElement('style');s.id='nexaGuestGateStyle';s.textContent='#nexaGuestGate{position:fixed;inset:0;z-index:30000;display:grid;place-items:center;background:rgba(2,8,14,.72);backdrop-filter:blur(12px);padding:20px}#nexaGuestGate .box{width:min(440px,100%);background:#0c1822;border:1px solid #314552;border-radius:20px;padding:28px;box-shadow:0 25px 90px #000b;color:#edf6ff}#nexaGuestGate h2{margin:0 0 8px;font-size:24px}#nexaGuestGate p{color:#9eb0bd;line-height:1.6;font-size:13px;margin:0 0 20px}#nexaGuestGate .buttons{display:grid;grid-template-columns:1fr 1fr;gap:10px}#nexaGuestGate a{display:block;text-align:center;text-decoration:none;border-radius:11px;padding:12px;font-weight:800}#nexaGuestGate .primary{background:#edf6ff;color:#071018}#nexaGuestGate .secondary{border:1px solid #3b5362;color:#dce9f1;background:#101f2a}#nexaGuestGate small{display:block;color:#718796;text-align:center;margin-top:15px}';document.head.appendChild(s);
 const d=document.createElement('div');d.id='nexaGuestGate';d.innerHTML='<div class="box"><div style="color:#64ddb2;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:10px">NEXA AI • PUBLIC ACCESS</div><h2>Your 10 free chats are complete</h2><p>Continue with Nexa AI by signing in to an existing account or registering for a new one.</p><div class="buttons"><a class="primary" href="/auth.html?next=%2F">Sign in</a><a class="secondary" href="/auth.html?mode=register&next=%2F">Register</a></div><small>Your conversations remain in this browser unless you choose to save them through an account.</small></div>';
 document.body.appendChild(d);
}
function count(){return Math.min(LIMIT,Number(localStorage.getItem(COUNT)||'0'))}
function bind(){
 if(!window.NexaApp||window.NexaApp._guestGateBound)return;
 const original=window.NexaApp.chat;window.NexaApp._guestGateBound=true;
 window.NexaApp.chat=async function(text,mode){
   if(authed())return original(text,mode);
   if(count()>=LIMIT){showGate();throw new Error('Guest chat limit reached. Please sign in or register.');}
   const result=await original(text,mode);
   const n=count()+1;localStorage.setItem(COUNT,String(n));
   if(n>=LIMIT)showGate();
   return result;
 };
}
function wait(){if(window.NexaApp){bind();return}setTimeout(wait,50)}
wait();
})();
