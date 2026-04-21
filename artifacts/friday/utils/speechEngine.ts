import * as Speech from "expo-speech";
import { Platform } from "react-native";
import { FridayCore, isNativeAvailable } from "friday-core";

const useNative = (): boolean => Platform.OS === "android" && isNativeAvailable();

export type VoicePersona = "sweet" | "warm" | "bright" | "calm" | "natural";

export interface SpeechOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  language?: string;
  persona?: VoicePersona;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export interface VoicePrefs {
  language: string;
  voiceId?: string;
  persona: VoicePersona;
  pitch?: number;
  rate?: number;
}

const PERSONA_PRESETS: Record<VoicePersona, { pitch: number; rate: number }> = {
  sweet:   { pitch: 1.18, rate: 0.94 },
  warm:    { pitch: 1.05, rate: 0.92 },
  bright:  { pitch: 1.25, rate: 0.98 },
  calm:    { pitch: 1.02, rate: 0.88 },
  natural: { pitch: 1.10, rate: 0.95 },
};

const FEMALE_NAME_HINTS = [
  "female", "woman", "girl",
  "samantha", "ava", "allison", "susan", "victoria", "karen", "moira",
  "tessa", "fiona", "serena", "kate", "zoe", "sara", "amelie", "amelia",
  "siri female", "siri (female)",
  "google us english", "google uk english female",
  "salli", "joanna", "kendra", "kimberly", "ivy", "ruth",
  "aria", "jenny", "jane", "nancy", "michelle", "sonia", "libby",
  "neerja", "swara", "kajal", "priya", "lekha",
  "amber", "ashley", "elena", "isabela", "lucia", "paloma",
  "celine", "lea", "denise", "amelie",
  "enhanced", "premium", "neural",
];

const MALE_NAME_HINTS = [
  "male", "man", "boy", "alex", "daniel", "fred", "tom",
  "matthew", "joey", "justin", "brian", "geraint", "russell",
  "guy", "ryan", "davis", "tony", "andrew", "william",
];

let voiceCache: Speech.Voice[] | null = null;
let selectedVoiceCache: Map<string, string> = new Map();
let webVoicesLoaded = false;
let webVoicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

let currentPrefs: VoicePrefs = {
  language: "en-US",
  persona: "sweet",
};

export function setVoicePrefs(prefs: Partial<VoicePrefs>): void {
  currentPrefs = { ...currentPrefs, ...prefs };
  // Force re-pick on next speak if persona/language changed
  if (prefs.language || prefs.voiceId) {
    selectedVoiceCache.clear();
  }
  if (useNative()) {
    const persona = currentPrefs.persona;
    const preset = PERSONA_PRESETS[persona];
    FridayCore.setVoicePrefs({
      pitch: currentPrefs.pitch ?? preset.pitch,
      rate: currentPrefs.rate ?? preset.rate,
      locale: currentPrefs.language,
      preferFemale: true,
      voiceName: currentPrefs.voiceId,
    }).catch(() => {});
  }
}

export function getVoicePrefs(): VoicePrefs {
  return { ...currentPrefs };
}

function scoreVoice(name: string, identifier: string, lang: string, targetLang: string): number {
  const n = (name + " " + identifier).toLowerCase();
  let score = 0;

  // Language match
  if (lang?.toLowerCase().startsWith(targetLang.toLowerCase().slice(0, 2))) score += 5;
  if (lang?.toLowerCase() === targetLang.toLowerCase()) score += 5;

  // Female bias
  for (const hint of FEMALE_NAME_HINTS) {
    if (n.includes(hint)) { score += 10; break; }
  }
  for (const hint of MALE_NAME_HINTS) {
    if (n.includes(hint)) { score -= 12; break; }
  }

  // Quality bias
  if (n.includes("enhanced")) score += 6;
  if (n.includes("premium")) score += 6;
  if (n.includes("neural")) score += 7;
  if (n.includes("natural")) score += 5;
  if (n.includes("siri")) score += 4;
  if (n.includes("google")) score += 4;
  if (n.includes("compact")) score -= 2;
  if (n.includes("eloquence")) score -= 3;
  if (n.includes("novelty")) score -= 5;

  return score;
}

async function pickNativeVoice(lang: string): Promise<string | undefined> {
  const cacheKey = `native:${lang}`;
  if (selectedVoiceCache.has(cacheKey)) return selectedVoiceCache.get(cacheKey);

  if (!voiceCache) {
    try {
      voiceCache = await Speech.getAvailableVoicesAsync();
    } catch {
      voiceCache = [];
    }
  }
  if (!voiceCache || voiceCache.length === 0) return undefined;

  const ranked = voiceCache
    .map((v) => ({
      v,
      score: scoreVoice(v.name || "", v.identifier || "", v.language || "", lang),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = ranked[0]?.v.identifier;
  if (best) selectedVoiceCache.set(cacheKey, best);
  return best;
}

async function loadWebVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  if (webVoicesPromise) return webVoicesPromise;
  webVoicesPromise = new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing && existing.length) {
      webVoicesLoaded = true;
      resolve(existing);
      return;
    }
    const onChange = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length) {
        webVoicesLoaded = true;
        window.speechSynthesis.removeEventListener("voiceschanged", onChange);
        resolve(v);
      }
    };
    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(window.speechSynthesis.getVoices() || []);
    }, 1500);
  });
  return webVoicesPromise;
}

async function pickWebVoice(lang: string): Promise<SpeechSynthesisVoice | undefined> {
  const voices = await loadWebVoices();
  if (!voices.length) return undefined;

  const ranked = voices
    .map((v) => ({ v, score: scoreVoice(v.name || "", v.voiceURI || "", v.lang || "", lang) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.v;
}

/**
 * Shape text for a more natural, human cadence:
 * - normalize punctuation
 * - turn ellipses and dashes into commas (TTS engines pause naturally)
 * - add a soft comma before "but/and/so/because" when missing
 * - cap length
 */
function shapeText(input: string): string {
  let t = input
    .replace(/[\*\_\#\`\~\>\|\[\]\(\)]/g, "")
    .replace(/\u2026/g, ", ")
    .replace(/\s—\s|\s–\s|--/g, ", ")
    .replace(/\s+/g, " ")
    .trim();

  t = t.replace(/\s+(but|and|so|because|however)\s+/gi, ", $1 ");
  // Ensure sentence ends with terminal punctuation for nicer prosody
  if (t.length && !/[.!?]$/.test(t)) t += ".";
  return t.slice(0, 600);
}

let isSpeaking = false;
let speakQueue: Array<{ text: string; opts: SpeechOptions }> = [];

async function processQueue() {
  if (isSpeaking || speakQueue.length === 0) return;
  const next = speakQueue.shift();
  if (!next) return;

  isSpeaking = true;
  next.opts.onStart?.();

  const persona = next.opts.persona || currentPrefs.persona || "sweet";
  const preset = PERSONA_PRESETS[persona] || PERSONA_PRESETS.sweet;
  const language = next.opts.language || currentPrefs.language || "en-US";
  const pitch = next.opts.pitch ?? currentPrefs.pitch ?? preset.pitch;
  const rate = next.opts.rate ?? currentPrefs.rate ?? preset.rate;

  let voiceId = next.opts.voice ?? currentPrefs.voiceId;

  try {
    if (Platform.OS === "web") {
      // Use Web Speech API directly for richer voice selection
      const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
      if (!synth) {
        isSpeaking = false;
        next.opts.onDone?.();
        processQueue();
        return;
      }
      const u = new SpeechSynthesisUtterance(next.text);
      u.lang = language;
      u.pitch = Math.max(0, Math.min(2, pitch));
      u.rate = Math.max(0.1, Math.min(2, rate));
      const picked = voiceId
        ? (await loadWebVoices()).find((v) => v.voiceURI === voiceId || v.name === voiceId)
        : await pickWebVoice(language);
      if (picked) u.voice = picked;
      u.onend = () => {
        isSpeaking = false;
        next.opts.onDone?.();
        processQueue();
      };
      u.onerror = (e) => {
        isSpeaking = false;
        next.opts.onError?.(new Error((e as any).error || "tts error"));
        processQueue();
      };
      try { synth.cancel(); } catch {}
      synth.speak(u);
      return;
    }

    if (!voiceId) voiceId = await pickNativeVoice(language);

    Speech.speak(next.text, {
      language,
      pitch,
      rate,
      voice: voiceId,
      onDone: () => {
        isSpeaking = false;
        next.opts.onDone?.();
        processQueue();
      },
      onError: (error) => {
        isSpeaking = false;
        next.opts.onError?.(error as Error);
        processQueue();
      },
      onStopped: () => {
        isSpeaking = false;
        processQueue();
      },
    });
  } catch (err) {
    isSpeaking = false;
    next.opts.onError?.(err as Error);
    processQueue();
  }
}

export async function speak(text: string, opts: SpeechOptions = {}): Promise<void> {
  const cleanText = shapeText(text);
  if (!cleanText) return;

  // Native Android path: hand the entire utterance to the Kotlin TTS engine.
  if (useNative()) {
    try {
      opts.onStart?.();
      const persona = opts.persona ?? currentPrefs.persona;
      const preset = PERSONA_PRESETS[persona];
      await FridayCore.speak(cleanText, {
        pitch: opts.pitch ?? currentPrefs.pitch ?? preset.pitch,
        rate: opts.rate ?? currentPrefs.rate ?? preset.rate,
        locale: opts.language ?? currentPrefs.language,
        preferFemale: true,
        voiceName: opts.voice ?? currentPrefs.voiceId,
      });
      opts.onDone?.();
      return;
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      opts.onError?.(err);
      throw err;
    }
  }

  return new Promise((resolve, reject) => {
    speakQueue.push({
      text: cleanText,
      opts: {
        ...opts,
        onDone: () => { opts.onDone?.(); resolve(); },
        onError: (e) => { opts.onError?.(e); reject(e); },
      },
    });
    processQueue();
  });
}

export function stopSpeaking() {
  if (useNative()) {
    FridayCore.stopSpeaking().catch(() => {});
  } else if (Platform.OS === "web") {
    try { window.speechSynthesis?.cancel(); } catch {}
  } else {
    Speech.stop();
  }
  speakQueue = [];
  isSpeaking = false;
}

export function isSpeakingNow() {
  return isSpeaking;
}

export interface SimpleVoice {
  id: string;
  name: string;
  language: string;
  female: boolean;
  quality: "high" | "normal";
}

function classifyVoice(name: string, identifier: string, lang: string): Omit<SimpleVoice, "id" | "name" | "language"> {
  const n = (name + " " + identifier).toLowerCase();
  const female =
    FEMALE_NAME_HINTS.some((h) => n.includes(h)) &&
    !MALE_NAME_HINTS.some((h) => n.includes(h));
  const quality: "high" | "normal" =
    n.includes("enhanced") || n.includes("premium") || n.includes("neural") || n.includes("natural")
      ? "high"
      : "normal";
  return { female, quality };
}

export async function listVoices(targetLang?: string): Promise<SimpleVoice[]> {
  if (Platform.OS === "web") {
    const v = await loadWebVoices();
    return v
      .filter((x) => !targetLang || x.lang.toLowerCase().startsWith(targetLang.toLowerCase().slice(0, 2)))
      .map((x) => {
        const c = classifyVoice(x.name, x.voiceURI, x.lang);
        return { id: x.voiceURI, name: x.name, language: x.lang, ...c };
      });
  }
  if (!voiceCache) {
    try { voiceCache = await Speech.getAvailableVoicesAsync(); } catch { voiceCache = []; }
  }
  return (voiceCache || [])
    .filter((x) => !targetLang || (x.language || "").toLowerCase().startsWith(targetLang.toLowerCase().slice(0, 2)))
    .map((x) => {
      const c = classifyVoice(x.name || "", x.identifier || "", x.language || "");
      return { id: x.identifier, name: x.name || x.identifier, language: x.language || "", ...c };
    });
}

export async function listFemaleVoices(targetLang?: string): Promise<SimpleVoice[]> {
  const all = await listVoices(targetLang);
  const female = all.filter((v) => v.female);
  female.sort((a, b) => {
    if (a.quality !== b.quality) return a.quality === "high" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return female;
}

export const VOICE_PERSONAS: { id: VoicePersona; label: string; desc: string }[] = [
  { id: "sweet",   label: "Sweet",   desc: "Warm, gentle, slightly higher pitch" },
  { id: "warm",    label: "Warm",    desc: "Soft, friendly, conversational" },
  { id: "bright",  label: "Bright",  desc: "Cheerful, upbeat, lively" },
  { id: "calm",    label: "Calm",    desc: "Slow, soothing, relaxed" },
  { id: "natural", label: "Natural", desc: "Default balanced tone" },
];

export async function getAvailableVoices(): Promise<Speech.Voice[]> {
  if (Platform.OS === "web") return [];
  if (voiceCache) return voiceCache;
  voiceCache = await Speech.getAvailableVoicesAsync();
  return voiceCache;
}
