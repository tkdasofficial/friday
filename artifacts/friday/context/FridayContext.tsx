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
import { speak, stopSpeaking } from "@/utils/speechEngine";
import { processOffline } from "@/utils/offlineAI";
import { chatCompletion } from "@/utils/openaiClient";

export type FridayStatus =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "error"
  | "offline";

export interface TaskExecution {
  id: string;
  description: string;
  type: string;
  status: "pending" | "running" | "done" | "failed";
  timestamp: number;
}

interface FridayContextValue {
  settings: FridaySettings;
  history: ConversationEntry[];
  status: FridayStatus;
  isActive: boolean;
  isOnline: boolean;
  currentTranscript: string;
  lastResponse: string;
  error: string | null;
  currentTask: TaskExecution | null;
  backgroundMode: boolean;

  updateSettings: (updates: Partial<FridaySettings>) => Promise<void>;
  addCustomCommand: (cmd: Omit<CustomCommand, "id">) => Promise<void>;
  removeCustomCommand: (id: string) => Promise<void>;
  processTextCommand: (text: string) => Promise<void>;
  clearConversationHistory: () => Promise<void>;
  setActive: (active: boolean) => void;
  setCurrentTranscript: (text: string) => void;
  setStatus: (status: FridayStatus) => void;
  setError: (error: string | null) => void;
  setBackgroundMode: (v: boolean) => void;
  stopAll: () => void;
}

const FridayContext = createContext<FridayContextValue | null>(null);

export function FridayProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<FridaySettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<ConversationEntry[]>([]);
  const [status, setStatus] = useState<FridayStatus>("idle");
  const [isActive, setIsActiveState] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentTask, setCurrentTask] = useState<TaskExecution | null>(null);
  const [backgroundMode, setBackgroundModeState] = useState(false);
  const historyRef = useRef<ConversationEntry[]>([]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    async function init() {
      const [loadedSettings, loadedHistory] = await Promise.all([
        loadSettings(),
        loadHistory(),
      ]);
      setSettings(loadedSettings);
      setHistory(loadedHistory);
      historyRef.current = loadedHistory;
    }
    init();
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });
    return () => unsub();
  }, []);

  const updateSettings = useCallback(
    async (updates: Partial<FridaySettings>) => {
      setSettings((prev) => {
        const newSettings = { ...prev, ...updates };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    []
  );

  const addCustomCommand = useCallback(
    async (cmd: Omit<CustomCommand, "id">) => {
      const newCmd: CustomCommand = { ...cmd, id: generateId() };
      setSettings((prev) => {
        const newSettings = {
          ...prev,
          customCommands: [...prev.customCommands, newCmd],
        };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    []
  );

  const removeCustomCommand = useCallback(async (id: string) => {
    setSettings((prev) => {
      const newSettings = {
        ...prev,
        customCommands: prev.customCommands.filter((c) => c.id !== id),
      };
      saveSettings(newSettings);
      return newSettings;
    });
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
      setHistory(newHistory);
      await saveHistory(newHistory);
      return newEntry;
    },
    []
  );

  const speakResponse = useCallback(
    async (text: string, silent = false) => {
      setLastResponse(text);
      if (silent || backgroundMode) {
        setStatus("speaking");
        await speak(text, {
          onDone: () => setStatus("idle"),
          onError: () => setStatus("idle"),
        });
      } else {
        setStatus("speaking");
        await speak(text, {
          onDone: () => setStatus("idle"),
          onError: () => setStatus("idle"),
        });
      }
    },
    [backgroundMode]
  );

  const processTextCommand = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setStatus("processing");
      setError(null);
      setCurrentTranscript(text);

      const currentSettings = await loadSettings();

      await addToHistory({ role: "user", content: text });

      const taskId = generateId();

      try {
        const customCmd = currentSettings.customCommands.find((cmd) =>
          text.toLowerCase().includes(cmd.trigger.toLowerCase())
        );

        if (customCmd) {
          const actionParts = customCmd.action.split(":");
          setCurrentTask({
            id: taskId,
            description: customCmd.description,
            type: "custom_command",
            status: "running",
            timestamp: Date.now(),
          });

          const result = await executeAction({
            type: actionParts[0],
            target: actionParts[1],
          });

          const response = result.spokenResponse || customCmd.description;
          setCurrentTask((t) => t?.id === taskId ? { ...t, status: "done" } : t);
          await addToHistory({
            role: "assistant",
            content: response,
            commandType: "custom",
          });
          await speakResponse(response);
          setTimeout(() => setCurrentTask(null), 2000);
          setCurrentTranscript("");
          return;
        }

        const deviceAction = await parseCommand(text);
        if (deviceAction) {
          setCurrentTask({
            id: taskId,
            description: `Executing: ${deviceAction.type.replace(/_/g, " ")}`,
            type: deviceAction.type,
            status: "running",
            timestamp: Date.now(),
          });

          const result = await executeAction(deviceAction);
          const response = result.spokenResponse || result.message;
          setCurrentTask((t) => t?.id === taskId ? { ...t, status: "done" } : t);
          await addToHistory({
            role: "assistant",
            content: response,
            commandType: deviceAction.type,
          });
          await speakResponse(response);
          setTimeout(() => setCurrentTask(null), 2000);
          setCurrentTranscript("");
          return;
        }

        const offlineResult = processOffline(text, currentSettings);

        if (offlineResult && offlineResult.confidence === "high") {
          await addToHistory({
            role: "assistant",
            content: offlineResult.text,
            commandType: offlineResult.commandType,
          });
          await speakResponse(offlineResult.text);
          setCurrentTranscript("");
          return;
        }

        if (isOnline) {
          setCurrentTask({
            id: taskId,
            description: "Thinking...",
            type: "ai_chat",
            status: "running",
            timestamp: Date.now(),
          });

          const recentHistory = historyRef.current.slice(-8).map((h) => ({
            role: h.role,
            content: h.content,
          }));
          recentHistory.push({ role: "user", content: text });

          const aiResponse = await chatCompletion(
            recentHistory,
            currentSettings.systemPrompt
          );

          setCurrentTask((t) => t?.id === taskId ? { ...t, status: "done" } : t);
          await addToHistory({
            role: "assistant",
            content: aiResponse,
            commandType: "conversation",
          });
          await speakResponse(aiResponse);
          setTimeout(() => setCurrentTask(null), 2000);
        } else {
          const fallback = offlineResult?.text ||
            `I'm in offline mode. I can open apps, call contacts, and handle basic commands. Connect to internet for my full capabilities.`;
          await addToHistory({
            role: "assistant",
            content: fallback,
            commandType: "offline",
          });
          await speakResponse(fallback);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "An error occurred";
        setError(msg);
        setCurrentTask((t) => t?.id === taskId ? { ...t, status: "failed" } : t);
        const fallback = "I ran into an error. Please try again.";
        await addToHistory({
          role: "assistant",
          content: fallback,
          commandType: "error",
        });
        await speakResponse(fallback);
        setTimeout(() => {
          setError(null);
          setCurrentTask(null);
        }, 3000);
      }
      setCurrentTranscript("");
    },
    [isOnline, addToHistory, speakResponse]
  );

  const clearConversationHistory = useCallback(async () => {
    setHistory([]);
    historyRef.current = [];
    await clearHistory();
  }, []);

  const setActive = useCallback((active: boolean) => {
    setIsActiveState(active);
    if (!active) {
      setStatus("idle");
      setCurrentTranscript("");
      stopSpeaking();
    } else {
      setStatus("idle");
    }
  }, []);

  const stopAll = useCallback(() => {
    stopSpeaking();
    setStatus("idle");
    setCurrentTask(null);
    setCurrentTranscript("");
    setError(null);
  }, []);

  const setBackgroundMode = useCallback((v: boolean) => {
    setBackgroundModeState(v);
  }, []);

  return (
    <FridayContext.Provider
      value={{
        settings,
        history,
        status,
        isActive,
        isOnline,
        currentTranscript,
        lastResponse,
        error,
        currentTask,
        backgroundMode,
        updateSettings,
        addCustomCommand,
        removeCustomCommand,
        processTextCommand,
        clearConversationHistory,
        setActive,
        setCurrentTranscript,
        setStatus,
        setError,
        setBackgroundMode,
        stopAll,
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
