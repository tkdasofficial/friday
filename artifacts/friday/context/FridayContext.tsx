import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import NetInfo from "@react-native-community/netinfo";

import {
  type ConversationEntry,
  type CustomCommand,
  type FridaySettings,
  DEFAULT_SETTINGS,
  clearHistory,
  generateId,
  loadHistory,
  loadSettings,
  saveHistory,
  saveSettings,
} from "@/utils/xmlStorage";
import { executeAction, parseCommand } from "@/utils/deviceActions";
import { speak, stopSpeaking, setVoicePrefs } from "@/utils/speechEngine";
import { processOffline } from "@/utils/offlineAI";
import { chatCompletion } from "@/utils/openaiClient";
import {
  startEngine,
  stopEngine,
  addVoiceListener,
  switchToCommandMode,
  switchToWakeWordMode,
  getCurrentMode,
  updateWakeWords,
} from "@/utils/voiceEngine";
import {
  activateKeepAwake,
  deactivateKeepAwake,
  dismissPersistentNotification,
  registerBackgroundTask,
  requestNotificationPermission,
  setupNotificationChannel,
  showPersistentNotification,
  updatePersistentNotification,
} from "@/utils/backgroundService";

export type FridayStatus =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "error"
  | "off";

export type ListeningMode = "wake_word" | "command" | "off";

interface FridayContextValue {
  settings: FridaySettings;
  status: FridayStatus;
  listeningMode: ListeningMode;
  isActive: boolean;
  isOnline: boolean;
  lastTranscript: string;
  lastResponse: string;
  error: string | null;
  isSetupComplete: boolean;

  updateSettings: (updates: Partial<FridaySettings>) => Promise<void>;
  addCustomCommand: (cmd: Omit<CustomCommand, "id">) => Promise<void>;
  removeCustomCommand: (id: string) => Promise<void>;
  startFriday: () => Promise<void>;
  stopFriday: () => Promise<void>;
  clearError: () => void;
  markSetupComplete: () => Promise<void>;
}

const FridayContext = createContext<FridayContextValue | null>(null);

export function FridayProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<FridaySettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<FridayStatus>("off");
  const [listeningMode, setListeningMode] = useState<ListeningMode>("off");
  const [isActive, setIsActive] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const settingsRef = useRef<FridaySettings>(DEFAULT_SETTINGS);
  const isBusyRef = useRef(false);
  const historyRef = useRef<ConversationEntry[]>([]);

  useEffect(() => {
    settingsRef.current = settings;
    setVoicePrefs({
      language: settings.voiceId || "en-US",
      voiceId: settings.voiceName || undefined,
      persona: settings.voicePersona,
      pitch: settings.voicePitch,
      rate: settings.voiceRate,
    });
  }, [settings]);

  useEffect(() => {
    async function init() {
      await setupNotificationChannel();
      const [loadedSettings, loadedHistory] = await Promise.all([
        loadSettings(),
        loadHistory(),
      ]);
      setSettings(loadedSettings);
      settingsRef.current = loadedSettings;
      historyRef.current = loadedHistory;
      setIsSetupComplete(loadedSettings.setupComplete ?? false);
    }
    init();
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });
    return () => unsub();
  }, []);

  const addToHistory = useCallback(
    async (entry: Omit<ConversationEntry, "id" | "timestamp">) => {
      const newEntry: ConversationEntry = {
        ...entry,
        id: generateId(),
        timestamp: Date.now(),
      };
      const newHistory = [...historyRef.current, newEntry];
      historyRef.current = newHistory;
      await saveHistory(newHistory);
    },
    []
  );

  const speakAndReturn = useCallback(
    async (text: string): Promise<void> => {
      setLastResponse(text);
      setStatus("speaking");
      await updatePersistentNotification(settingsRef.current.aiName, text.slice(0, 40));
      await speak(text, {
        onDone: () => {
          setStatus(isActive ? "idle" : "off");
        },
        onError: () => {
          setStatus(isActive ? "idle" : "off");
        },
      });
    },
    [isActive]
  );

  const processCommand = useCallback(
    async (transcript: string) => {
      if (isBusyRef.current) return;
      isBusyRef.current = true;
      setStatus("processing");
      setLastTranscript(transcript);

      const currentSettings = settingsRef.current;

      await addToHistory({ role: "user", content: transcript });

      try {
        const customCmd = currentSettings.customCommands.find((cmd) =>
          transcript.toLowerCase().includes(cmd.trigger.toLowerCase())
        );
        if (customCmd) {
          const [actionType, actionTarget] = customCmd.action.split(":");
          const result = await executeAction({ type: actionType, target: actionTarget });
          const reply = result.spokenResponse || customCmd.description;
          await addToHistory({ role: "assistant", content: reply, commandType: "custom" });
          await speakAndReturn(reply);
          isBusyRef.current = false;
          switchToWakeWordMode();
          setListeningMode("wake_word");
          return;
        }

        const deviceAction = await parseCommand(transcript);
        if (deviceAction) {
          const result = await executeAction(deviceAction);
          const reply = result.spokenResponse || result.message;
          await addToHistory({ role: "assistant", content: reply, commandType: deviceAction.type });
          await speakAndReturn(reply);
          isBusyRef.current = false;
          switchToWakeWordMode();
          setListeningMode("wake_word");
          return;
        }

        const offlineResult = processOffline(transcript, currentSettings);
        if (offlineResult && offlineResult.confidence === "high") {
          await addToHistory({ role: "assistant", content: offlineResult.text, commandType: offlineResult.commandType });
          await speakAndReturn(offlineResult.text);
          isBusyRef.current = false;
          switchToWakeWordMode();
          setListeningMode("wake_word");
          return;
        }

        if (isOnline) {
          const history = historyRef.current.slice(-8).map((h) => ({
            role: h.role,
            content: h.content,
          }));
          history.push({ role: "user", content: transcript });
          const aiReply = await chatCompletion(history, currentSettings.systemPrompt);
          await addToHistory({ role: "assistant", content: aiReply, commandType: "conversation" });
          await speakAndReturn(aiReply);
        } else {
          const reply = offlineResult?.text ||
            `I'm offline right now. I can open apps, call contacts, and handle basic commands without internet.`;
          await addToHistory({ role: "assistant", content: reply, commandType: "offline" });
          await speakAndReturn(reply);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error";
        setError(msg);
        await speakAndReturn("I ran into an issue. Please try again.");
        setTimeout(() => setError(null), 3000);
      }

      isBusyRef.current = false;
      switchToWakeWordMode();
      setListeningMode("wake_word");
    },
    [isOnline, addToHistory, speakAndReturn]
  );

  const startFriday = useCallback(async () => {
    if (isActive) return;

    const notifGranted = await requestNotificationPermission();
    activateKeepAwake();
    await registerBackgroundTask();

    const currentSettings = settingsRef.current;
    if (notifGranted) {
      await showPersistentNotification(
        currentSettings.aiName,
        currentSettings.wakeWord
      );
    }

    setIsActive(true);
    setStatus("idle");
    setListeningMode("wake_word");

    await startEngine({
      wakeWord: currentSettings.wakeWord,
      deactivateWord: currentSettings.deactivateWord,
    });

    const removeListener = addVoiceListener(async (event) => {
      if (event.type === "mode_change") {
        setListeningMode(event.mode as ListeningMode);
        if (event.mode === "wake_word") {
          setStatus("idle");
          isBusyRef.current = false;
        } else if (event.mode === "command") {
          setStatus("listening");
        }
      } else if (event.type === "wake_word_detected") {
        setStatus("listening");
        const s = settingsRef.current;
        await speak(`Yes, ${s.ownerName}?`);
      } else if (event.type === "command_detected") {
        if (!isBusyRef.current) {
          processCommand(event.transcript);
        }
      } else if (event.type === "deactivate_detected") {
        const s = settingsRef.current;
        await speak(`Goodbye ${s.ownerName}. ${s.aiName} going to standby.`);
        setStatus("idle");
        setListeningMode("wake_word");
        isBusyRef.current = false;
      } else if (event.type === "transcript") {
        if (!isBusyRef.current) {
          setLastTranscript(event.text);
        }
      } else if (event.type === "error") {
        setError(event.message);
        setTimeout(() => setError(null), 3000);
      }
    });

    (startFriday as any).__removeListener = removeListener;
  }, [isActive, processCommand]);

  const stopFriday = useCallback(async () => {
    if (!isActive) return;

    const removeListener = (startFriday as any).__removeListener;
    if (removeListener) removeListener();

    await stopEngine();
    await stopSpeaking();
    await dismissPersistentNotification();
    deactivateKeepAwake();

    setIsActive(false);
    setStatus("off");
    setListeningMode("off");
    isBusyRef.current = false;
    setLastTranscript("");
  }, [isActive]);

  const updateSettings = useCallback(
    async (updates: Partial<FridaySettings>) => {
      const newSettings = { ...settingsRef.current, ...updates };
      settingsRef.current = newSettings;
      setSettings(newSettings);
      await saveSettings(newSettings);
      if (isActive && (updates.wakeWord || updates.deactivateWord)) {
        updateWakeWords(
          newSettings.wakeWord,
          newSettings.deactivateWord
        );
      }
    },
    [isActive]
  );

  const addCustomCommand = useCallback(
    async (cmd: Omit<CustomCommand, "id">) => {
      const newCmd: CustomCommand = { ...cmd, id: generateId() };
      const newSettings = {
        ...settingsRef.current,
        customCommands: [...settingsRef.current.customCommands, newCmd],
      };
      settingsRef.current = newSettings;
      setSettings(newSettings);
      await saveSettings(newSettings);
    },
    []
  );

  const removeCustomCommand = useCallback(async (id: string) => {
    const newSettings = {
      ...settingsRef.current,
      customCommands: settingsRef.current.customCommands.filter((c) => c.id !== id),
    };
    settingsRef.current = newSettings;
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, []);

  const markSetupComplete = useCallback(async () => {
    await updateSettings({ setupComplete: true } as any);
    setIsSetupComplete(true);
  }, [updateSettings]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <FridayContext.Provider
      value={{
        settings,
        status,
        listeningMode,
        isActive,
        isOnline,
        lastTranscript,
        lastResponse,
        error,
        isSetupComplete,
        updateSettings,
        addCustomCommand,
        removeCustomCommand,
        startFriday,
        stopFriday,
        clearError,
        markSetupComplete,
      }}
    >
      {children}
    </FridayContext.Provider>
  );
}

export function useFriday() {
  const ctx = useContext(FridayContext);
  if (!ctx) throw new Error("useFriday must be used within FridayProvider");
  return ctx;
}
