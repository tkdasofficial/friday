import type { FridaySettings } from "./xmlStorage";

export interface OfflineResponse {
  text: string;
  commandType: string;
  confidence: "high" | "medium" | "low";
}

const GREETINGS = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "what's up", "sup"];
const TIME_QUERIES = ["what time", "current time", "tell me the time", "what's the time"];
const DATE_QUERIES = ["what day", "what date", "today's date", "what's today"];
const WEATHER_QUERIES = ["weather", "temperature", "forecast", "rain", "sunny"];
const BATTERY_QUERIES = ["battery", "how much charge", "charging"];
const JOKE_TRIGGERS = ["tell me a joke", "say something funny", "make me laugh", "joke"];
const THANKS_TRIGGERS = ["thank you", "thanks", "thx", "ty", "appreciate"];
const HOW_ARE_YOU = ["how are you", "how do you feel", "are you okay", "you good"];
const CAPABILITIES = ["what can you do", "help me", "your features", "capabilities", "commands", "what do you know"];
const STOP_TRIGGERS = ["stop", "quiet", "shut up", "silence", "enough", "stop talking"];

const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs!",
  "I told my computer I needed a break. Now it won't stop sending me Kit-Kat ads.",
  "Why do Java developers wear glasses? Because they don't C sharp.",
  "A SQL query walks into a bar, walks up to two tables and asks... Can I join you?",
  "Why was the smartphone feeling lonely? It had too many apps but no real connections.",
];

function getRandomJoke(): string {
  return JOKES[Math.floor(Math.random() * JOKES.length)];
}

function getCurrentTime(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getCurrentDate(): string {
  return new Date().toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function processOffline(
  text: string,
  settings: FridaySettings
): OfflineResponse | null {
  const lower = text.toLowerCase().trim();
  const name = settings.aiName;
  const owner = settings.ownerName;

  if (STOP_TRIGGERS.some((t) => lower.includes(t))) {
    return {
      text: "Stopping. Let me know when you need me.",
      commandType: "stop",
      confidence: "high",
    };
  }

  if (GREETINGS.some((g) => lower.startsWith(g) || lower === g)) {
    const hour = new Date().getHours();
    const timeGreeting =
      hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return {
      text: `${timeGreeting}, ${owner}! I'm ${name}, ready to assist you. What would you like me to do?`,
      commandType: "greeting",
      confidence: "high",
    };
  }

  if (HOW_ARE_YOU.some((q) => lower.includes(q))) {
    return {
      text: `I'm operating at peak efficiency, ${owner}. All systems are running perfectly. How can I help you today?`,
      commandType: "status",
      confidence: "high",
    };
  }

  if (TIME_QUERIES.some((q) => lower.includes(q))) {
    return {
      text: `The current time is ${getCurrentTime()}.`,
      commandType: "time",
      confidence: "high",
    };
  }

  if (DATE_QUERIES.some((q) => lower.includes(q))) {
    return {
      text: `Today is ${getCurrentDate()}.`,
      commandType: "date",
      confidence: "high",
    };
  }

  if (WEATHER_QUERIES.some((q) => lower.includes(q))) {
    return {
      text: `I need an internet connection to get live weather data. Please enable Wi-Fi or mobile data, and I'll fetch that for you.`,
      commandType: "weather_offline",
      confidence: "high",
    };
  }

  if (BATTERY_QUERIES.some((q) => lower.includes(q))) {
    return {
      text: `I can't directly read battery levels in this mode. Check your status bar for battery information.`,
      commandType: "battery",
      confidence: "medium",
    };
  }

  if (JOKE_TRIGGERS.some((t) => lower.includes(t))) {
    return {
      text: getRandomJoke(),
      commandType: "joke",
      confidence: "high",
    };
  }

  if (THANKS_TRIGGERS.some((t) => lower.includes(t))) {
    return {
      text: `You're welcome, ${owner}. Always here to help.`,
      commandType: "thanks",
      confidence: "high",
    };
  }

  if (CAPABILITIES.some((c) => lower.includes(c))) {
    return {
      text: `I can open apps, search the web, make calls, send messages, navigate to locations, play music, set alarms and timers, control Wi-Fi and Bluetooth, answer questions, and tell jokes. Just ask me anything, ${owner}.`,
      commandType: "capabilities",
      confidence: "high",
    };
  }

  const openMatch = lower.match(/^(?:open|launch|start|go to)\s+(.+)$/);
  if (openMatch) return null;

  const searchMatch = lower.match(/^(?:search|find|google|look up)\s+/);
  if (searchMatch) return null;

  const callMatch = lower.match(/^(?:call|phone|dial)\s+/);
  if (callMatch) return null;

  const navMatch = lower.match(/^(?:navigate|directions|take me to)\s+/);
  if (navMatch) return null;

  const playMatch = lower.match(/^(?:play|start playing)\s+/);
  if (playMatch) return null;

  if (lower.length < 10) {
    return {
      text: `Could you be more specific? I'm listening, ${owner}.`,
      commandType: "unclear",
      confidence: "low",
    };
  }

  return {
    text: `I'm in offline mode right now. I can open apps, make calls, and handle basic requests without internet. For complex questions, please connect to the internet and I'll use my full intelligence.`,
    commandType: "offline_fallback",
    confidence: "low",
  };
}

export function isOnlineRequired(text: string): boolean {
  const lower = text.toLowerCase();
  const onlineKeywords = [
    "weather", "news", "latest", "current", "stock", "price",
    "who is", "what is", "tell me about", "explain", "translate",
    "calculate", "how to", "why", "when did", "definition",
  ];
  return onlineKeywords.some((k) => lower.includes(k));
}
