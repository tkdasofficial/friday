import * as Speech from "expo-speech";
import { Platform } from "react-native";

export interface SpeechOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  language?: string;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

let isSpeaking = false;
let speakQueue: Array<{ text: string; opts: SpeechOptions }> = [];
let currentOnDone: (() => void) | undefined;

async function processQueue() {
  if (isSpeaking || speakQueue.length === 0) return;
  const next = speakQueue.shift();
  if (!next) return;

  isSpeaking = true;
  currentOnDone = next.opts.onDone;
  next.opts.onStart?.();

  Speech.speak(next.text, {
    language: next.opts.language || "en-US",
    pitch: next.opts.pitch ?? 1.0,
    rate: next.opts.rate ?? 0.95,
    onDone: () => {
      isSpeaking = false;
      currentOnDone?.();
      processQueue();
    },
    onError: (error) => {
      isSpeaking = false;
      next.opts.onError?.(error);
      processQueue();
    },
    onStopped: () => {
      isSpeaking = false;
      processQueue();
    },
  });
}

export async function speak(text: string, opts: SpeechOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanText = text
      .replace(/[\*\_\#\`\~\>\|\[\]\(\)]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);

    speakQueue.push({
      text: cleanText,
      opts: {
        ...opts,
        onDone: () => {
          opts.onDone?.();
          resolve();
        },
        onError: (e) => {
          opts.onError?.(e);
          reject(e);
        },
      },
    });

    processQueue();
  });
}

export function stopSpeaking() {
  Speech.stop();
  speakQueue = [];
  isSpeaking = false;
}

export function isSpeakingNow() {
  return isSpeaking;
}

export async function getAvailableVoices(): Promise<Speech.Voice[]> {
  if (Platform.OS === "web") return [];
  return Speech.getAvailableVoicesAsync();
}
