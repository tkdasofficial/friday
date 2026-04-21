import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

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
import { chatCompletion, textToSpeech } from "@/utils/openaiClient";

export type FridayStatus =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

interface FridayContextValue {
  settings: FridaySettings;
  history: ConversationEntry[];
  status: FridayStatus;
  isActive: boolean;
  currentTranscript: string;
  lastResponse: string;
  error: string | null;

  updateSettings: (updates: Partial<FridaySettings>) => Promise<void>;
  addCustomCommand: (cmd: Omit<CustomCommand, "id">) => Promise<void>;
  removeCustomCommand: (id: string) => Promise<void>;
  processTextCommand: (text: string) => Promise<void>;
  clearConversationHistory: () => Promise<void>;
  setActive: (active: boolean) => void;
  setCurrentTranscript: (text: string) => void;
  setStatus: (status: FridayStatus) => void;
  setError: (error: string | null) => void;
  speakText: (text: string) => Promise<void>;
}

const FridayContext = createContext<FridayContextValue | null>(null);

export function FridayProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<FridaySettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<ConversationEntry[]>([]);
  const [status, setStatus] = useState<FridayStatus>("idle");
  const [isActive, setIsActiveState] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<any>(null);

  useEffect(() => {
    async function init() {
      const [loadedSettings, loadedHistory] = await Promise.all([
        loadSettings(),
        loadHistory(),
      ]);
      setSettings(loadedSettings);
      setHistory(loadedHistory);
    }
    init();
  }, []);

  const updateSettings = useCallback(
    async (updates: Partial<FridaySettings>) => {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      await saveSettings(newSettings);
    },
    [settings]
  );

  const addCustomCommand = useCallback(
    async (cmd: Omit<CustomCommand, "id">) => {
      const newCmd: CustomCommand = { ...cmd, id: generateId() };
      const newCommands = [...settings.customCommands, newCmd];
      await updateSettings({ customCommands: newCommands });
    },
    [settings, updateSettings]
  );

  const removeCustomCommand = useCallback(
    async (id: string) => {
      const newCommands = settings.customCommands.filter(
        (cmd) => cmd.id !== id
      );
      await updateSettings({ customCommands: newCommands });
    },
    [settings, updateSettings]
  );

  const addToHistory = useCallback(
    async (entry: Omit<ConversationEntry, "id" | "timestamp">) => {
      const newEntry: ConversationEntry = {
        ...entry,
        id: generateId(),
        timestamp: Date.now(),
      };
      const newHistory = [...history, newEntry];
      setHistory(newHistory);
      await saveHistory(newHistory);
      return newEntry;
    },
    [history]
  );

  const speakText = useCallback(
    async (text: string) => {
      try {
        setStatus("speaking");
        setLastResponse(text);
        await textToSpeech(text, settings.voiceId);
        setStatus("idle");
      } catch {
        setStatus("idle");
      }
    },
    [settings.voiceId]
  );

  const processTextCommand = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setStatus("processing");
      setError(null);

      await addToHistory({ role: "user", content: text });

      try {
        const customCmd = settings.customCommands.find((cmd) =>
          text.toLowerCase().includes(cmd.trigger.toLowerCase())
        );

        if (customCmd) {
          const actionParts = customCmd.action.split(":");
          const actionType = actionParts[0];
          const actionTarget = actionParts[1];

          const result = await executeAction({
            type: actionType,
            target: actionTarget,
          });

          const response =
            result.spokenResponse || `Done: ${customCmd.description}`;
          await addToHistory({
            role: "assistant",
            content: response,
            commandType: "custom",
          });
          await speakText(response);
          return;
        }

        const deviceAction = await parseCommand(text);
        if (deviceAction) {
          const result = await executeAction(deviceAction);
          const response =
            result.spokenResponse || `Task completed: ${result.message}`;
          await addToHistory({
            role: "assistant",
            content: response,
            commandType: deviceAction.type,
          });
          await speakText(response);
          return;
        }

        const recentHistory = history.slice(-10).map((h) => ({
          role: h.role,
          content: h.content,
        }));

        recentHistory.push({ role: "user", content: text });

        const aiResponse = await chatCompletion(
          recentHistory,
          settings.systemPrompt
        );

        await addToHistory({
          role: "assistant",
          content: aiResponse,
          commandType: "conversation",
        });
        await speakText(aiResponse);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMsg);
        setStatus("error");
        const fallback = "I'm sorry, I encountered an error. Please try again.";
        await addToHistory({
          role: "assistant",
          content: fallback,
          commandType: "error",
        });
        setTimeout(() => setStatus("idle"), 2000);
      }
    },
    [settings, history, addToHistory, speakText]
  );

  const clearConversationHistory = useCallback(async () => {
    setHistory([]);
    await clearHistory();
  }, []);

  const setActive = useCallback((active: boolean) => {
    setIsActiveState(active);
    if (!active) {
      setStatus("idle");
      setCurrentTranscript("");
    }
  }, []);

  const value: FridayContextValue = {
    settings,
    history,
    status,
    isActive,
    currentTranscript,
    lastResponse,
    error,
    updateSettings,
    addCustomCommand,
    removeCustomCommand,
    processTextCommand,
    clearConversationHistory,
    setActive,
    setCurrentTranscript,
    setStatus,
    setError,
    speakText,
  };

  return (
    <FridayContext.Provider value={value}>{children}</FridayContext.Provider>
  );
}

export function useFriday() {
  const ctx = useContext(FridayContext);
  if (!ctx) throw new Error("useFriday must be used within FridayProvider");
  return ctx;
}
