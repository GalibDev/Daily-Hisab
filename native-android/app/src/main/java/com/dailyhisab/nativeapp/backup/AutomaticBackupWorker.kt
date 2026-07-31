package com.dailyhisab.nativeapp.backup

import android.content.Context
import android.net.Uri
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.dailyhisab.nativeapp.data.FinanceDatabase
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

class AutomaticBackupWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = runCatching {
        if (!isEnabled(applicationContext)) return Result.success()
        val db = FinanceDatabase.get(applicationContext)
        val transactions = db.transactionDao().getAll()
        val recurring = db.recurringDao().getAll()
        val reminders = db.reminderDao().getAll()
        val notes = db.noteDao().getAll()
        val categories = db.categoryDao().getAll()
        val json = JSONObject().apply {
            put("version", 2)
            put("createdAt", System.currentTimeMillis())
            put("transactions", JSONArray().apply {
                transactions.forEach { item ->
                    put(JSONObject().put("title", item.title).put("category", item.category).put("amount", item.amount)
                        .put("date", item.date).put("time", item.time).put("income", item.type == "income").put("note", item.note))
                }
            })
            put("recurring", JSONArray().apply {
                recurring.forEach { put(JSONObject().put("title", it.title).put("amount", it.amount).put("frequency", it.frequency).put("nextDueDate", it.nextDueDate)) }
            })
            put("reminders", JSONArray().apply {
                reminders.forEach { put(JSONObject().put("title", it.title).put("date", it.date).put("time", it.time).put("completed", it.completed)) }
            })
            put("notes", JSONArray().apply {
                notes.forEach { put(JSONObject().put("title", it.title).put("body", it.body).put("createdAt", it.createdAt).put("pinned", it.pinned).put("colorIndex", it.colorIndex).put("template", it.template)) }
            })
            put("categories", JSONArray().apply {
                categories.forEach { put(JSONObject().put("name", it.name).put("iconName", it.iconName)) }
            })
        }
        val directory = File(applicationContext.filesDir, "backups").apply { mkdirs() }
        File(directory, "daily-hisab-auto-backup.json").writeText(json.toString(2))
        val driveUri = applicationContext.getSharedPreferences(PREFS, 0).getString(KEY_DRIVE_URI, null)
        if (!driveUri.isNullOrBlank()) {
            applicationContext.contentResolver.openOutputStream(Uri.parse(driveUri), "wt")
                ?.bufferedWriter()
                ?.use { it.write(json.toString(2)) }
                ?: error("Could not open the selected Drive backup")
        }
    }.fold(onSuccess = { Result.success() }, onFailure = { Result.retry() })

    companion object {
        private const val UNIQUE_WORK = "daily_hisab_automatic_backup"

        fun schedule(context: Context, intervalDays: Long = configuredIntervalDays(context)) {
            if (!isEnabled(context)) {
                cancel(context)
                return
            }
            WorkManager.getInstance(context).enqueueUniqueWork(
                "${UNIQUE_WORK}_initial",
                ExistingWorkPolicy.REPLACE,
                OneTimeWorkRequestBuilder<AutomaticBackupWorker>().build()
            )
            val request = PeriodicWorkRequestBuilder<AutomaticBackupWorker>(intervalDays.coerceAtLeast(1), TimeUnit.DAYS).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_WORK,
                ExistingPeriodicWorkPolicy.UPDATE,
                request
            )
        }

        fun configureDrive(context: Context, uri: String, intervalDays: Long) {
            context.getSharedPreferences(PREFS, 0).edit()
                .putString(KEY_DRIVE_URI, uri)
                .putLong(KEY_INTERVAL_DAYS, intervalDays)
                .putBoolean(KEY_ENABLED, true)
                .apply()
            schedule(context, intervalDays)
        }

        fun configuredDriveUri(context: Context): String? =
            context.getSharedPreferences(PREFS, 0).getString(KEY_DRIVE_URI, null)

        fun configuredIntervalDays(context: Context): Long =
            context.getSharedPreferences(PREFS, 0).getLong(KEY_INTERVAL_DAYS, 1L)

        fun isEnabled(context: Context): Boolean =
            context.getSharedPreferences(PREFS, 0).getBoolean(KEY_ENABLED, false)

        fun setEnabled(context: Context, enabled: Boolean) {
            context.getSharedPreferences(PREFS, 0).edit().putBoolean(KEY_ENABLED, enabled).apply()
            if (enabled) schedule(context) else cancel(context)
        }

        fun setInterval(context: Context, intervalDays: Long) {
            context.getSharedPreferences(PREFS, 0).edit().putLong(KEY_INTERVAL_DAYS, intervalDays).apply()
            if (isEnabled(context)) schedule(context, intervalDays)
        }

        fun disableDrive(context: Context) {
            context.getSharedPreferences(PREFS, 0).edit().remove(KEY_DRIVE_URI).apply()
        }

        private fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_WORK)
            WorkManager.getInstance(context).cancelUniqueWork("${UNIQUE_WORK}_initial")
        }

        private const val PREFS = "daily_hisab_backup"
        private const val KEY_DRIVE_URI = "drive_uri"
        private const val KEY_INTERVAL_DAYS = "interval_days"
        private const val KEY_ENABLED = "backup_enabled"
    }
}
