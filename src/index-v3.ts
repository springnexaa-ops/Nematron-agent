import worker from './index-v2';

type User={id:string,name:string,email:string,role:string,status:'pending'|'accepted'|'rejected',passwordHash:string,createdAt:string,updatedAt:string};
type Session={userId:string,expiresAt:number};
const users=new Map<string,User>();
const sessions=new Map<string,Session>();
const guestChats=new Map<string,{count:number,resetAt:number}>();
const GUEST_LIMIT=10;
const SESSION_MS=24*60*60*1000;
const encoder=new TextEncoder();
const clean=(v:any,max=200)=>String(v??'').trim().slice(0,max);
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const makeId=()=>crypto.randomUUID();
async function hashPassword(password:string){
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:120000,hash:'SHA-256'},key,256);
  const b64=(b:ArrayBuffer)=>btoa(String.fromCharCode(...new Uint8Array(b)));
  return `${b64(salt)}.${b64(bits)}`;
}
async function verifyPassword(password:string,stored:string){
  try{
    const [s,p]=stored.split('.');if(!s||!p)return false;
    const salt=Uint8Array.from(atob(s),c=>c.charCodeAt(0));
    const expected=Uint8Array.from(atob(p),c=>c.charCodeAt(0));
    const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
    const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:120000,hash:'SHA-256'},key,256));
    return bits.length===expected.length&&bits.every((v,i)=>v===expected[i]);
  }catch{return false}
}
const publicUser=(u:User)=>({id:u.id,name:u.name,email:u.email,role:u.role,status:u.status,createdAt:u.createdAt,updatedAt:u.updatedAt});
function tokenFrom(request:Request){const h=request.headers.get('authorization')||'';return h.startsWith('Bearer ')?h.slice(7):''}
function userFromRequest(request:Request){const t=tokenFrom(request),s=sessions.get(t);if(!s||s.expiresAt<Date.now()){if(t)sessions.delete(t);return null}return users.get(s.userId)||null}
function isAdmin(request:Request,env:any){const token=tokenFrom(request);return !!token&&!!env.ADMIN_TOKEN&&token===env.ADMIN_TOKEN}
function guestKey(request:Request){return request.headers.get('CF-Connecting-IP')||'guest'}
function consumeGuestChat(request:Request){
  const now=Date.now(),key=guestKey(request);let q=guestChats.get(key);
  if(!q||q.resetAt<now){q={count:0,resetAt:now+24*60*60*1000};guestChats.set(key,q)}
  if(q.count>=GUEST_LIMIT)return false;
  q.count++;return true;
}
function guestRemaining(request:Request){const q=guestChats.get(guestKey(request));return Math.max(0,GUEST_LIMIT-(q?.count||0))}
function guestResponseHeaders(response:Response,remaining:number){const h=new Headers(response.headers);h.set('X-Nexa-Guest-Remaining',String(remaining));h.set('X-Nexa-Guest-Limit',String(GUEST_LIMIT));return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h})}
function publicProtected(path:string){return path==='/v1/chat/completions'||path==='/v1/audio/speech'||path==='/v1/audio/transcriptions'||path==='/v1/vision'||path==='/v1/telemetry'}
async function authApi(request:Request,env:any,url:URL):Promise<Response|null>{
  if(url.pathname==='/v1/auth/register'&&request.method==='POST'){
    const b:any=await request.json().catch(()=>({}));const name=clean(b.name,100),email=clean(b.email,160).toLowerCase(),password=String(b.password||'');
    if(!name||!email.includes('@')||password.length<10)return json({error:'Name, valid email and a password of at least 10 characters are required.'},400);
    if([...users.values()].some(u=>u.email===email))return json({error:'An account with this email already exists.'},409);
    const now=new Date().toISOString();const u:User={id:makeId(),name,email,role:'User',status:'pending',passwordHash:await hashPassword(password),createdAt:now,updatedAt:now};users.set(u.id,u);
    return json({ok:true,status:'pending',message:'Registration received. Your account is pending approval.',user:publicUser(u)},201);
  }
  if(url.pathname==='/v1/auth/login'&&request.method==='POST'){
    const b:any=await request.json().catch(()=>({}));const email=clean(b.email,160).toLowerCase(),password=String(b.password||'');const u=[...users.values()].find(x=>x.email===email);
    if(!u||!(await verifyPassword(password,u.passwordHash)))return json({error:'Invalid email or password.'},401);
    if(u.status!=='accepted')return json({error:u.status==='pending'?'Your account is awaiting approval.':'This account is not active.'},403);
    const token=crypto.randomUUID()+crypto.randomUUID();sessions.set(token,{userId:u.id,expiresAt:Date.now()+SESSION_MS});return json({ok:true,token,expiresAt:Date.now()+SESSION_MS,user:publicUser(u)});
  }
  if(url.pathname==='/v1/auth/me'&&request.method==='GET'){const u=userFromRequest(request);return u?json({ok:true,user:publicUser(u)}):json({error:'Authentication required'},401)}
  if(url.pathname==='/v1/auth/logout'&&request.method==='POST'){sessions.delete(tokenFrom(request));return json({ok:true})}
  if(url.pathname==='/v1/auth/guest'&&request.method==='GET'){const u=userFromRequest(request);return json({authenticated:!!u,remaining:u?null:guestRemaining(request),limit:GUEST_LIMIT})}
  if(url.pathname.startsWith('/v1/admin/users')){
    if(!isAdmin(request,env))return json({error:'Unauthorized'},401);
    const suffix=url.pathname.slice('/v1/admin/users'.length).replace(/^\//,'');
    if(request.method==='GET'&&!suffix)return json({ok:true,persistent:false,storage:'worker-memory',users:[...users.values()].map(publicUser)});
    if(request.method==='POST'&&!suffix){const b:any=await request.json().catch(()=>({}));const name=clean(b.name,100),email=clean(b.email,160).toLowerCase(),role=clean(b.role,60)||'User';if(!name||!email.includes('@'))return json({error:'Name and a valid email are required.'},400);if([...users.values()].some(u=>u.email===email))return json({error:'A user with this email already exists.'},409);const now=new Date().toISOString();const u:User={id:makeId(),name,email,role,status:'pending',passwordHash:await hashPassword(crypto.randomUUID()),createdAt:now,updatedAt:now};users.set(u.id,u);return json({ok:true,user:publicUser(u)},201)}
    const u=users.get(suffix);if(!u)return json({error:'User not found'},404);
    if(request.method==='PATCH'){const b:any=await request.json().catch(()=>({}));if(b.name!==undefined)u.name=clean(b.name,100)||u.name;if(b.email!==undefined){const email=clean(b.email,160).toLowerCase();if(!email.includes('@'))return json({error:'Invalid email.'},400);u.email=email}if(b.role!==undefined)u.role=clean(b.role,60)||u.role;if(['pending','accepted','rejected'].includes(b.status))u.status=b.status;if(typeof b.password==='string'&&b.password.length>=10)u.passwordHash=await hashPassword(b.password);u.updatedAt=new Date().toISOString();for(const[t,s]of sessions)if(s.userId===u.id)sessions.delete(t);return json({ok:true,user:publicUser(u)})}
    if(request.method==='DELETE'){for(const[t,s]of sessions)if(s.userId===u.id)sessions.delete(t);users.delete(u.id);return json({ok:true,deleted:u.id})}
  }
  return null;
}
async function publicAssets(request:Request,env:any){
  const response=await worker.fetch(request,env);const url=new URL(request.url);const ct=response.headers.get('content-type')||'';
  if(!ct.includes('text/html')||url.pathname==='/admin.html'||url.pathname==='/auth.html'||url.pathname==='/trust.html'||url.pathname==='/architecture.html')return response;
  const html=await response.text();
  const sanitized=html.replace(/<a[^>]+href=["']\/admin\.html["'][^>]*>[\s\S]*?<\/a>/gi,'');
  let injected=sanitized.includes('/auth-widget.js')?sanitized:sanitized.replace('</body>','<script src="/auth-widget.js" defer></script></body>');
  if(!injected.includes('/auth-fetch.js'))injected=injected.replace('</body>','<script src="/auth-fetch.js" defer></script></body>');
  if(!injected.includes('/nexa-shell.js'))injected=injected.replace('</body>','<script src="/nexa-shell.js" defer></script></body>');
  const h=new Headers(response.headers);h.delete('content-length');h.set('cache-control','no-store');return new Response(injected,{status:response.status,statusText:response.statusText,headers:h});
}
export default{async fetch(request:Request,env:any):Promise<Response>{
  const url=new URL(request.url);const a=await authApi(request,env,url);if(a)return a;
  if(publicProtected(url.pathname)){
    const user=userFromRequest(request);
    if(!user&&url.pathname==='/v1/chat/completions'){
      if(!consumeGuestChat(request))return json({error:'Guest limit reached. Sign in or register to continue.',code:'GUEST_LIMIT_REACHED',login:'/auth.html',remaining:0},401);
      const response=await worker.fetch(request,env);return guestResponseHeaders(response,guestRemaining(request));
    }
    if(!user)return json({error:'Authentication required',code:'AUTH_REQUIRED',login:'/auth.html'},401);
  }
  return publicAssets(request,env);
}};
