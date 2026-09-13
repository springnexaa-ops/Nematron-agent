import { VOICE_LANGUAGES, type VoiceLanguage } from "./voice";

/** Nexa Voice language catalogue for the UI/API. */
export function listVoiceLanguages() {
  return Object.entries(VOICE_LANGUAGES).map(([code, value]) => ({ code: code as VoiceLanguage, ...value }));
}

export function getVoiceLanguage(code: unknown) {
  const normalized = typeof code === "string" ? code.toLowerCase() : "hi";
  return VOICE_LANGUAGES[normalized as VoiceLanguage] || VOICE_LANGUAGES.hi;
}

// Native Indic ASR/TTS should use an approved Bhashini/Indic pipeline.
// Gojri is intentionally marked experimental until a native model is verified.
