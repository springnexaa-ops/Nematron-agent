export type VoiceLanguage = "ks" | "ur" | "doi" | "hi" | "goj";

export const VOICE_LANGUAGES: Record<VoiceLanguage, { name: string; nativeName: string; asr: boolean; tts: boolean; script: string; note?: string }> = {
  ks: { name: "Kashmiri", nativeName: "کٲشُر / कश्मीरी", asr: true, tts: true, script: "Arabic/Devanagari", note: "Bhashini TTS listing currently specifies Kashmiri in Devanagari script." },
  ur: { name: "Urdu", nativeName: "اردو", asr: true, tts: true, script: "Perso-Arabic" },
  doi: { name: "Dogri", nativeName: "डोगरी", asr: true, tts: true, script: "Devanagari" },
  hi: { name: "Hindi", nativeName: "हिन्दी", asr: true, tts: true, script: "Devanagari" },
  goj: { name: "Gojri", nativeName: "گوجری", asr: false, tts: false, script: "Perso-Arabic/Devanagari", note: "Gojri is not currently listed as a native ASR/TTS language in the Bhashini model catalogue; do not label Hindi/Urdu fallback as native Gojri." }
};

export const VOICE_TTS_DEFAULT = "@cf/deepgram/aura-1";
export const VOICE_STT_DEFAULT = "@cf/openai/whisper-large-v3-turbo";
export const ELEVENLABS_MODEL_DEFAULT = "eleven_multilingual_v2";
export const ELEVENLABS_VOICE_DEFAULT = "JBFqnCBsd6RMkjVDRZzb";

const VOICE_SPEAKERS = new Set(["angus", "asteria", "arcas", "orion", "orpheus", "athena", "luna", "zeus", "perseus", "helios", "hera", "stella"]);

type VoiceEnv = { AI: Ai; ELEVENLABS_API_KEY?: string; ELEVENLABS_VOICE_ID?: string; ELEVENLABS_MODEL?: string };

export function voiceSpeaker(value: unknown): string {
  const speaker = typeof value === "string" ? value.toLowerCase() : "asteria";
  return VOICE_SPEAKERS.has(speaker) ? speaker : "asteria";
}

export function voiceEncoding(value: unknown): "mp3" | "opus" | "wav" {
  const encoding = typeof value === "string" ? value.toLowerCase() : "mp3";
  if (encoding === "opus") return "opus";
  if (encoding === "wav") return "wav";
  return "mp3";
}

export function voiceContentType(encoding: string): string {
  if (encoding === "opus") return "audio/ogg";
  if (encoding === "wav") return "audio/wav";
  return "audio/mpeg";
}

export function voiceLanguage(value: unknown): VoiceLanguage {
  const lang = typeof value === "string" ? value.toLowerCase() : "hi";
  return lang in VOICE_LANGUAGES ? lang as VoiceLanguage : "hi";
}

export async function elevenLabsTextToSpeech(env: VoiceEnv, text: string, encoding: "mp3" | "opus" | "wav") {
  if (!env.ELEVENLABS_API_KEY) throw new Error("elevenlabs:not_configured");
  if (encoding !== "mp3") throw new Error("elevenlabs:format_not_supported");
  const voiceId = env.ELEVENLABS_VOICE_ID || ELEVENLABS_VOICE_DEFAULT;
  const modelId = env.ELEVENLABS_MODEL || ELEVENLABS_MODEL_DEFAULT;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "xi-api-key": env.ELEVENLABS_API_KEY },
    body: JSON.stringify({ text: text.trim(), model_id: modelId })
  });
  if (!response.ok) throw new Error(`elevenlabs:${response.status}`);
  return response;
}

export async function textToSpeech(env: VoiceEnv, text: string, speaker: string, encoding: "mp3" | "opus" | "wav") {
  if (!text.trim()) throw new Error("voice:empty_text");
  if (text.length > 5000) throw new Error("voice:text_too_long");
  if (env.ELEVENLABS_API_KEY && encoding === "mp3") {
    try {
      return await elevenLabsTextToSpeech(env, text, encoding);
    } catch {
      // Fall back to Cloudflare Workers AI if ElevenLabs is unavailable.
    }
  }
  return env.AI.run(VOICE_TTS_DEFAULT, { text: text.trim(), speaker, encoding: encoding === "wav" ? "linear16" : encoding, container: encoding === "wav" ? "wav" : "none" }, { returnRawResponse: true });
}

export async function elevenLabsSpeechToText(env: VoiceEnv, audio: ArrayBuffer, language?: string) {
  if (!env.ELEVENLABS_API_KEY) throw new Error("elevenlabs:not_configured");
  const form = new FormData();
  form.append("file", new File([audio], "audio.webm", { type: "audio/webm" }));
  form.append("model_id", "scribe_v2");
  if (language && /^[a-z]{2}(?:-[A-Z]{2})?$/.test(language)) form.append("language_code", language.slice(0, 2));
  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
    body: form
  });
  if (!response.ok) throw new Error(`elevenlabs:${response.status}`);
  const result: any = await response.json();
  return { text: typeof result?.text === "string" ? result.text : "", wordCount: Array.isArray(result?.words) ? result.words.length : undefined, vtt: undefined };
}

export async function speechToText(env: VoiceEnv, audio: ArrayBuffer, language?: string) {
  if (!audio.byteLength) throw new Error("voice:empty_audio");
  if (audio.byteLength > 15 * 1024 * 1024) throw new Error("voice:audio_too_large");
  if (env.ELEVENLABS_API_KEY) {
    try {
      return await elevenLabsSpeechToText(env, audio, language);
    } catch {
      // Fall back to Cloudflare Workers AI if ElevenLabs is unavailable.
    }
  }
  const result: any = await env.AI.run(VOICE_STT_DEFAULT, { audio, task: "transcribe", ...(language ? { language } : {}) });
  return { text: typeof result?.text === "string" ? result.text : "", wordCount: typeof result?.word_count === "number" ? result.word_count : undefined, vtt: typeof result?.vtt === "string" ? result.vtt : undefined };
}
