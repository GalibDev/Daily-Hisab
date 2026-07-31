package com.dailyhisab.nativeapp.notifications

import android.Manifest
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.dailyhisab.nativeapp.MainActivity
import com.dailyhisab.nativeapp.R
import com.dailyhisab.nativeapp.data.FinanceDatabase
import com.dailyhisab.nativeapp.data.AppNotificationEntity
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.YearMonth
import java.util.concurrent.TimeUnit

class DailyInsightWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val settings = applicationContext.getSharedPreferences("daily_hisab_settings", 0)
        if (!settings.getBoolean("notifications", true)) return Result.success()
        val today = LocalDate.now()
        val dao = FinanceDatabase.get(applicationContext).transactionDao()
        if (dao.expenseCountForDate(today.toString()) == 0) {
            notify(
                7101,
                "আজকের খরচ যোগ করেছেন?",
                "আজ কোনো খরচ যোগ করা হয়নি। প্রয়োজন হলে এখনই আজকের হিসাব যোগ করুন।"
            )
        }

        val budgetPrefs = applicationContext.getSharedPreferences("daily_hisab_budget", 0)
        val monthlyBudget = budgetPrefs.getInt("monthly_budget", 0)
        if (monthlyBudget > 0) {
            val month = YearMonth.from(today)
            val spent = dao.expenseTotalBetween(month.atDay(1).toString(), month.atEndOfMonth().toString())
            val expectedSpend = monthlyBudget.toDouble() * today.dayOfMonth / month.lengthOfMonth()
            val usedPercent = spent * 100 / monthlyBudget
            if (usedPercent >= 80 && spent < monthlyBudget) {
                val remaining = (monthlyBudget - spent).coerceAtLeast(0)
                val remainingDays = (month.lengthOfMonth() - today.dayOfMonth).coerceAtLeast(1)
                notify(
                    7102,
                    "Budget $usedPercent% used",
                    "Remaining ৳$remaining. Keep daily spending within ৳${remaining / remainingDays} for the rest of the month."
                )
            } else if (spent > expectedSpend && spent < monthlyBudget) {
                val remaining = (monthlyBudget - spent).coerceAtLeast(0)
                val remainingDays = (month.lengthOfMonth() - today.dayOfMonth).coerceAtLeast(1)
                notify(7102, "Budget is running ahead", "Remaining ৳$remaining. Spend up to ৳${remaining / remainingDays} per day to stay on track.")
            } else if (spent >= monthlyBudget) {
                notify(7102, "Monthly budget exceeded", "You have reached or exceeded your ৳$monthlyBudget monthly budget.")
            }
        }
        return Result.success()
    }

    private suspend fun notify(id: Int, title: String, message: String) {
        FinanceDatabase.get(applicationContext).appNotificationDao().insert(
            AppNotificationEntity(
                title = title,
                message = message,
                type = if (id == 7102) "budget" else "daily",
                createdAt = LocalDateTime.now().toString()
            )
        )
        if (ActivityCompat.checkSelfPermission(applicationContext, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val intent = Intent(applicationContext, MainActivity::class.java)
        val soundEnabled = applicationContext.getSharedPreferences("daily_hisab_settings", 0)
            .getBoolean("notification_sound", true)
        val channelId = if (soundEnabled) SOUND_CHANNEL_ID else SILENT_CHANNEL_ID
        val pendingIntent = PendingIntent.getActivity(
            applicationContext,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        NotificationManagerCompat.from(applicationContext).notify(
            id,
            NotificationCompat.Builder(applicationContext, channelId)
                .setSmallIcon(R.drawable.ic_daily_hisab)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .build()
        )
    }

    companion object {
        private const val SOUND_CHANNEL_ID = "daily_hisab_reminders_sound"
        private const val SILENT_CHANNEL_ID = "daily_hisab_reminders_silent"
        private const val UNIQUE_WORK = "daily_hisab_daily_insights"

        fun schedule(context: Context) {
            val now = LocalDateTime.now()
            var target = LocalDateTime.of(LocalDate.now(), LocalTime.of(20, 30))
            if (!target.isAfter(now)) target = target.plusDays(1)
            val initialDelay = Duration.between(now, target).toMillis()
            val work = PeriodicWorkRequestBuilder<DailyInsightWorker>(24, TimeUnit.HOURS)
                .setInitialDelay(initialDelay, TimeUnit.MILLISECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_WORK,
                ExistingPeriodicWorkPolicy.UPDATE,
                work
            )
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_WORK)
        }
    }
}
