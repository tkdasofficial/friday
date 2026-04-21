package com.friday.core

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer

/**
 * Wraps Android's SpeechRecognizer with auto-restart for continuous listening
 * and an optional wake-word gate. All callbacks are invoked on the main thread.
 */
class NativeSpeechRecognizer(
  private val ctx: Context,
  private val onPartial: (String) -> Unit,
  private val onFinal: (String) -> Unit,
  private val onWake: (String) -> Unit,
  private val onError: (String, String) -> Unit,
  private val onState: (Boolean) -> Unit
) {
  private var recognizer: SpeechRecognizer? = null
  private val main = Handler(Looper.getMainLooper())
  private var continuous = true
  private var locale = "en-US"
  private var wakeWord: String? = null
  private var armedAfterWake = false
  @Volatile private var listening = false
  @Volatile private var stopRequested = false

  fun start(wakeWord: String?, locale: String, continuous: Boolean) {
    this.wakeWord = wakeWord?.lowercase()
    this.locale = locale
    this.continuous = continuous
    this.armedAfterWake = wakeWord == null
    this.stopRequested = false
    main.post { ensureRecognizer(); beginListen() }
  }

  fun stop() {
    stopRequested = true
    main.post {
      try { recognizer?.stopListening() } catch (_: Exception) {}
      try { recognizer?.cancel() } catch (_: Exception) {}
      listening = false
      onState(false)
    }
  }

  fun shutdown() {
    stopRequested = true
    main.post {
      try { recognizer?.destroy() } catch (_: Exception) {}
      recognizer = null
      listening = false
    }
  }

  private fun ensureRecognizer() {
    if (recognizer != null) return
    if (!SpeechRecognizer.isRecognitionAvailable(ctx)) {
      onError("UNAVAILABLE", "SpeechRecognizer not available on this device")
      return
    }
    recognizer = SpeechRecognizer.createSpeechRecognizer(ctx).apply {
      setRecognitionListener(buildListener())
    }
  }

  private fun beginListen() {
    if (stopRequested) return
    val r = recognizer ?: return
    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
      putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
      putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale)
      putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
      putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, ctx.packageName)
      putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
      putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1500L)
      putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1200L)
      putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 800L)
    }
    try {
      r.startListening(intent)
      listening = true
      onState(true)
    } catch (e: Exception) {
      onError("START_FAILED", e.message ?: "unknown")
    }
  }

  private fun restartSoon(delayMs: Long = 250L) {
    if (stopRequested || !continuous) {
      listening = false
      onState(false)
      return
    }
    main.postDelayed({ if (!stopRequested) beginListen() }, delayMs)
  }

  private fun buildListener() = object : RecognitionListener {
    override fun onReadyForSpeech(params: Bundle?) {}
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {}
    override fun onEvent(eventType: Int, params: Bundle?) {}

    override fun onPartialResults(partialResults: Bundle?) {
      val text = (partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()).orEmpty()
      if (text.isNotBlank()) {
        if (!armedAfterWake) {
          val w = wakeWord
          if (w != null && text.lowercase().contains(w)) {
            armedAfterWake = true
            onWake(w)
          }
        } else {
          onPartial(text)
        }
      }
    }

    override fun onResults(results: Bundle?) {
      val text = (results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()).orEmpty().trim()
      if (text.isNotEmpty()) {
        if (!armedAfterWake) {
          val w = wakeWord
          if (w != null && text.lowercase().contains(w)) {
            armedAfterWake = true
            onWake(w)
            // Keep the rest of the utterance after the wake word as a command.
            val rest = text.lowercase().substringAfter(w).trim().ifBlank { null }
            if (rest != null) onFinal(rest)
          }
        } else {
          onFinal(text)
          // After a final command, re-arm for next wake word if one is configured.
          if (wakeWord != null) armedAfterWake = false
        }
      }
      restartSoon(150L)
    }

    override fun onError(error: Int) {
      val (code, msg) = when (error) {
        SpeechRecognizer.ERROR_AUDIO -> "AUDIO" to "Audio recording error"
        SpeechRecognizer.ERROR_CLIENT -> "CLIENT" to "Client side error"
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "PERM" to "Insufficient permissions"
        SpeechRecognizer.ERROR_NETWORK -> "NET" to "Network error"
        SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "NET_TIMEOUT" to "Network timeout"
        SpeechRecognizer.ERROR_NO_MATCH -> "NO_MATCH" to "No match"
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "BUSY" to "Recognizer busy"
        SpeechRecognizer.ERROR_SERVER -> "SERVER" to "Server error"
        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "SPEECH_TIMEOUT" to "No speech input"
        else -> "UNKNOWN_$error" to "Unknown recognizer error"
      }
      // Soft errors should auto-recover for continuous listening.
      val softErrors = setOf("NO_MATCH", "SPEECH_TIMEOUT", "BUSY", "NET_TIMEOUT", "CLIENT")
      if (code !in softErrors) onError(code, msg)
      restartSoon(if (code == "BUSY") 600L else 350L)
    }
  }
}
