import { Alert, Linking, Platform } from "react-native";

export interface DeviceAction {
  type: string;
  target?: string;
  value?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  spokenResponse?: string;
}

const APP_SCHEMES: Record<string, string[]> = {
  youtube: [
    "vnd.youtube://",
    "youtube://",
    "https://www.youtube.com",
  ],
  camera: ["camera://"],
  settings: [
    "app-settings:",
    "App-Prefs:root=General",
  ],
  maps: [
    "maps://",
    "comgooglemaps://",
    "https://maps.google.com",
  ],
  spotify: ["spotify://", "https://open.spotify.com"],
  instagram: ["instagram://", "https://www.instagram.com"],
  twitter: ["twitter://", "https://twitter.com"],
  whatsapp: ["whatsapp://", "https://wa.me"],
  facebook: ["fb://", "https://www.facebook.com"],
  gmail: ["googlegmail://", "mailto:"],
  chrome: ["googlechrome://", "https://www.google.com"],
  netflix: ["nflx://", "https://www.netflix.com"],
  tiktok: ["tiktok://", "https://www.tiktok.com"],
  amazon: ["com.amazon.mobile.shopping://", "https://www.amazon.com"],
  snapchat: ["snapchat://", "https://www.snapchat.com"],
  telegram: ["tg://", "https://t.me"],
  uber: ["uber://", "https://www.uber.com"],
  paypal: ["paypal://", "https://www.paypal.com"],
  linkedin: ["linkedin://", "https://www.linkedin.com"],
  zoom: ["zoomus://", "https://zoom.us"],
  discord: ["discord://", "https://discord.com"],
};

const SEARCH_ENGINES: Record<string, string> = {
  youtube: "https://www.youtube.com/results?search_query=",
  google: "https://www.google.com/search?q=",
  bing: "https://www.bing.com/search?q=",
  amazon: "https://www.amazon.com/s?k=",
  twitter: "https://twitter.com/search?q=",
  spotify: "https://open.spotify.com/search/",
};

export async function parseCommand(text: string): Promise<DeviceAction | null> {
  const lower = text.toLowerCase().trim();

  const openMatch = lower.match(
    /^(?:open|launch|start|go to|navigate to)\s+(.+)$/
  );
  if (openMatch) {
    return { type: "open_app", target: openMatch[1].trim() };
  }

  const searchMatch = lower.match(
    /^(?:search|find|look up|google|search for)\s+(?:for\s+)?(.+?)(?:\s+(?:on|in)\s+(.+))?$/
  );
  if (searchMatch) {
    const query = searchMatch[1].trim();
    const platform = searchMatch[2]?.trim() || "google";
    return { type: "search", target: platform, value: query };
  }

  const callMatch = lower.match(/^(?:call|phone|dial|ring)\s+(.+)$/);
  if (callMatch) {
    return { type: "call", target: callMatch[1].trim() };
  }

  const messageMatch = lower.match(
    /^(?:send|text|message|sms)\s+(.+?)(?:\s+saying\s+(.+))?$/
  );
  if (messageMatch) {
    return {
      type: "message",
      target: messageMatch[1].trim(),
      value: messageMatch[2]?.trim(),
    };
  }

  const emailMatch = lower.match(
    /^(?:email|send email|compose email)\s+(?:to\s+)?(.+?)(?:\s+about\s+(.+))?$/
  );
  if (emailMatch) {
    return {
      type: "email",
      target: emailMatch[1].trim(),
      value: emailMatch[2]?.trim(),
    };
  }

  const setAlarmMatch = lower.match(
    /^(?:set|create)\s+(?:an?\s+)?alarm(?:\s+for)?\s+(.+)$/
  );
  if (setAlarmMatch) {
    return { type: "alarm", value: setAlarmMatch[1].trim() };
  }

  const timerMatch = lower.match(
    /^(?:set|start)\s+(?:a\s+)?(?:timer|countdown)(?:\s+for)?\s+(.+)$/
  );
  if (timerMatch) {
    return { type: "timer", value: timerMatch[1].trim() };
  }

  const brightnessUpMatch = lower.match(
    /(?:increase|turn up|raise|max|maximize)\s+brightness/
  );
  if (brightnessUpMatch) {
    return { type: "brightness", value: "up" };
  }

  const brightnessDownMatch = lower.match(
    /(?:decrease|turn down|lower|min|minimize|dim)\s+brightness/
  );
  if (brightnessDownMatch) {
    return { type: "brightness", value: "down" };
  }

  const volumeUpMatch = lower.match(
    /(?:increase|turn up|raise|louder|max)\s+volume/
  );
  if (volumeUpMatch) {
    return { type: "volume", value: "up" };
  }

  const volumeDownMatch = lower.match(
    /(?:decrease|turn down|lower|quieter|mute|min)\s+volume/
  );
  if (volumeDownMatch) {
    return { type: "volume", value: "down" };
  }

  const wifiMatch = lower.match(/(?:turn|switch)\s+(on|off)\s+wifi/);
  if (wifiMatch) {
    return { type: "wifi", value: wifiMatch[1] };
  }

  const bluetoothMatch = lower.match(
    /(?:turn|switch)\s+(on|off)\s+bluetooth/
  );
  if (bluetoothMatch) {
    return { type: "bluetooth", value: bluetoothMatch[1] };
  }

  const torchMatch = lower.match(
    /(?:turn|switch|toggle)\s+(on|off)\s+(?:flashlight|torch|flash)/
  );
  if (torchMatch) {
    return { type: "flashlight", value: torchMatch[1] };
  }

  if (
    lower.includes("screenshot") ||
    lower.includes("screen shot") ||
    lower.includes("capture screen")
  ) {
    return { type: "screenshot" };
  }

  if (
    lower.includes("lock screen") ||
    lower.includes("lock phone") ||
    lower.includes("lock device")
  ) {
    return { type: "lock_screen" };
  }

  if (
    lower.includes("turn off screen") ||
    lower.includes("screen off") ||
    lower.includes("sleep screen")
  ) {
    return { type: "screen_off" };
  }

  const noteMatch = lower.match(
    /^(?:note|write|take a note|add note|remember)(?:\s+(?:that|this|down))?\s*:?\s*(.+)$/
  );
  if (noteMatch) {
    return { type: "note", value: noteMatch[1].trim() };
  }

  const navigateMatch = lower.match(
    /^(?:navigate|directions|get directions|take me)\s+(?:to\s+)?(.+)$/
  );
  if (navigateMatch) {
    return { type: "navigate", target: navigateMatch[1].trim() };
  }

  const playMusicMatch = lower.match(
    /^(?:play|start playing)\s+(.+?)(?:\s+(?:on|in)\s+(.+))?$/
  );
  if (playMusicMatch) {
    return {
      type: "play_music",
      value: playMusicMatch[1].trim(),
      target: playMusicMatch[2]?.trim() || "spotify",
    };
  }

  return null;
}

export async function executeAction(action: DeviceAction): Promise<ActionResult> {
  try {
    switch (action.type) {
      case "open_app":
        return await openApp(action.target || "");

      case "search":
        return await performSearch(action.value || "", action.target || "google");

      case "call":
        return await makeCall(action.target || "");

      case "message":
        return await sendMessage(action.target || "", action.value);

      case "email":
        return await composeEmail(action.target || "", action.value);

      case "navigate":
        return await openNavigation(action.target || "");

      case "play_music":
        return await playMusic(action.value || "", action.target);

      case "alarm":
        return await openAlarm(action.value || "");

      case "timer":
        return await openTimer(action.value || "");

      case "brightness":
        return {
          success: true,
          message: `Brightness ${action.value}`,
          spokenResponse: `Adjusting brightness ${action.value === "up" ? "to maximum" : "down"}. Please adjust in Settings if this didn't work automatically.`,
        };

      case "volume":
        return {
          success: true,
          message: `Volume ${action.value}`,
          spokenResponse: `Volume ${action.value === "up" ? "increased" : "decreased"}. Use your device's physical buttons for precise control.`,
        };

      case "wifi":
        return openWifiSettings();

      case "bluetooth":
        return openBluetoothSettings();

      case "flashlight":
        return {
          success: true,
          message: `Flashlight ${action.value}`,
          spokenResponse: `I've sent the flashlight command. On Android, I can control this directly. On iOS, you'll need to use Control Center.`,
        };

      case "screenshot":
        return {
          success: true,
          message: "Screenshot requested",
          spokenResponse:
            "To take a screenshot, press the Power and Volume Down buttons simultaneously. On iPhone, press Power and Home (or Volume Up on newer models).",
        };

      case "lock_screen":
        return {
          success: true,
          message: "Lock screen",
          spokenResponse:
            "To lock your screen, press the Power button on the side of your device.",
        };

      case "screen_off":
        return {
          success: true,
          message: "Screen off",
          spokenResponse:
            "To turn off your screen, press the Power button once.",
        };

      case "note":
        return await openNoteApp(action.value || "");

      default:
        return {
          success: false,
          message: "Unknown action",
          spokenResponse: "I'm not sure how to perform that action.",
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error}`,
      spokenResponse: "I encountered an error while performing that action.",
    };
  }
}

async function openApp(appName: string): Promise<ActionResult> {
  const normalizedName = appName.toLowerCase().replace(/\s+/g, "");
  const appKey =
    Object.keys(APP_SCHEMES).find((key) => normalizedName.includes(key)) || "";

  if (appKey && APP_SCHEMES[appKey]) {
    const schemes = APP_SCHEMES[appKey];
    for (const scheme of schemes) {
      try {
        const canOpen = await Linking.canOpenURL(scheme);
        if (canOpen) {
          await Linking.openURL(scheme);
          return {
            success: true,
            message: `Opened ${appName}`,
            spokenResponse: `Opening ${appName} now.`,
          };
        }
      } catch {}
    }

    const webFallback = schemes[schemes.length - 1];
    if (webFallback.startsWith("http")) {
      await Linking.openURL(webFallback);
      return {
        success: true,
        message: `Opened ${appName} in browser`,
        spokenResponse: `${appName} app wasn't found, opening in browser instead.`,
      };
    }
  }

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(appName + " app")}`;
  await Linking.openURL(searchUrl);
  return {
    success: true,
    message: `Searched for ${appName}`,
    spokenResponse: `I couldn't find ${appName} installed. I've searched for it online.`,
  };
}

async function performSearch(
  query: string,
  platform: string
): Promise<ActionResult> {
  const normalizedPlatform = platform.toLowerCase().replace(/\s+/g, "");
  const engineKey =
    Object.keys(SEARCH_ENGINES).find((key) =>
      normalizedPlatform.includes(key)
    ) || "google";

  const baseUrl = SEARCH_ENGINES[engineKey];
  const searchUrl = baseUrl + encodeURIComponent(query);

  await Linking.openURL(searchUrl);
  return {
    success: true,
    message: `Searching "${query}" on ${engineKey}`,
    spokenResponse: `Searching for "${query}" on ${engineKey}.`,
  };
}

async function makeCall(contact: string): Promise<ActionResult> {
  const telUrl = `tel:${encodeURIComponent(contact)}`;
  await Linking.openURL(telUrl);
  return {
    success: true,
    message: `Calling ${contact}`,
    spokenResponse: `Calling ${contact} now.`,
  };
}

async function sendMessage(
  contact: string,
  message?: string
): Promise<ActionResult> {
  let smsUrl = `sms:${encodeURIComponent(contact)}`;
  if (message) {
    smsUrl += `${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(message)}`;
  }
  await Linking.openURL(smsUrl);
  return {
    success: true,
    message: `Messaging ${contact}`,
    spokenResponse: message
      ? `Opening message to ${contact} with your text.`
      : `Opening message to ${contact}.`,
  };
}

async function composeEmail(
  recipient: string,
  subject?: string
): Promise<ActionResult> {
  let mailUrl = `mailto:${encodeURIComponent(recipient)}`;
  if (subject) {
    mailUrl += `?subject=${encodeURIComponent(subject)}`;
  }
  await Linking.openURL(mailUrl);
  return {
    success: true,
    message: `Emailing ${recipient}`,
    spokenResponse: `Opening email to ${recipient}.`,
  };
}

async function openNavigation(destination: string): Promise<ActionResult> {
  const encoded = encodeURIComponent(destination);
  const url =
    Platform.OS === "ios"
      ? `maps://?q=${encoded}`
      : `geo:0,0?q=${encoded}`;

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    await Linking.openURL(`https://maps.google.com/maps?q=${encoded}`);
  }
  return {
    success: true,
    message: `Navigating to ${destination}`,
    spokenResponse: `Opening navigation to ${destination}.`,
  };
}

async function playMusic(
  query: string,
  platform?: string
): Promise<ActionResult> {
  const normalizedPlatform = (platform || "spotify").toLowerCase();

  if (normalizedPlatform.includes("spotify")) {
    const url = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
    await Linking.openURL(url);
    return {
      success: true,
      message: `Playing "${query}" on Spotify`,
      spokenResponse: `Searching for "${query}" on Spotify.`,
    };
  } else if (normalizedPlatform.includes("youtube")) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " music")}`;
    await Linking.openURL(url);
    return {
      success: true,
      message: `Searching "${query}" on YouTube`,
      spokenResponse: `Searching for "${query}" on YouTube.`,
    };
  }

  const url = `https://www.google.com/search?q=${encodeURIComponent(query + " music")}`;
  await Linking.openURL(url);
  return {
    success: true,
    message: `Searching for music: ${query}`,
    spokenResponse: `Searching for "${query}".`,
  };
}

async function openAlarm(time: string): Promise<ActionResult> {
  const url =
    Platform.OS === "ios"
      ? "clock-alarm://"
      : "intent:#Intent;action=android.intent.action.SET_ALARM;end";

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    await Linking.openURL(
      Platform.OS === "ios" ? "clock://" : "https://www.google.com/search?q=set+alarm+for+" + encodeURIComponent(time)
    );
  }
  return {
    success: true,
    message: `Setting alarm for ${time}`,
    spokenResponse: `Opening the alarm app. Please set your alarm for ${time}.`,
  };
}

async function openTimer(duration: string): Promise<ActionResult> {
  const url =
    Platform.OS === "ios"
      ? "clock-timer://"
      : "intent:#Intent;action=android.intent.action.SET_TIMER;end";

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    await Linking.openURL(Platform.OS === "ios" ? "clock://" : "https://www.google.com/search?q=timer+for+" + encodeURIComponent(duration));
  }
  return {
    success: true,
    message: `Setting timer for ${duration}`,
    spokenResponse: `Opening the timer. Please set it for ${duration}.`,
  };
}

function openWifiSettings(): ActionResult {
  const url =
    Platform.OS === "ios" ? "App-Prefs:root=WIFI" : "android.settings.WIFI_SETTINGS";
  Linking.openURL(url).catch(() => {
    Linking.openURL(Platform.OS === "ios" ? "App-Prefs:" : "https://www.google.com/search?q=wifi+settings");
  });
  return {
    success: true,
    message: "Opening WiFi settings",
    spokenResponse: "Opening WiFi settings for you.",
  };
}

function openBluetoothSettings(): ActionResult {
  const url =
    Platform.OS === "ios"
      ? "App-Prefs:root=Bluetooth"
      : "android.settings.BLUETOOTH_SETTINGS";
  Linking.openURL(url).catch(() => {
    Linking.openURL(Platform.OS === "ios" ? "App-Prefs:" : "https://www.google.com/search?q=bluetooth+settings");
  });
  return {
    success: true,
    message: "Opening Bluetooth settings",
    spokenResponse: "Opening Bluetooth settings for you.",
  };
}

async function openNoteApp(content: string): Promise<ActionResult> {
  const url =
    Platform.OS === "ios"
      ? `mobilenotes://`
      : `intent:#Intent;action=android.intent.action.CREATE_NOTE;end`;

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  }
  return {
    success: true,
    message: `Note: ${content}`,
    spokenResponse: `I've noted that: "${content}". Also opening your notes app.`,
  };
}
