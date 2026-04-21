import { NativeModule, requireNativeModule } from "expo";
import { Platform } from "react-native";

export type WakeWord = "hey friday" | "friday" | "ok friday";

export interface FridayCoreEvents {
  onPartial: (params: { text: string }) => void;
  onFinal: (params: { text: string }) => void;
  onWake: (params: { phrase: string }) => void;
  onError: (params: { code: string; message: string }) => void;
  onState: (params: { listening: boolean; speaking: boolean; foreground: boolean }) => void;
  onCommand: (params: { intent: string; payload: Record<string, string> }) => void;
}

export interface VoicePrefs {
  /** 0.5 .. 2.0 */
  pitch?: number;
  /** 0.5 .. 2.0 */
  rate?: number;
  /** Locale tag like "en-US", "en-IN" */
  locale?: string;
  /** Prefer female voice (default true) */
  preferFemale?: boolean;
  /** Specific TTS voice name, overrides preferFemale */
  voiceName?: string;
}

declare class FridayCoreNativeModule extends NativeModule<FridayCoreEvents> {
  isAvailable(): boolean;
  startForegroundService(): Promise<void>;
  stopForegroundService(): Promise<void>;
  startListening(opts?: { wakeWord?: WakeWord | null; locale?: string; continuous?: boolean }): Promise<void>;
  stopListening(): Promise<void>;
  speak(text: string, prefs?: VoicePrefs): Promise<void>;
  stopSpeaking(): Promise<void>;
  setVoicePrefs(prefs: VoicePrefs): Promise<void>;
  listVoices(): Promise<Array<{ name: string; locale: string; female: boolean; quality: number }>>;
  routeCommand(text: string): Promise<{ intent: string; payload: Record<string, string>; handled: boolean }>;
  hasMicPermission(): Promise<boolean>;
  requestMicPermission(): Promise<boolean>;
  ignoreBatteryOptimizations(): Promise<boolean>;
}

let _native: FridayCoreNativeModule | null = null;
function tryLoad(): FridayCoreNativeModule | null {
  if (Platform.OS !== "android") return null;
  if (_native) return _native;
  try {
    _native = requireNativeModule<FridayCoreNativeModule>("FridayCore");
    return _native;
  } catch {
    return null;
  }
}

const noop = async () => {};
const stub: FridayCoreNativeModule = {
  isAvailable: () => false,
  startForegroundService: noop,
  stopForegroundService: noop,
  startListening: noop,
  stopListening: noop,
  speak: noop,
  stopSpeaking: noop,
  setVoicePrefs: noop,
  listVoices: async () => [],
  routeCommand: async (text: string) => ({ intent: "unknown", payload: { text }, handled: false }),
  hasMicPermission: async () => false,
  requestMicPermission: async () => false,
  ignoreBatteryOptimizations: async () => false,
  addListener: () => ({ remove: () => {} }) as any,
  removeListener: () => {},
  removeAllListeners: () => {},
} as unknown as FridayCoreNativeModule;

export const FridayCore: FridayCoreNativeModule = tryLoad() ?? stub;
export const isNativeAvailable = (): boolean => tryLoad() !== null;
export default FridayCore;
