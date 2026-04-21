package com.friday.core

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import java.util.Locale
import java.util.UUID

/**
 * Native Android TextToSpeech wrapper with female-voice preference,
 * pitch/rate control, and per-utterance completion callbacks.
 */
class NativeTts(private val ctx: Context) {
  private var tts: TextToSpeech? = null
  private var ready = false
  private val pendingCallbacks = mutableMapOf<String, () -> Unit>()

  private var prefPitch: Float = 1.18f
  private var prefRate: Float = 0.94f
  private var prefLocale: String = "en-US"
  private var prefFemale: Boolean = true
  private var prefVoiceName: String? = null

  @Volatile var isSpeaking: Boolean = false
    private set

  init {
    tts = TextToSpeech(ctx.applicationContext) { status ->
      if (status == TextToSpeech.SUCCESS) {
        ready = true
        applyVoiceSelection()
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
          override fun onStart(utteranceId: String?) { isSpeaking = true }
          override fun onDone(utteranceId: String?) {
            isSpeaking = false
            utteranceId?.let { pendingCallbacks.remove(it)?.invoke() }
          }
          @Deprecated("Deprecated in Java")
          override fun onError(utteranceId: String?) {
            isSpeaking = false
            utteranceId?.let { pendingCallbacks.remove(it)?.invoke() }
          }
        })
      }
    }
  }

  fun applyPrefs(prefs: Map<String, Any?>) {
    (prefs["pitch"] as? Number)?.let { prefPitch = it.toFloat().coerceIn(0.5f, 2.0f) }
    (prefs["rate"] as? Number)?.let { prefRate = it.toFloat().coerceIn(0.5f, 2.0f) }
    (prefs["locale"] as? String)?.let { prefLocale = it }
    (prefs["preferFemale"] as? Boolean)?.let { prefFemale = it }
    (prefs["voiceName"] as? String)?.let { prefVoiceName = it.ifBlank { null } }
    applyVoiceSelection()
  }

  private fun applyVoiceSelection() {
    val t = tts ?: return
    if (!ready) return
    t.setPitch(prefPitch)
    t.setSpeechRate(prefRate)
    val locale = parseLocale(prefLocale)
    t.language = locale

    val explicit = prefVoiceName?.let { name -> t.voices?.firstOrNull { it.name.equals(name, true) } }
    val chosen = explicit ?: pickFemaleVoice(t.voices, locale) ?: t.defaultVoice
    if (chosen != null) t.voice = chosen
  }

  private fun pickFemaleVoice(voices: Set<Voice>?, locale: Locale): Voice? {
    if (voices.isNullOrEmpty()) return null
    val matchLocale = voices.filter { it.locale.language == locale.language }
    val pool = if (matchLocale.isNotEmpty()) matchLocale else voices.toList()
    val female = pool.filter { v ->
      val n = v.name.lowercase()
      // Common female-voice naming hints across Google/Samsung/OEM TTS engines.
      n.contains("female") || n.contains("woman") ||
        n.matches(Regex(".*[a-z]+-[a-z]+-[a-z]+\\b\\d*\\b.*")).let { false } ||
        listOf("salli","joanna","kendra","ivy","ayanda","aria","jenny","emma","amber","nova","sweet","heera","kalpana","raveena","sara","lisa","emily","sophia","mia").any { n.contains(it) }
    }
    val notMale = pool.filter { v ->
      val n = v.name.lowercase()
      !n.contains("male") && !n.contains("man") &&
        !listOf("matthew","brian","kevin","russell","arthur","liam","ethan","noah","aiden","ravi","aditya").any { n.contains(it) }
    }
    val candidates = (female + notMale).distinct()
    val highQuality = candidates.filter { it.quality >= Voice.QUALITY_HIGH && !it.isNetworkConnectionRequired }
    return highQuality.firstOrNull() ?: candidates.firstOrNull() ?: pool.firstOrNull()
  }

  fun speak(text: String, onDone: (() -> Unit)? = null) {
    val t = tts ?: return
    val id = UUID.randomUUID().toString()
    if (onDone != null) pendingCallbacks[id] = onDone
    val params = Bundle()
    t.speak(text, TextToSpeech.QUEUE_FLUSH, params, id)
  }

  fun stop() {
    tts?.stop()
    isSpeaking = false
    pendingCallbacks.clear()
  }

  fun listVoices(): List<Map<String, Any>> {
    val t = tts ?: return emptyList()
    return (t.voices ?: emptySet()).map { v ->
      val n = v.name.lowercase()
      val female = n.contains("female") || n.contains("woman") ||
        listOf("salli","joanna","kendra","ivy","aria","jenny","emma","amber","nova","sweet","heera","kalpana","sara","lisa").any { n.contains(it) }
      mapOf(
        "name" to v.name,
        "locale" to v.locale.toLanguageTag(),
        "female" to female,
        "quality" to v.quality
      )
    }
  }

  fun shutdown() {
    try { tts?.stop(); tts?.shutdown() } catch (_: Exception) {}
    tts = null
    ready = false
  }

  private fun parseLocale(tag: String): Locale {
    val parts = tag.replace('_', '-').split('-')
    return when (parts.size) {
      1 -> Locale(parts[0])
      2 -> Locale(parts[0], parts[1])
      else -> Locale(parts[0], parts[1], parts.drop(2).joinToString("_"))
    }
  }
}
