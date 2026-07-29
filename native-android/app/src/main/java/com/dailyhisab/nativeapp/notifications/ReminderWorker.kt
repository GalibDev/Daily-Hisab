package com.dailyhisab.nativeapp.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.concurrent.TimeUnit
import java.util.Locale

class ReminderWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val enabled = applicationContext.getSharedPreferences("daily_hisab_settings", 0)
            .getBoolean("notifications", true)
        if (!enabled) return Result.success()

        val title = inputData.getString("title") ?: "Daily Hisab Reminder"
        val manager = applicationContext.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "Expense reminders", NotificationManager.IMPORTANCE_HIGH)
        )
        if (ActivityCompat.checkSelfPermission(applicationContext, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            NotificationManagerCompat.from(applicationContext).notify(
                title.hashCode(),
                NotificationCompat.Builder(applicationContext, CHANNEL_ID)
                    .setSmallIcon(com.dailyhisab.nativeapp.R.drawable.ic_daily_hisab)
                    .setContentTitle("Daily Hisab")
                    .setContentText(title)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setContentIntent(
                        PendingIntent.getActivity(
                            applicationContext,
                            title.hashCode(),
                            Intent(applicationContext, com.dailyhisab.nativeapp.MainActivity::class.java),
                            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                        )
                    )
                    .setAutoCancel(true)
                    .build()
            )
        }
        return Result.success()
    }

    companion object {
        private const val CHANNEL_ID = "daily_hisab_reminders"

        fun schedule(context: Context, title: String, date: String, time: String) {
            val target = runCatching {
                LocalDateTime.of(
                    LocalDate.parse(date),
                    LocalTime.parse(time, DateTimeFormatter.ofPattern("hh:mm a", Locale.US))
                )
            }.getOrElse { LocalDateTime.now().plusSeconds(5) }
            val delay = Duration.between(LocalDateTime.now(), target).toMillis().coerceAtLeast(5_000)
            val work = OneTimeWorkRequestBuilder<ReminderWorker>()
                .addTag(WORK_TAG)
                .setInitialDelay(delay, TimeUnit.MILLISECONDS)
                .setInputData(Data.Builder().putString("title", title).build())
                .build()
            WorkManager.getInstance(context).enqueue(work)
        }

        fun cancelAll(context: Context) {
            WorkManager.getInstance(context).cancelAllWorkByTag(WORK_TAG)
        }

        private const val WORK_TAG = "daily_hisab_reminder_work"
    }
}
