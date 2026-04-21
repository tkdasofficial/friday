package com.friday.core

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * Always-on foreground service that keeps the voicebot listening even when the
 * Activity is paused or screen is off. The actual recognizer/TTS lifecycle is
 * managed by FridayCoreModule; this service only provides the foreground anchor.
 */
class VoiceForegroundService : Service() {

  companion object {
    const val ACTION_START = "com.friday.core.action.START"
    const val ACTION_STOP = "com.friday.core.action.STOP"
    const val CHANNEL_ID = "friday_voice"
    const val NOTIF_ID = 4242
    @Volatile var isRunning: Boolean = false
      private set
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        isRunning = false
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        return START_NOT_STICKY
      }
      else -> {
        ensureChannel()
        val notif = buildNotification("FRIDAY is listening", "Tap to open the voice assistant")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
          startForeground(NOTIF_ID, notif)
        }
        isRunning = true
      }
    }
    return START_STICKY
  }

  override fun onDestroy() {
    isRunning = false
    super.onDestroy()
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL_ID) == null) {
      val ch = NotificationChannel(CHANNEL_ID, "FRIDAY Voice", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Keeps FRIDAY listening for your voice commands"
        setShowBadge(false)
      }
      nm.createNotificationChannel(ch)
    }
  }

  private fun buildNotification(title: String, text: String): Notification {
    val openAppIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pi = openAppIntent?.let {
      PendingIntent.getActivity(
        this, 0, it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }
    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setOngoing(true)
      .setSilent(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
    pi?.let { builder.setContentIntent(it) }
    return builder.build()
  }
}
