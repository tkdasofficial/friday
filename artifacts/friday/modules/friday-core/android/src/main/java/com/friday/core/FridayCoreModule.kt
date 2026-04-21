package com.friday.core

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FridayCoreModule : Module() {
  private val ctx: Context get() = appContext.reactContext ?: throw IllegalStateException("No context")
  private var tts: NativeTts? = null
  private var recognizer: NativeSpeechRecognizer? = null

  override fun definition() = ModuleDefinition {
    Name("FridayCore")

    Events(
      "onPartial",
      "onFinal",
      "onWake",
      "onError",
      "onState",
      "onCommand"
    )

    OnCreate {
      tts = NativeTts(ctx)
      recognizer = NativeSpeechRecognizer(
        ctx,
        onPartial = { sendEvent("onPartial", mapOf("text" to it)) },
        onFinal = { text ->
          sendEvent("onFinal", mapOf("text" to text))
          val routed = CommandRouter.route(ctx, text)
          sendEvent("onCommand", mapOf(
            "intent" to routed.intent,
            "payload" to routed.payload
          ))
        },
        onWake = { sendEvent("onWake", mapOf("phrase" to it)) },
        onError = { code, msg -> sendEvent("onError", mapOf("code" to code, "message" to msg)) },
        onState = { listening ->
          sendEvent("onState", mapOf(
            "listening" to listening,
            "speaking" to (tts?.isSpeaking ?: false),
            "foreground" to VoiceForegroundService.isRunning
          ))
        }
      )
    }

    OnDestroy {
      recognizer?.shutdown()
      tts?.shutdown()
    }

    Function("isAvailable") { true }

    AsyncFunction("startForegroundService") { promise: expo.modules.kotlin.Promise ->
      try {
        val intent = Intent(ctx, VoiceForegroundService::class.java).apply { action = VoiceForegroundService.ACTION_START }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(intent) else ctx.startService(intent)
        promise.resolve(null)
      } catch (e: Exception) { promise.reject("FG_START", e.message ?: "failed", e) }
    }

    AsyncFunction("stopForegroundService") { promise: expo.modules.kotlin.Promise ->
      try {
        val intent = Intent(ctx, VoiceForegroundService::class.java).apply { action = VoiceForegroundService.ACTION_STOP }
        ctx.startService(intent)
        promise.resolve(null)
      } catch (e: Exception) { promise.reject("FG_STOP", e.message ?: "failed", e) }
    }

    AsyncFunction("startListening") { opts: Map<String, Any?>?, promise: expo.modules.kotlin.Promise ->
      try {
        val wake = opts?.get("wakeWord") as? String
        val locale = opts?.get("locale") as? String ?: "en-US"
        val continuous = opts?.get("continuous") as? Boolean ?: true
        recognizer?.start(wakeWord = wake, locale = locale, continuous = continuous)
        promise.resolve(null)
      } catch (e: Exception) { promise.reject("LISTEN_START", e.message ?: "failed", e) }
    }

    AsyncFunction("stopListening") { promise: expo.modules.kotlin.Promise ->
      try { recognizer?.stop(); promise.resolve(null) }
      catch (e: Exception) { promise.reject("LISTEN_STOP", e.message ?: "failed", e) }
    }

    AsyncFunction("speak") { text: String, prefs: Map<String, Any?>?, promise: expo.modules.kotlin.Promise ->
      try {
        val t = tts ?: run { promise.reject("TTS", "TTS not initialized", null); return@AsyncFunction }
        prefs?.let { t.applyPrefs(it) }
        t.speak(text) { promise.resolve(null) }
      } catch (e: Exception) { promise.reject("TTS_SPEAK", e.message ?: "failed", e) }
    }

    AsyncFunction("stopSpeaking") { promise: expo.modules.kotlin.Promise ->
      try { tts?.stop(); promise.resolve(null) }
      catch (e: Exception) { promise.reject("TTS_STOP", e.message ?: "failed", e) }
    }

    AsyncFunction("setVoicePrefs") { prefs: Map<String, Any?>, promise: expo.modules.kotlin.Promise ->
      try { tts?.applyPrefs(prefs); promise.resolve(null) }
      catch (e: Exception) { promise.reject("TTS_PREFS", e.message ?: "failed", e) }
    }

    AsyncFunction("listVoices") { promise: expo.modules.kotlin.Promise ->
      try { promise.resolve(tts?.listVoices() ?: emptyList<Map<String, Any>>()) }
      catch (e: Exception) { promise.reject("TTS_LIST", e.message ?: "failed", e) }
    }

    AsyncFunction("routeCommand") { text: String, promise: expo.modules.kotlin.Promise ->
      try {
        val r = CommandRouter.route(ctx, text)
        promise.resolve(mapOf("intent" to r.intent, "payload" to r.payload, "handled" to r.handled))
      } catch (e: Exception) { promise.reject("ROUTE", e.message ?: "failed", e) }
    }

    AsyncFunction("hasMicPermission") { promise: expo.modules.kotlin.Promise ->
      val granted = ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
      promise.resolve(granted)
    }

    AsyncFunction("requestMicPermission") { promise: expo.modules.kotlin.Promise ->
      // Permission requests must be initiated from JS side via expo-permissions/expo-av in this build.
      // This API only re-checks current state.
      val granted = ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
      promise.resolve(granted)
    }

    AsyncFunction("ignoreBatteryOptimizations") { promise: expo.modules.kotlin.Promise ->
      try {
        val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
        if (pm.isIgnoringBatteryOptimizations(ctx.packageName)) {
          promise.resolve(true); return@AsyncFunction
        }
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
          data = Uri.parse("package:${ctx.packageName}")
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        ctx.startActivity(intent)
        promise.resolve(false)
      } catch (e: Exception) { promise.reject("BATT", e.message ?: "failed", e) }
    }
  }
}
