(()=>{
'use strict';
const AUTH='nexa.user.session';
const history=[];
let installed=false;
const wait=()=>{
  if(installed)return;
  if(!window.NexaApp||typeof window.NexaApp.chat!=='function'){setTimeout(wait,50);return}
  installed=true;
  window.NexaApp.chat=async function(text,mode='auto'){
    text=String(text||'').trim();
    if(!text) return '';
    const messages=[
      {role:'system',content:'You are Nexa AI, powered by SpringNexa Private Limited. Be accurate, useful and concise. Never invent facts, citations, doctors, hospitals or credentials.'},
      ...history.slice(-20),
      {role:'user',content:text}
    ];
    const headers={'content-type':'application/json'};
    const token=sessionStorage.getItem(AUTH);
    if(token)headers.authorization='Bearer '+token;
    const r=await fetch('/v1/chat/completions',{method:'POST',headers,cache:'no-store',body:JSON.stringify({mode,language:localStorage.getItem('nexa.language')||'English',messages})});
    let d=null;try{d=await r.json()}catch{}
    if(!r.ok){
      const detail=d?.detail?` (${d.detail})`:'';
      if(d?.code==='GUEST_LIMIT_REACHED')window.dispatchEvent(new CustomEvent('nexa:guest-limit'));
      throw new Error((d?.error||`Nexa AI request failed (${r.status})`)+detail);
    }
    const answer=d?.choices?.[0]?.message?.content;
    if(typeof answer!=='string'||!answer.trim())throw new Error('Nexa AI returned an empty response.');
    history.push({role:'user',content:text},{role:'assistant',content:answer});
    return answer;
  };
};
wait();
})();
