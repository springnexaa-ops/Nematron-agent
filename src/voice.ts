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

const VOICE_SPEAKERS = new Set(["angus", "asteria", "arcas", "orion", "orpheus", "athena", "luna", "zeus", "perseus", "helios", "hera", "stella"]);

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

export async function textToSpeech(env: { AI: Ai }, text: string, speaker: string, encoding: "mp3" | "opus" | "wav") {
  if (!text.trim()) throw new Error("voice:empty_text");
  if (text.length > 5000) throw new Error("voice:text_too_long");
  return env.AI.run(VOICE_TTS_DEFAULT, { text: text.trim(), speaker, encoding: encoding === "wav" ? "linear16" : encoding, container: encoding === "wav" ? "wav" : "none" }, { returnRawResponse: true });
}

export async function speechToText(env: { AI: Ai }, audio: ArrayBuffer, language?: string) {
  if (!audio.byteLength) throw new Error("voice:empty_audio");
  if (audio.byteLength > 15 * 1024 * 1024) throw new Error("voice:audio_too_large");
  const result: any = await env.AI.run(VOICE_STT_DEFAULT, { audio, task: "transcribe", ...(language ? { language } : {}) });
  return { text: typeof result?.text === "string" ? result.text : "", wordCount: typeof result?.word_count === "number" ? result.word_count : undefined, vtt: typeof result?.vtt === "string" ? result.vtt : undefined };
}
