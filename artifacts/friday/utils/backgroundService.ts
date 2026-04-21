import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as KeepAwake from "expo-keep-awake";

export const BACKGROUND_VOICE_TASK = "FRIDAY_BACKGROUND_VOICE";
const NOTIFICATION_ID = "friday-persistent";
const CHANNEL_ID = "friday";

// ─── Notification channel setup ──────────────────────────────────────────────
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "FRIDAY Status",
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: [],
      enableLights: false,
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ─── Persistent notification (shows FRIDAY is running) ───────────────────────
export async function showPersistentNotification(
  aiName: string,
  wakeWord: string
): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
  } catch {}

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: `${aiName} is listening`,
      body: `Say "${wakeWord}" to activate`,
      data: { type: "status" },
      sticky: true,
      autoDismiss: false,
      ...(Platform.OS === "android" && {
        channelId: CHANNEL_ID,
        priority: Notifications.AndroidNotificationPriority.LOW,
        ongoing: true,
      }),
    },
    trigger: null,
  });
}

export async function updatePersistentNotification(
  aiName: string,
  status: string
): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title: `${aiName} — ${status}`,
        body: "Tap to open",
        sticky: true,
        autoDismiss: false,
        ...(Platform.OS === "android" && {
          channelId: CHANNEL_ID,
          priority: Notifications.AndroidNotificationPriority.LOW,
          ongoing: true,
        }),
      },
      trigger: null,
    });
  } catch {}
}

export async function dismissPersistentNotification(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
  } catch {}
}

// ─── Keep-awake (prevent screen/CPU sleep) ───────────────────────────────────
export function activateKeepAwake(): void {
  try {
    KeepAwake.activateKeepAwakeAsync("FRIDAY_SERVICE");
  } catch {}
}

export function deactivateKeepAwake(): void {
  try {
    KeepAwake.deactivateKeepAwake("FRIDAY_SERVICE");
  } catch {}
}

// ─── Background fetch task (keeps app alive periodically) ────────────────────
if (Platform.OS !== "web") {
  TaskManager.defineTask(BACKGROUND_VOICE_TASK, async () => {
    return BackgroundFetch.BackgroundFetchResult.NewData;
  });
}

export async function registerBackgroundTask(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Available ||
      status === BackgroundFetch.BackgroundFetchStatus.Restricted
    ) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_VOICE_TASK, {
        minimumInterval: 15,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch {}
}

export async function unregisterBackgroundTask(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_VOICE_TASK
    );
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_VOICE_TASK);
    }
  } catch {}
}
