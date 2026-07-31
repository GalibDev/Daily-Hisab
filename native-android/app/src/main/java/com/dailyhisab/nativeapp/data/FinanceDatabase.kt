package com.dailyhisab.nativeapp.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Delete
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.Index
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Update
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "transactions")
data class TransactionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val category: String,
    val amount: Int,
    val date: String,
    val time: String,
    val type: String,
    val note: String = ""
)

@Entity(tableName = "recurring_expenses")
data class RecurringEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val amount: Int,
    val frequency: String,
    val nextDueDate: String
)

@Entity(tableName = "reminders")
data class ReminderEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val date: String,
    val time: String,
    val completed: Boolean = false
)

@Entity(tableName = "notes")
data class NoteEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val body: String,
    val createdAt: String,
    val pinned: Boolean = false,
    val colorIndex: Int = 0,
    val template: String = "Blank"
)

@Entity(tableName = "receipts")
data class ReceiptEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val uri: String,
    val title: String,
    val amount: Int = 0,
    val createdAt: String
)

@Entity(tableName = "categories", indices = [Index(value = ["name"], unique = true)])
data class CategoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val iconName: String = "other"
)

@Entity(tableName = "app_notifications")
data class AppNotificationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val message: String,
    val type: String,
    val createdAt: String,
    val isRead: Boolean = false
)

@Dao
interface TransactionDao {
    @Query("SELECT * FROM transactions ORDER BY date DESC, id DESC")
    fun observeAll(): Flow<List<TransactionEntity>>
    @Query("SELECT * FROM transactions ORDER BY date DESC, id DESC")
    suspend fun getAll(): List<TransactionEntity>

    @Query("SELECT COUNT(*) FROM transactions WHERE type = 'expense' AND date = :date")
    suspend fun expenseCountForDate(date: String): Int

    @Query("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense' AND date >= :startDate AND date <= :endDate")
    suspend fun expenseTotalBetween(startDate: String, endDate: String): Int

    @Insert
    suspend fun insert(transaction: TransactionEntity)

    @Delete
    suspend fun delete(transaction: TransactionEntity)

    @Update
    suspend fun update(transaction: TransactionEntity)
    @Query("DELETE FROM transactions")
    suspend fun clearAll()
}

@Dao
interface RecurringDao {
    @Query("SELECT * FROM recurring_expenses ORDER BY nextDueDate ASC")
    fun observeAll(): Flow<List<RecurringEntity>>
    @Query("SELECT * FROM recurring_expenses ORDER BY nextDueDate ASC")
    suspend fun getAll(): List<RecurringEntity>
    @Insert suspend fun insert(item: RecurringEntity)
    @Delete suspend fun delete(item: RecurringEntity)
    @Query("DELETE FROM recurring_expenses")
    suspend fun clearAll()
}

@Dao
interface ReminderDao {
    @Query("SELECT * FROM reminders ORDER BY completed ASC, date ASC, time ASC")
    fun observeAll(): Flow<List<ReminderEntity>>
    @Query("SELECT * FROM reminders ORDER BY completed ASC, date ASC, time ASC")
    suspend fun getAll(): List<ReminderEntity>
    @Insert suspend fun insert(item: ReminderEntity)
    @Query("UPDATE reminders SET completed = :completed WHERE id = :id")
    suspend fun setCompleted(id: Long, completed: Boolean)
    @Delete suspend fun delete(item: ReminderEntity)
    @Query("DELETE FROM reminders")
    suspend fun clearAll()
}

@Dao
interface NoteDao {
    @Query("SELECT * FROM notes ORDER BY pinned DESC, id DESC")
    fun observeAll(): Flow<List<NoteEntity>>
    @Query("SELECT * FROM notes ORDER BY pinned DESC, id DESC")
    suspend fun getAll(): List<NoteEntity>
    @Insert suspend fun insert(item: NoteEntity)
    @Query("UPDATE notes SET pinned = :pinned WHERE id = :id")
    suspend fun setPinned(id: Long, pinned: Boolean)
    @Delete suspend fun delete(item: NoteEntity)
    @Query("DELETE FROM notes")
    suspend fun clearAll()
}

@Dao
interface ReceiptDao {
    @Query("SELECT * FROM receipts ORDER BY id DESC")
    fun observeAll(): Flow<List<ReceiptEntity>>
    @Insert suspend fun insert(item: ReceiptEntity)
    @Delete suspend fun delete(item: ReceiptEntity)
}

@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories ORDER BY name ASC")
    fun observeAll(): Flow<List<CategoryEntity>>
    @Query("SELECT * FROM categories ORDER BY name ASC")
    suspend fun getAll(): List<CategoryEntity>
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(item: CategoryEntity)
    @Delete suspend fun delete(item: CategoryEntity)
    @Query("DELETE FROM categories")
    suspend fun clearAll()
}

@Dao
interface AppNotificationDao {
    @Query("SELECT * FROM app_notifications ORDER BY id DESC")
    fun observeAll(): Flow<List<AppNotificationEntity>>
    @Insert suspend fun insert(item: AppNotificationEntity)
    @Query("UPDATE app_notifications SET isRead = 1 WHERE id = :id")
    suspend fun markRead(id: Long)
    @Query("UPDATE app_notifications SET isRead = 1")
    suspend fun markAllRead()
    @Query("DELETE FROM app_notifications")
    suspend fun clearAll()
}

@Database(
    entities = [TransactionEntity::class, RecurringEntity::class, ReminderEntity::class, NoteEntity::class, ReceiptEntity::class, CategoryEntity::class, AppNotificationEntity::class],
    version = 6,
    exportSchema = false
)
abstract class FinanceDatabase : RoomDatabase() {
    abstract fun transactionDao(): TransactionDao
    abstract fun recurringDao(): RecurringDao
    abstract fun reminderDao(): ReminderDao
    abstract fun noteDao(): NoteDao
    abstract fun receiptDao(): ReceiptDao
    abstract fun categoryDao(): CategoryDao
    abstract fun appNotificationDao(): AppNotificationDao

    companion object {
        @Volatile private var instance: FinanceDatabase? = null

        fun get(context: Context): FinanceDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    FinanceDatabase::class.java,
                    "daily_hisab.db"
                ).addMigrations(MIGRATION_4_5, MIGRATION_5_6).fallbackToDestructiveMigration().build().also { instance = it }
            }

        private val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """CREATE TABLE IF NOT EXISTS app_notifications (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        title TEXT NOT NULL,
                        message TEXT NOT NULL,
                        type TEXT NOT NULL,
                        createdAt TEXT NOT NULL,
                        isRead INTEGER NOT NULL DEFAULT 0
                    )""".trimIndent()
                )
            }
        }

        private val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE notes ADD COLUMN colorIndex INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE notes ADD COLUMN template TEXT NOT NULL DEFAULT 'Blank'")
            }
        }
    }
}
