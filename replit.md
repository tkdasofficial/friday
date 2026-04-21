# FRIDAY — AI VoiceBot

## Project Overview
FRIDAY is a voice-command AI assistant mobile app (Expo/React Native) with these design principles:
- **Voice-only activation/deactivation** — no buttons, pure wake word flow
- **Offline-first** — TTS and basic AI work without internet (expo-speech + pattern matching)
- **Background service** — runs continuously with persistent notification
- **Setup-only UI** — the app interface is purely for configuration; the bot runs in background

## Architecture

### Key Files
- `artifacts/friday/app/index.tsx` — Minimal status screen (orb + status + gear icon only)
- `artifacts/friday/app/settings.tsx` — Tabbed setup screen (Identity, Activation, Voice, Commands, AI, Permissions)
- `artifacts/friday/context/FridayContext.tsx` — Global state + voice engine integration + background service
- `artifacts/friday/utils/voiceEngine.ts` — Continuous speech recognition loop (expo-speech-recognition + Web Speech API fallback)
- `artifacts/friday/utils/backgroundService.ts` — Background task, keep-awake, persistent notification
- `artifacts/friday/utils/speechEngine.ts` — Offline TTS (expo-speech) with realistic female-voice auto-pick, persona presets (sweet/warm/bright/calm/natural), pitch/rate control, Web Speech API support, and natural-cadence text shaping
- `artifacts/friday/utils/offlineAI.ts` — Offline pattern-matching AI
- `artifacts/friday/utils/deviceActions.ts` — Device automation via Linking (20+ apps)
- `artifacts/friday/utils/xmlStorage.ts` — XML-based local persistence (AsyncStorage backend)
- `artifacts/friday/utils/openaiClient.ts` — Online GPT fallback
- `artifacts/api-server/src/routes/friday.ts` — Chat API endpoint (online mode only)

### Voice Flow
1. App starts → `startEngine()` initializes continuous speech recognition in **wake_word** mode
2. User says wake word (default: "hey friday") → switches to **command** mode, speaks "Yes, [name]?"
3. User says command → `processCommand()` → device action / offline AI / online GPT
4. After response → returns to **wake_word** mode automatically
5. User says deactivate phrase → speaks farewell → stays in wake_word mode (standby)

### Background Service
- `expo-task-manager` + `expo-background-fetch` — keeps app alive periodically
- `expo-keep-awake` — prevents CPU/screen sleep
- `expo-notifications` — persistent foreground-style notification showing status
- True continuous background listening requires an EAS dev build (not Expo Go limitation)

### Offline Capabilities
- TTS: expo-speech (device native, no internet)
- AI: Pattern matching for greetings, time, date, jokes, capabilities, device actions
- Device control: 20+ apps via deep links, calls, navigation, music, alarms
- Online fallback: GPT via API server when connected

### Theme
- Background: #03060F (deep space dark)
- Primary/Tech Blue: #3B9EFF
- Cyber Green: #00E5A0 (listening state)
- Neon Purple: #7C3AED (processing state)
- Font: Inter (400, 500, 600, 700)

## Permissions Required
- Microphone (continuous listening)
- Speech Recognition
- Contacts (calling by name)
- Location (navigation)
- Notifications (background status)
- Wake Lock / Foreground Service (Android)
- Background Audio (iOS)

## Setup Flow for New Users
1. Open app → see "Setup" prompt
2. Tap gear → configure Identity, Activation words, Voice, Commands, AI
3. Grant Permissions
4. Tap "Setup Complete" → returns to home
5. Tap "Start FRIDAY" → background service begins
6. From then on: voice only

## Stack
- Expo SDK 54 / React Native 0.81
- expo-speech-recognition (STT)
- expo-speech (TTS, offline)
- expo-task-manager + expo-background-fetch (background)
- expo-notifications (persistent notification)
- expo-keep-awake (prevent sleep)
- @react-native-community/netinfo (network detection)
- expo-av, expo-haptics, expo-router
