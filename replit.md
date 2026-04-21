# FRIDAY - AI VoiceBot

## Overview

FRIDAY is an AI-powered voice assistant mobile app built with React Native (Expo). It can follow voice/text commands, control device functions, and respond intelligently using OpenAI's GPT models with text-to-speech capabilities.

## Architecture

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Mobile**: Expo / React Native (artifacts/friday/)
- **API framework**: Express 5 (artifacts/api-server/)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2 + TTS + STT)
- **Local Storage**: AsyncStorage with XML serialization (no external DB)
- **Build**: esbuild (API server)

## Key Features

- Voice orb interface with animated states (idle/listening/processing/speaking)
- AI conversation powered by GPT-5.2 (via Replit AI Integrations)
- Text-to-speech responses using OpenAI TTS (6 voice options)
- Device automation: open apps, search, call, message, navigate, play music, alarms, timers, WiFi/Bluetooth settings
- Custom AI name, wake word, deactivate word
- Owner name personalization
- Custom trigger commands mapped to device actions
- XML-based local storage (no external backend/database)
- Conversation history with grouping by date
- Security mode toggle
- Full permissions manifest (microphone, camera, contacts, location)

## App Structure (artifacts/friday/)

- `app/index.tsx` — Main voice interface with VoiceOrb
- `app/settings.tsx` — AI settings, custom commands, voice selection
- `app/history.tsx` — Conversation history
- `components/VoiceOrb.tsx` — Animated voice orb with wave effects
- `components/StatusBadge.tsx` — Status indicator
- `components/ConversationBubble.tsx` — Chat bubbles
- `context/FridayContext.tsx` — Global state management
- `utils/xmlStorage.ts` — XML-based persistence layer
- `utils/deviceActions.ts` — Device automation (Linking-based)
- `utils/openaiClient.ts` — Client for AI API calls

## API Server (artifacts/api-server/)

- `POST /api/friday/chat` — GPT-5.2 chat completions
- `POST /api/friday/transcribe` — Audio transcription (STT)
- `POST /api/friday/speak` — Text-to-speech (TTS)
- `GET /api/healthz` — Health check

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/friday run dev` — run Expo app locally

## Environment Variables

- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Auto-set by Replit AI Integrations
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Auto-set by Replit AI Integrations
- `EXPO_PUBLIC_DOMAIN` — Injected at runtime by Expo workflow

## Notes

- Uses npm-only compatible packages (no pnpm-specific overrides in Expo)
- XML storage format for all persistent data (settings + history)
- Device automation uses React Native Linking API for cross-platform support
- On Android, deeper device control requires accessibility services (out of Expo Go scope)
- Full native Java/Kotlin modules would require an EAS build (not Expo Go)
