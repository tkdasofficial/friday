import AsyncStorage from "@react-native-async-storage/async-storage";

export interface FridaySettings {
  aiName: string;
  wakeWord: string;
  deactivateWord: string;
  voiceId: string;
  customCommands: CustomCommand[];
  conversationHistory: ConversationEntry[];
  securityEnabled: boolean;
  ownerName: string;
  systemPrompt: string;
}

export interface CustomCommand {
  id: string;
  trigger: string;
  action: string;
  description: string;
}

export interface ConversationEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  commandType?: string;
}

const XML_SETTINGS_KEY = "friday_settings_xml";
const XML_HISTORY_KEY = "friday_history_xml";

function settingsToXml(settings: FridaySettings): string {
  const commandsXml = settings.customCommands
    .map(
      (cmd) =>
        `  <command id="${escapeXml(cmd.id)}" trigger="${escapeXml(cmd.trigger)}" action="${escapeXml(cmd.action)}" description="${escapeXml(cmd.description)}" />`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<friday_config>
  <ai_name>${escapeXml(settings.aiName)}</ai_name>
  <wake_word>${escapeXml(settings.wakeWord)}</wake_word>
  <deactivate_word>${escapeXml(settings.deactivateWord)}</deactivate_word>
  <voice_id>${escapeXml(settings.voiceId)}</voice_id>
  <owner_name>${escapeXml(settings.ownerName)}</owner_name>
  <security_enabled>${settings.securityEnabled ? "true" : "false"}</security_enabled>
  <system_prompt>${escapeXml(settings.systemPrompt)}</system_prompt>
  <custom_commands>
${commandsXml}
  </custom_commands>
</friday_config>`;
}

function xmlToSettings(xml: string): Partial<FridaySettings> {
  const getTag = (tag: string): string => {
    const match = xml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`, "s"));
    return match ? unescapeXml(match[1].trim()) : "";
  };

  const commandMatches = xml.matchAll(
    /<command id="([^"]*)" trigger="([^"]*)" action="([^"]*)" description="([^"]*)"\s*\/>/g
  );

  const customCommands: CustomCommand[] = [];
  for (const match of commandMatches) {
    customCommands.push({
      id: unescapeXml(match[1]),
      trigger: unescapeXml(match[2]),
      action: unescapeXml(match[3]),
      description: unescapeXml(match[4]),
    });
  }

  return {
    aiName: getTag("ai_name"),
    wakeWord: getTag("wake_word"),
    deactivateWord: getTag("deactivate_word"),
    voiceId: getTag("voice_id"),
    ownerName: getTag("owner_name"),
    securityEnabled: getTag("security_enabled") === "true",
    systemPrompt: getTag("system_prompt"),
    customCommands,
  };
}

function historyToXml(history: ConversationEntry[]): string {
  const entries = history
    .slice(-100)
    .map(
      (entry) =>
        `  <entry id="${escapeXml(entry.id)}" role="${entry.role}" timestamp="${entry.timestamp}" commandType="${escapeXml(entry.commandType || "")}">
    <content>${escapeXml(entry.content)}</content>
  </entry>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<friday_history>
${entries}
</friday_history>`;
}

function xmlToHistory(xml: string): ConversationEntry[] {
  const entries: ConversationEntry[] = [];
  const matches = xml.matchAll(
    /<entry id="([^"]*)" role="([^"]*)" timestamp="([^"]*)" commandType="([^"]*)">[\s\S]*?<content>([\s\S]*?)<\/content>[\s\S]*?<\/entry>/g
  );

  for (const match of matches) {
    entries.push({
      id: unescapeXml(match[1]),
      role: match[2] as "user" | "assistant",
      timestamp: parseInt(match[3], 10),
      commandType: unescapeXml(match[4]) || undefined,
      content: unescapeXml(match[5]),
    });
  }

  return entries;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export const DEFAULT_SETTINGS: FridaySettings = {
  aiName: "FRIDAY",
  wakeWord: "hey friday",
  deactivateWord: "goodbye friday",
  voiceId: "alloy",
  ownerName: "Boss",
  securityEnabled: false,
  systemPrompt:
    "You are FRIDAY, an advanced AI assistant. You help the user control their device, answer questions, and perform tasks. Be concise, helpful, and proactive. When asked to open apps, provide helpful context. When searching, give useful information. Keep responses short for voice output.",
  customCommands: [
    {
      id: "1",
      trigger: "open youtube",
      action: "open_app:youtube",
      description: "Opens YouTube app",
    },
    {
      id: "2",
      trigger: "open camera",
      action: "open_app:camera",
      description: "Opens Camera app",
    },
    {
      id: "3",
      trigger: "open settings",
      action: "open_app:settings",
      description: "Opens Device Settings",
    },
    {
      id: "4",
      trigger: "open maps",
      action: "open_app:maps",
      description: "Opens Maps app",
    },
    {
      id: "5",
      trigger: "take screenshot",
      action: "device:screenshot",
      description: "Takes a screenshot",
    },
  ],
};

export async function saveSettings(settings: FridaySettings): Promise<void> {
  const xml = settingsToXml(settings);
  await AsyncStorage.setItem(XML_SETTINGS_KEY, xml);
}

export async function loadSettings(): Promise<FridaySettings> {
  try {
    const xml = await AsyncStorage.getItem(XML_SETTINGS_KEY);
    if (!xml) return { ...DEFAULT_SETTINGS };

    const partial = xmlToSettings(xml);
    return {
      ...DEFAULT_SETTINGS,
      ...partial,
      customCommands:
        partial.customCommands && partial.customCommands.length > 0
          ? partial.customCommands
          : DEFAULT_SETTINGS.customCommands,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveHistory(
  history: ConversationEntry[]
): Promise<void> {
  const xml = historyToXml(history);
  await AsyncStorage.setItem(XML_HISTORY_KEY, xml);
}

export async function loadHistory(): Promise<ConversationEntry[]> {
  try {
    const xml = await AsyncStorage.getItem(XML_HISTORY_KEY);
    if (!xml) return [];
    return xmlToHistory(xml);
  } catch {
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(XML_HISTORY_KEY);
}

export function generateId(): string {
  return (
    Date.now().toString() + Math.random().toString(36).substring(2, 9)
  );
}
