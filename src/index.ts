import { textToSpeech, speechToText, voiceSpeaker, voiceEncoding, voiceContentType, VOICE_TTS_DEFAULT, VOICE_STT_DEFAULT } from "./voice";

export interface Env {
  AI: Ai;
  GROQ_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  NVIDIA_API_KEY?: string;
  HF_TOKEN?: string;
  GROQ_MODEL?: string;
  GOOGLE_MODEL?: string;
  NVIDIA_MODEL?: string;
  MEDICAL_MODEL?: string;
}

type Message = { role: "system" | "user" | "assistant"; content: string };
type ProviderResult = { content: string; provider: string; model: string };

const BRAND = "Nexa AI";
const POWERED_BY = "SPRINGNEXA PRIVATE LIMITED (IT Division)";
const COMPANY = "SpringNexa Private Limited";
const DEFAULT_SYSTEM = `You are Nexa AI, powered by SPRINGNEXA PRIVATE LIMITED (IT Division). You are an AI assistant. Be fast, concise, helpful and accurate. Do not claim to be a doctor or replace qualified medical professionals.`;
const MEDICAL_SYSTEM = `You are Nexa AI Medical, powered by SPRINGNEXA PRIVATE LIMITED (IT Division). You provide medical information and educational assistance only. Do not diagnose with certainty, prescribe treatment, or claim to replace a qualified clinician. For emergencies, advise the user to seek immediate local medical care. Clearly distinguish information from clinical diagnosis and encourage professional review of important findings.`;
const TIMEOUT_MS = 10000;

const GROQ_FREE = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "openai/gpt-oss-safeguard-20b", "qwen/qwen3.6-27b", "qwen/qwen3.8-27b", "groq/compound-mini"];
const CLOUDFLARE_FREE = ["@cf/nvidia/nemotron-3-120b-a12b", "@cf/zai-org/glm-4.7-flash", "@cf/google/gemma-4-26b-a4b-it", "@cf/meta/llama-4-scout-17b-16e-instruct"];
const GOOGLE_FREE = ["gemini-3.1-flash-lite-preview", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
const MEDICAL_DEFAULT = "google/medgemma-27b-it";

function json(data: unknown, status = 200): Response { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } }); }
function messages(body: any): Message[] { const m = Array.isArray(body?.messages) ? body.messages : []; return m.filter((x: any) => x && ["system", "user", "assistant"].includes(x.role) && typeof x.content === "string").slice(-30); }
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> { return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) }); }
async function openAICompatible(apiKey: string, url: string, model: string, msgs: Message[], provider: string): Promise<ProviderResult> { const r = await fetchWithTimeout(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages: msgs, temperature: 0.2, max_tokens: 1024, stream: false }) }); if (!r.ok) throw new Error(`${provider}:${r.status}`); const d: any = await r.json(); const content = d?.choices?.[0]?.message?.content; if (typeof content !== "string") throw new Error(`${provider}:invalid_response`); return { content, provider, model }; }
async function cloudflare(env: Env, msgs: Message[], model: string): Promise<ProviderResult> { const d: any = await env.AI.run(model, { messages: msgs, max_tokens: 1024, temperature: 0.2 }); const content = d?.response ?? d?.choices?.[0]?.message?.content; if (typeof content !== "string") throw new Error("cloudflare:invalid_response"); return { content, provider: "cloudflare", model }; }
async function google(env: Env, msgs: Message[], model: string): Promise<ProviderResult> { if (!env.GOOGLE_API_KEY) throw new Error("google:not_configured"); const system = msgs.find(m => m.role === "system")?.content; const contents = msgs.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })); const r = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GOOGLE_API_KEY)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), contents, generationConfig: { temperature: 0.2, maxOutputTokens: 1024 } }) }); if (!r.ok) throw new Error(`google:${r.status}`); const d: any = await r.json(); const content = d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join(""); if (!content) throw new Error("google:invalid_response"); return { content, provider: "google", model }; }
async function medical(env: Env, msgs: Message[], model: string): Promise<ProviderResult> { if (!env.HF_TOKEN) throw new Error("medical:not_configured"); return await openAICompatible(env.HF_TOKEN, "https://router.huggingface.co/v1/chat/completions", model, msgs, "medical"); }
async function answer(env: Env, msgs: Message[], provider?: string, requestedModel?: string): Promise<ProviderResult> { const errors: string[] = []; const selected = (provider || "auto").toLowerCase(); if (selected === "medical") return medical(env, msgs, requestedModel || env.MEDICAL_MODEL || MEDICAL_DEFAULT); const providers = selected === "auto" ? ["groq", "cloudflare", "google", "nvidia"] : [selected]; for (const p of providers) { try { if (p === "groq" && env.GROQ_API_KEY) { for (const model of env.GROQ_MODEL ? [env.GROQ_MODEL] : GROQ_FREE) { try { return await openAICompatible(env.GROQ_API_KEY, "https://api.groq.com/openai/v1/chat/completions", model, msgs, "groq"); } catch (e) { errors.push(e instanceof Error ? e.message : `groq:${model}:error`); } } } else if (p === "cloudflare") { for (const model of requestedModel?.startsWith("@cf/") ? [requestedModel] : CLOUDFLARE_FREE) { try { return await cloudflare(env, msgs, model); } catch (e) { errors.push(e instanceof Error ? e.message : `cloudflare:${model}:error`); } } } else if (p === "google" && env.GOOGLE_API_KEY) { for (const model of env.GOOGLE_MODEL ? [env.GOOGLE_MODEL] : GOOGLE_FREE) { try { return await google(env, msgs, model); } catch (e) { errors.push(e instanceof Error ? e.message : `google:${model}:error`); } } } else if (p === "nvidia" && env.NVIDIA_API_KEY) { return await openAICompatible(env.NVIDIA_API_KEY, "https://integrate.api.nvidia.com/v1/chat/completions", env.NVIDIA_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b", msgs, "nvidia"); } else errors.push(`${p}:not_configured`); } catch (e) { errors.push(e instanceof Error ? e.message : `${p}:error`); } } throw new Error(errors.join(",")); }
function cors(r: Response): Response { const h = new Headers(r.headers); h.set("access-control-allow-origin", "*"); h.set("access-control-allow-methods", "GET,POST,OPTIONS"); h.set("access-control-allow-headers", "content-type,authorization"); return new Response(r.body, { status: r.status, headers: h }); }

export default { async fetch(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  const url = new URL(request.url);

  if (url.pathname === "/" || url.pathname === "/health") return cors(json({ ok: true, service: BRAND, poweredBy: POWERED_BY, company: COMPANY, division: "IT Division", dataPolicy: "Company-owned application data is processed only through configured providers; provider retention policies apply to external AI inference.", modes: ["auto", "medical", "voice"] }));

  if (url.pathname === "/v1/voice/capabilities" && request.method === "GET") return cors(json({ brand: BRAND, poweredBy: POWERED_BY, product: "Nexa Voice", speechToText: true, textToSpeech: true, voices: ["asteria", "angus", "luna", "athena", "hera", "orion", "stella", "zeus"], formats: ["mp3", "opus", "wav"] }));

  if (url.pathname === "/v1/audio/speech" && request.method === "POST") {
    try {
      const body: any = await request.json();
      const text = typeof body?.input === "string" ? body.input : typeof body?.text === "string" ? body.text : "";
      const encoding = voiceEncoding(body?.response_format || body?.format);
      const audio = await textToSpeech(env, text, voiceSpeaker(body?.voice), encoding);
      return cors(new Response(audio.body, { status: audio.status, headers: { "content-type": voiceContentType(encoding), "cache-control": "no-store", "x-nexa-product": "Nexa Voice" } }));
    } catch (e) { return cors(json({ error: "Voice generation failed", detail: e instanceof Error ? e.message : "unknown_error" }, 503)); }
  }

  if (url.pathname === "/v1/audio/transcriptions" && request.method === "POST") {
    try {
      const contentType = request.headers.get("content-type") || "";
      let audio: ArrayBuffer;
      let language: string | undefined;
      if (contentType.includes("multipart/form-data")) {
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) return cors(json({ error: "audio file is required" }, 400));
        audio = await file.arrayBuffer();
        language = typeof form.get("language") === "string" ? String(form.get("language")) : undefined;
      } else {
        audio = await request.arrayBuffer();
        language = url.searchParams.get("language") || undefined;
      }
      const result = await speechToText(env, audio, language);
      return cors(json({ brand: BRAND, poweredBy: POWERED_BY, product: "Nexa Voice", text: result.text, wordCount: result.wordCount, vtt: result.vtt }));
    } catch (e) { return cors(json({ error: "Voice transcription failed", detail: e instanceof Error ? e.message : "unknown_error" }, 503)); }
  }

  if (url.pathname === "/v1/models" && request.method === "GET") return cors(json({ brand: BRAND, poweredBy: POWERED_BY, company: COMPANY, models: [{ id: "auto", name: "Nexa AI Auto", type: "general" }, { id: "medical", name: "Nexa AI Medical", type: "medical" }, { id: "voice", name: "Nexa Voice", type: "voice" }] }));

  if (url.pathname !== "/v1/chat/completions" || request.method !== "POST") return cors(json({ error: "Not found" }, 404));
  try {
    const body: any = await request.json();
    const selectedProvider = typeof body.provider === "string" ? body.provider : typeof body.mode === "string" ? body.mode : undefined;
    const msgs = messages(body);
    if (!msgs.some(m => m.role === "user")) return cors(json({ error: "messages with a user message are required" }, 400));
    const medicalMode = selectedProvider?.toLowerCase() === "medical";
    if (!msgs.some(m => m.role === "system")) msgs.unshift({ role: "system", content: medicalMode ? MEDICAL_SYSTEM : DEFAULT_SYSTEM });
    const result = await answer(env, msgs, selectedProvider, typeof body.model === "string" ? body.model : undefined);
    return cors(json({ id: crypto.randomUUID(), object: "chat.completion", created: Math.floor(Date.now() / 1000), brand: BRAND, poweredBy: POWERED_BY, company: COMPANY, choices: [{ index: 0, message: { role: "assistant", content: result.content }, finish_reason: "stop" }] }));
  } catch (e) { return cors(json({ error: "Selected/configured AI provider failed", detail: e instanceof Error ? e.message : "unknown_error" }, 503)); }
} };