/** Nexa AI public/admin security helpers. Never store passwords or API secrets in source. */
export const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "content-security-policy": "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; img-src 'self' data: https://images.pexels.com; media-src 'self' blob:; connect-src 'self' https://api.elevenlabs.io https://generativelanguage.googleapis.com https://api.groq.com https://integrate.api.nvidia.com https://router.huggingface.co https://images.pexels.com"
};
export function withSecurityHeaders(response: Response): Response { const headers=new Headers(response.headers); for(const [k,v] of Object.entries(SECURITY_HEADERS)) headers.set(k,v); return new Response(response.body,{status:response.status,statusText:response.statusText,headers}); }
export function clientIp(request: Request): string { return request.headers.get("CF-Connecting-IP") || "unknown"; }
const buckets=new Map<string,{count:number;reset:number}>();
export function rateLimit(key:string,limit=60,windowMs=60000):boolean { const now=Date.now(),cur=buckets.get(key); if(!cur||cur.reset<=now){buckets.set(key,{count:1,reset:now+windowMs});return true;} if(cur.count>=limit)return false;cur.count++;return true; }
export function constantTimeEqual(a:string,b:string):boolean { if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0; }
export function cookieToken(request:Request):string|null { const cookies=request.headers.get("cookie")||"";const m=cookies.match(/(?:^|;\s*)nexa_admin=([^;]+)/);return m?decodeURIComponent(m[1]):null; }
export function isAdminRequest(request:Request,adminToken?:string):boolean { if(!adminToken)return false;const auth=request.headers.get("authorization")||"";const bearer=auth.startsWith("Bearer ")?auth.slice(7):"";return constantTimeEqual(bearer||cookieToken(request)||"",adminToken); }
export function adminCookie(token:string):string { return `nexa_admin=${encodeURIComponent(token)}; Max-Age=28800; Path=/; HttpOnly; Secure; SameSite=Strict`; }
export const clearAdminCookie="nexa_admin=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict";
