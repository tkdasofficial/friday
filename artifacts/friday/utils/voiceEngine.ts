import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionNativeEventMap,
} from "expo-speech-recognition";
import { Platform } from "react-native";

export type VoiceEngineMode = "wake_word" | "command" | "off";
export type VoiceEngineEvent =
  | { type: "transcript"; text: string; final: boolean }
  | { type: "wake_word_detected"; transcript: string }
  | { type: "command_detected"; transcript: string }
  | { type: "deactivate_detected" }
  | { type: "error"; message: string }
  | { type: "mode_change"; mode: VoiceEngineMode };

type EventListener = (event: VoiceEngineEvent) => void;

let mode: VoiceEngineMode = "off";
let wakeWord = "hey friday";
let deactivateWord = "goodbye friday";
let listeners: EventListener[] = [];
let restartTimeout: ReturnType<typeof setTimeout> | null = null;
let isEngineStarted = false;
let isRestarting = false;

function emit(event: VoiceEngineEvent) {
  listeners.forEach((l) => l(event));
}

function setMode(m: VoiceEngineMode) {
  mode = m;
  emit({ type: "mode_change", mode: m });
}

function scheduleRestart(delay = 800) {
  if (restartTimeout) clearTimeout(restartTimeout);
  restartTimeout = setTimeout(() => {
    if (mode !== "off" && isEngineStarted) {
      startListening().catch(() => {});
    }
  }, delay);
}

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return true;
  try {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

async function startListening(): Promise<void> {
  if (Platform.OS === "web") return;
  if (isRestarting) return;
  isRestarting = true;

  try {
    await ExpoSpeechRecognitionModule.stop().catch(() => {});
    await new Promise((r) => setTimeout(r, 300));

    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      continuous: false,
      interimResults: true,
      requiresOnDeviceRecognition: false,
      addsPunctuation: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "STT error";
    emit({ type: "error", message: msg });
    scheduleRestart(2000);
  } finally {
    isRestarting = false;
  }
}

let resultHandler:
  | ((event: ExpoSpeechRecognitionNativeEventMap["result"]) => void)
  | null = null;
let endHandler: (() => void) | null = null;
let errorHandler:
  | ((event: ExpoSpeechRecognitionNativeEventMap["error"]) => void)
  | null = null;

export async function startEngine(config: {
  wakeWord: string;
  deactivateWord: string;
}): Promise<void> {
  if (isEngineStarted) return;

  wakeWord = config.wakeWord.toLowerCase().trim();
  deactivateWord = config.deactivateWord.toLowerCase().trim();
  isEngineStarted = true;

  if (Platform.OS === "web") {
    startWebEngine();
    setMode("wake_word");
    return;
  }

  const granted = await requestPermissions();
  if (!granted) {
    emit({ type: "error", message: "Microphone permission denied" });
    isEngineStarted = false;
    return;
  }

  resultHandler = (event) => {
    const rawText =
      event.results[event.resultIndex]?.transcript?.toLowerCase()?.trim() || "";
    if (!rawText) return;

    const isFinal = event.results[event.resultIndex]?.isFinal ?? false;
    emit({ type: "transcript", text: rawText, final: isFinal });

    if (mode === "wake_word") {
      if (rawText.includes(wakeWord)) {
        setMode("command");
        emit({ type: "wake_word_detected", transcript: rawText });
      }
    } else if (mode === "command") {
      if (rawText.includes(deactivateWord)) {
        emit({ type: "deactivate_detected" });
        setMode("wake_word");
        return;
      }
      if (isFinal && rawText.length > 2) {
        emit({ type: "command_detected", transcript: rawText });
      }
    }
  };

  endHandler = () => {
    if (mode !== "off" && isEngineStarted) {
      scheduleRestart(600);
    }
  };

  errorHandler = (event) => {
    const ignorable = ["no-speech", "aborted", "not-allowed"];
    if (ignorable.includes(event.error)) {
      scheduleRestart(1200);
      return;
    }
    emit({ type: "error", message: event.message || event.error });
    scheduleRestart(2500);
  };

  ExpoSpeechRecognitionModule.addListener("result", resultHandler);
  ExpoSpeechRecognitionModule.addListener("end", endHandler);
  ExpoSpeechRecognitionModule.addListener("error", errorHandler);

  setMode("wake_word");
  await startListening();
}

export async function stopEngine(): Promise<void> {
  isEngineStarted = false;
  setMode("off");

  if (restartTimeout) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }

  if (Platform.OS === "web") {
    stopWebEngine();
    return;
  }

  if (resultHandler) ExpoSpeechRecognitionModule.removeAllListeners("result");
  if (endHandler) ExpoSpeechRecognitionModule.removeAllListeners("end");
  if (errorHandler) ExpoSpeechRecognitionModule.removeAllListeners("error");

  resultHandler = null;
  endHandler = null;
  errorHandler = null;

  try {
    await ExpoSpeechRecognitionModule.stop();
  } catch {}
}

export function switchToCommandMode(): void {
  if (mode !== "off") setMode("command");
}

export function switchToWakeWordMode(): void {
  if (mode !== "off") setMode("wake_word");
}

export function getCurrentMode(): VoiceEngineMode {
  return mode;
}

export function updateWakeWords(newWake: string, newDeactivate: string): void {
  wakeWord = newWake.toLowerCase().trim();
  deactivateWord = newDeactivate.toLowerCase().trim();
}

export function addVoiceListener(listener: EventListener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

// ─── Web Speech API fallback ─────────────────────────────────────────────────
let webRecognition: SpeechRecognition | null = null;
let webRunning = false;

function startWebEngine(): void {
  const SR =
    (typeof window !== "undefined" &&
      ((window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition)) ||
    null;
  if (!SR) {
    emit({
      type: "error",
      message: "Speech recognition not supported in this browser",
    });
    return;
  }

  function startRec() {
    if (!webRunning || !SR) return;
    const recognition = new SR();
    webRecognition = recognition;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      const text = last[0].transcript.toLowerCase().trim();
      const isFinal = last.isFinal;

      emit({ type: "transcript", text, final: isFinal });

      if (mode === "wake_word") {
        if (text.includes(wakeWord)) {
          setMode("command");
          emit({ type: "wake_word_detected", transcript: text });
        }
      } else if (mode === "command") {
        if (text.includes(deactivateWord)) {
          emit({ type: "deactivate_detected" });
          setMode("wake_word");
          return;
        }
        if (isFinal && text.length > 2) {
          emit({ type: "command_detected", transcript: text });
        }
      }
    };

    recognition.onend = () => {
      if (webRunning && mode !== "off") {
        setTimeout(startRec, 500);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        emit({ type: "error", message: event.error });
      }
      if (webRunning) setTimeout(startRec, 1500);
    };

    try {
      recognition.start();
    } catch {}
  }

  webRunning = true;
  startRec();
}

function stopWebEngine(): void {
  webRunning = false;
  try {
    webRecognition?.stop();
  } catch {}
  webRecognition = null;
}
