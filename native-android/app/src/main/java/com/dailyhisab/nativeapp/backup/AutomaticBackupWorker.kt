package com.dailyhisab.nativeapp.backup

import android.content.Context
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
                notes.forEach { put(JSONObject().put("title", it.title).put("body", it.body).put("createdAt", it.createdAt).put("pinned", it.pinned)) }
            })
            put("categories", JSONArray().apply {
                categories.forEach { put(JSONObject().put("name", it.name).put("iconName", it.iconName)) }
            })
        }
        val directory = File(applicationContext.filesDir, "backups").apply { mkdirs() }
        File(directory, "daily-hisab-auto-backup.json").writeText(json.toString(2))
    }.fold(onSuccess = { Result.success() }, onFailure = { Result.retry() })

    companion object {
        private const val UNIQUE_WORK = "daily_hisab_automatic_backup"

        fun schedule(context: Context) {
            WorkManager.getInstance(context).enqueueUniqueWork(
                "${UNIQUE_WORK}_initial",
                ExistingWorkPolicy.REPLACE,
                OneTimeWorkRequestBuilder<AutomaticBackupWorker>().build()
            )
            val request = PeriodicWorkRequestBuilder<AutomaticBackupWorker>(24, TimeUnit.HOURS).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_WORK,
                ExistingPeriodicWorkPolicy.UPDATE,
                request
            )
        }
    }
}
