import worker, { type Env } from "../src/index";
import { adminCookie, clearAdminCookie, constantTimeEqual } from "../src/security";

const MEDICAL_TERMS = /\b(symptom|symptoms|pain|fever|cough|breathless|breathing|chest|heart|blood pressure|bp|diabetes|sugar|stroke|seizure|epilepsy|headache|migraine|dizziness|weakness|numbness|tingling|pregnan|medicine|medication|dose|diagnosis|doctor|hospital|clinic|lab|test|ecg|eeg|emg|ncs|nerve|medical|health)\b/i;
function medicalQuery(text: string) { return MEDICAL_TERMS.test(text); }
function json(data: unknown, status=200, headers?: HeadersInit) { return new Response(JSON.stringify(data), { status, headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store", ...(headers||{}) } }); }

export const onRequest = async (context: any) => {
  const url = new URL(context.request.url);
  const env = context.env as Env;
  const isApi = url.pathname === "/health" || url.pathname.startsWith("/v1/");

  if (isApi) {
    if (url.pathname === "/v1/admin/login" && context.request.method === "POST") {
      if (!env.ADMIN_TOKEN) return json({ error:"Admin authentication is not configured" }, 503);
      try {
        const body: any = await context.request.json();
        const token = typeof body?.token === "string" ? body.token : "";
        if (!token || !constantTimeEqual(token, env.ADMIN_TOKEN)) return json({ error:"Invalid administrator credentials" }, 401);
        return json({ ok:true, authenticated:true, expiresIn:28800 }, 200, { "set-cookie": adminCookie(env.ADMIN_TOKEN) });
      } catch { return json({ error:"Invalid request" }, 400); }
    }
    if (url.pathname === "/v1/admin/logout" && context.request.method === "POST") return json({ ok:true }, 200, { "set-cookie": clearAdminCookie });
    if (url.pathname === "/v1/medical/providers" && context.request.method === "GET") {
      const specialty = url.searchParams.get("specialty") || "";
      return json({ ok:true, verifiedOnly:true, specialty, providers:[], message:"No verified provider records are configured yet. Nexa AI does not fabricate provider names." });
    }
    if (url.pathname === "/v1/medical/search" && context.request.method === "POST") {
      try { const body:any=await context.request.json(); const q=typeof body?.query === "string" ? body.query : ""; return json({ ok:true, verifiedOnly:true, query:q, medical:medicalQuery(q), providers:[], message:"Provider search is verified-only; no provider names are fabricated." }); }
      catch { return json({ error:"Invalid request" },400); }
    }
    if (url.pathname === "/v1/chat/completions" && context.request.method === "POST") {
      try {
        const body:any = await context.request.clone().json();
        const selected = typeof body?.mode === "string" ? body.mode.toLowerCase() : "auto";
        if (selected === "auto") {
          const messages = Array.isArray(body?.messages) ? body.messages : [];
          const latest = [...messages].reverse().find((m:any)=>m?.role === "user" && typeof m.content === "string")?.content || "";
          if (medicalQuery(latest)) {
            const rewritten = new Request(context.request, { headers: new Headers(context.request.headers), body: JSON.stringify({ ...body, mode:"medical" }) });
            return worker.fetch(rewritten, env);
          }
        }
      } catch { /* worker returns the canonical validation error */ }
    }
    return worker.fetch(context.request, env);
  }

  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;
  const html = await response.text();
  let injected = html;
  if (!injected.includes('/tabs.js')) injected = injected.replace('</body>', '<script src="/tabs.js"></script></body>');
  if (!injected.includes('/admin.js')) injected = injected.replace('</body>', '<script src="/admin.js"></script></body>');
  injected = injected.replaceAll('https://springnexa.in/assets/springnexa-universal-logo.jpg','/springnexa-logo.svg');
  const headers = new Headers(response.headers); headers.delete("content-length");
  return new Response(injected, { status: response.status, statusText: response.statusText, headers });
};
