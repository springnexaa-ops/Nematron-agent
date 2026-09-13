export interface Env {
  AI: Ai;
  GROQ_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  NVIDIA_API_KEY?: string;
  GROQ_MODEL?: string;
  GOOGLE_MODEL?: string;
  NVIDIA_MODEL?: string;
}

type Message = { role: "system" | "user" | "assistant"; content: string };
type ProviderResult = { content: string; provider: string; model: string };

const DEFAULT_SYSTEM = "You are Nematron Agent, a fast, concise and capable AI assistant. Answer directly and accurately.";
const TIMEOUT_MS = 12000;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" }
  });
}

function messages(body: any): Message[] {
  const m = Array.isArray(body?.messages) ? body.messages : [];
  return m.filter((x: any) => x && ["system", "user", "assistant"].includes(x.role) && typeof x.content === "string").slice(-30);
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  return fetch(url, { ...init, signal });
}

async function openAICompatible(apiKey: string, url: string, model: string, msgs: Message[], provider: string): Promise<ProviderResult> {
  const r = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: msgs, temperature: 0.2, max_tokens: 1024, stream: false })
  });
  if (!r.ok) throw new Error(`${provider}:${r.status}`);
  const d: any = await r.json();
  const content = d?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error(`${provider}:invalid_response`);
  return { content, provider, model };
}

async function cloudflare(env: Env, msgs: Message[]): Promise<ProviderResult> {
  const model = "@cf/nvidia/nemotron-3-120b-a12b";
  const d: any = await env.AI.run(model, { messages: msgs, max_tokens: 1024, temperature: 0.2 });
  const content = d?.response ?? d?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("cloudflare:invalid_response");
  return { content, provider: "cloudflare", model };
}

async function google(env: Env, msgs: Message[]): Promise<ProviderResult> {
  if (!env.GOOGLE_API_KEY) throw new Error("google:not_configured");
  const model = env.GOOGLE_MODEL || "gemini-2.5-flash";
  const system = msgs.find(m => m.role === "system")?.content;
  const contents = msgs.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const r = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GOOGLE_API_KEY)}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), contents, generationConfig: { temperature: 0.2, maxOutputTokens: 1024 } })
  });
  if (!r.ok) throw new Error(`google:${r.status}`);
  const d: any = await r.json();
  const content = d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("");
  if (!content) throw new Error("google:invalid_response");
  return { content, provider: "google", model };
}

async function answer(env: Env, msgs: Message[], preferred?: string): Promise<ProviderResult> {
  const order = preferred ? [preferred] : ["cloudflare", "groq", "google", "nvidia"];
  const errors: string[] = [];
  for (const p of order) {
    try {
      if (p === "cloudflare") return await cloudflare(env, msgs);
      if (p === "groq" && env.GROQ_API_KEY) return await openAICompatible(env.GROQ_API_KEY, "https://api.groq.com/openai/v1/chat/completions", env.GROQ_MODEL || "openai/gpt-oss-120b", msgs, "groq");
      if (p === "google") return await google(env, msgs);
      if (p === "nvidia" && env.NVIDIA_API_KEY) return await openAICompatible(env.NVIDIA_API_KEY, "https://integrate.api.nvidia.com/v1/chat/completions", env.NVIDIA_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b", msgs, "nvidia");
      errors.push(`${p}:not_configured`);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `${p}:error`);
    }
  }
  throw new Error(errors.join(","));
}

function cors(r: Response): Response {
  const h = new Headers(r.headers);
  h.set("access-control-allow-origin", "*");
  h.set("access-control-allow-methods", "GET,POST,OPTIONS");
  h.set("access-control-allow-headers", "content-type,authorization");
  return new Response(r.body, { status: r.status, headers: h });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") return cors(json({ ok: true, service: "Nematron Agent", providers: ["cloudflare", "groq", "google", "nvidia"] }));
    if (url.pathname !== "/v1/chat/completions" || request.method !== "POST") return cors(json({ error: "Not found" }, 404));
    try {
      const body: any = await request.json();
      const msgs = messages(body);
      if (!msgs.some(m => m.role === "user")) return cors(json({ error: "messages with a user message are required" }, 400));
      if (!msgs.some(m => m.role === "system")) msgs.unshift({ role: "system", content: DEFAULT_SYSTEM });
      const result = await answer(env, msgs, typeof body.provider === "string" ? body.provider : undefined);
      return cors(json({ id: crypto.randomUUID(), object: "chat.completion", created: Math.floor(Date.now() / 1000), provider: result.provider, model: result.model, choices: [{ index: 0, message: { role: "assistant", content: result.content }, finish_reason: "stop" }] }));
    } catch (e) {
      return cors(json({ error: "All configured providers failed", detail: e instanceof Error ? e.message : "unknown_error" }, 503));
    }
  }
};
