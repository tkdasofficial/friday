package com.friday.core

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.AlarmClock
import android.provider.MediaStore
import android.provider.Settings

/**
 * Pure-Kotlin natural-language command router for the most common voicebot intents.
 * Returns a structured intent + payload and (when possible) executes the action via Intents.
 */
object CommandRouter {

  data class Routed(val intent: String, val payload: Map<String, String>, val handled: Boolean)

  private val callR = Regex("""^(?:please\s+)?(?:call|dial|phone|ring)\s+(.+)$""", RegexOption.IGNORE_CASE)
  private val smsR = Regex("""^(?:send\s+(?:a\s+)?(?:sms|message|text)\s+to|text|message)\s+([^,]+?)(?:\s+(?:saying|that\s+says|with)\s+(.+))?$""", RegexOption.IGNORE_CASE)
  private val openR = Regex("""^(?:open|launch|start)\s+(.+)$""", RegexOption.IGNORE_CASE)
  private val webR = Regex("""^(?:open|go to|browse to|visit|navigate to)\s+(?:the\s+)?(?:website|site|url)?\s*([\w\-]+\.[\w\-.]+(?:/\S*)?)$""", RegexOption.IGNORE_CASE)
  private val searchR = Regex("""^(?:search|google|look up|find)\s+(?:for\s+)?(.+)$""", RegexOption.IGNORE_CASE)
  private val mapR = Regex("""^(?:navigate|directions|map)(?:\s+to)?\s+(.+)$""", RegexOption.IGNORE_CASE)
  private val alarmR = Regex("""^(?:set\s+(?:an?\s+)?alarm\s+(?:for\s+)?)(.+)$""", RegexOption.IGNORE_CASE)
  private val timerR = Regex("""^(?:set\s+(?:a\s+)?timer\s+(?:for\s+)?)(\d+)\s*(seconds?|minutes?|hours?)?$""", RegexOption.IGNORE_CASE)
  private val cameraR = Regex("""^(?:open\s+)?camera$|^take\s+(?:a\s+)?(?:photo|picture|selfie)$""", RegexOption.IGNORE_CASE)
  private val flashR = Regex("""^(?:turn\s+(on|off)\s+(?:the\s+)?(?:flash(?:light)?|torch))$|^(?:flash(?:light)?|torch)\s+(on|off)$""", RegexOption.IGNORE_CASE)
  private val brightnessR = Regex("""^(?:set\s+)?brightness\s+(?:to\s+)?(\d{1,3})\s*%?$""", RegexOption.IGNORE_CASE)
  private val playR = Regex("""^(?:play|put\s+on)\s+(.+)$""", RegexOption.IGNORE_CASE)

  fun route(ctx: Context, raw: String): Routed {
    val text = raw.trim().trimEnd('.', '?', '!').replace(Regex("\\s+"), " ")
    if (text.isEmpty()) return Routed("noop", mapOf("text" to raw), false)

    callR.matchEntire(text)?.let { m ->
      val target = m.groupValues[1].trim()
      return tryAction("call", mapOf("target" to target)) {
        val number = digitsOnly(target)
        val intent = Intent(if (number.length >= 4) Intent.ACTION_CALL else Intent.ACTION_DIAL).apply {
          data = Uri.parse("tel:" + (if (number.length >= 4) number else target))
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        ctx.startActivity(intent)
      }
    }

    smsR.matchEntire(text)?.let { m ->
      val to = m.groupValues[1].trim()
      val body = m.groupValues.getOrNull(2)?.trim().orEmpty()
      return tryAction("sms", mapOf("to" to to, "body" to body)) {
        val number = digitsOnly(to)
        val intent = Intent(Intent.ACTION_SENDTO).apply {
          data = Uri.parse("smsto:" + (if (number.length >= 4) number else to))
          if (body.isNotEmpty()) putExtra("sms_body", body)
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        ctx.startActivity(intent)
      }
    }

    cameraR.matchEntire(text)?.let {
      return tryAction("camera", emptyMap()) {
        val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
        ctx.startActivity(intent)
      }
    }

    flashR.matchEntire(text)?.let { m ->
      val state = (m.groupValues.drop(1).firstOrNull { it.isNotEmpty() } ?: "on").lowercase()
      return Routed("flash", mapOf("state" to state), false) // requires CameraManager – exposed but not toggled here
    }

    brightnessR.matchEntire(text)?.let { m ->
      val level = m.groupValues[1].toIntOrNull()?.coerceIn(0, 100) ?: 50
      return tryAction("brightness", mapOf("level" to level.toString())) {
        val intent = Intent(Settings.ACTION_DISPLAY_SETTINGS).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
        ctx.startActivity(intent)
      }
    }

    timerR.matchEntire(text)?.let { m ->
      val n = m.groupValues[1].toIntOrNull() ?: 0
      val unit = m.groupValues.getOrNull(2)?.lowercase().orEmpty()
      val seconds = when {
        unit.startsWith("hour") -> n * 3600
        unit.startsWith("min") || unit.isEmpty() -> n * 60
        else -> n
      }
      return tryAction("timer", mapOf("seconds" to seconds.toString())) {
        val intent = Intent(AlarmClock.ACTION_SET_TIMER).apply {
          putExtra(AlarmClock.EXTRA_LENGTH, seconds)
          putExtra(AlarmClock.EXTRA_SKIP_UI, true)
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        ctx.startActivity(intent)
      }
    }

    alarmR.matchEntire(text)?.let { m ->
      val spec = m.groupValues[1]
      return tryAction("alarm", mapOf("spec" to spec)) {
        val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
          putExtra(AlarmClock.EXTRA_MESSAGE, spec)
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        ctx.startActivity(intent)
      }
    }

    mapR.matchEntire(text)?.let { m ->
      val place = m.groupValues[1].trim()
      return tryAction("map", mapOf("place" to place)) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=" + Uri.encode(place))).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        ctx.startActivity(intent)
      }
    }

    webR.matchEntire(text)?.let { m ->
      val url = m.groupValues[1]
      val full = if (url.startsWith("http")) url else "https://$url"
      return tryAction("web", mapOf("url" to full)) {
        ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(full)).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK })
      }
    }

    searchR.matchEntire(text)?.let { m ->
      val q = m.groupValues[1]
      return tryAction("search", mapOf("query" to q)) {
        ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/search?q=" + Uri.encode(q))).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        })
      }
    }

    openR.matchEntire(text)?.let { m ->
      val app = m.groupValues[1].trim()
      return tryAction("open_app", mapOf("name" to app)) {
        val pm = ctx.packageManager
        val pkg = findPackageByName(ctx, app)
          ?: throw ActivityNotFoundException("No package for $app")
        val launch = pm.getLaunchIntentForPackage(pkg)
          ?: throw ActivityNotFoundException("No launcher for $pkg")
        launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        ctx.startActivity(launch)
      }
    }

    playR.matchEntire(text)?.let { m ->
      val q = m.groupValues[1].trim()
      return tryAction("play", mapOf("query" to q)) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/results?search_query=" + Uri.encode(q))).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        ctx.startActivity(intent)
      }
    }

    return Routed("chat", mapOf("text" to text), false)
  }

  private inline fun tryAction(name: String, payload: Map<String, String>, action: () -> Unit): Routed = try {
    action(); Routed(name, payload, true)
  } catch (e: Exception) {
    Routed(name, payload + ("error" to (e.message ?: e::class.java.simpleName)), false)
  }

  private fun digitsOnly(s: String): String = s.filter { it.isDigit() || it == '+' }

  private fun findPackageByName(ctx: Context, query: String): String? {
    val q = query.lowercase().trim()
    val pm = ctx.packageManager
    val installed = pm.getInstalledApplications(0)
    val direct = installed.firstOrNull { pm.getApplicationLabel(it).toString().equals(q, true) }
    if (direct != null) return direct.packageName
    val partial = installed.firstOrNull { pm.getApplicationLabel(it).toString().lowercase().contains(q) }
    if (partial != null) return partial.packageName
    // Common aliases
    val aliases = mapOf(
      "whatsapp" to "com.whatsapp",
      "youtube" to "com.google.android.youtube",
      "chrome" to "com.android.chrome",
      "gmail" to "com.google.android.gm",
      "maps" to "com.google.android.apps.maps",
      "spotify" to "com.spotify.music",
      "instagram" to "com.instagram.android",
      "facebook" to "com.facebook.katana",
      "telegram" to "org.telegram.messenger",
      "twitter" to "com.twitter.android",
      "settings" to "com.android.settings",
      "calculator" to "com.google.android.calculator",
      "calendar" to "com.google.android.calendar",
      "camera" to "com.android.camera2"
    )
    return aliases[q]
  }
}
