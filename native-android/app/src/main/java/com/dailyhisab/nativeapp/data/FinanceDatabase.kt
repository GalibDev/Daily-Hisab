package com.dailyhisab.nativeapp.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Delete
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
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
    val pinned: Boolean = false
)

@Dao
interface TransactionDao {
    @Query("SELECT * FROM transactions ORDER BY date DESC, id DESC")
    fun observeAll(): Flow<List<TransactionEntity>>

    @Insert
    suspend fun insert(transaction: TransactionEntity)

    @Delete
    suspend fun delete(transaction: TransactionEntity)
}

@Dao
interface RecurringDao {
    @Query("SELECT * FROM recurring_expenses ORDER BY nextDueDate ASC")
    fun observeAll(): Flow<List<RecurringEntity>>
    @Insert suspend fun insert(item: RecurringEntity)
    @Delete suspend fun delete(item: RecurringEntity)
}

@Dao
interface ReminderDao {
    @Query("SELECT * FROM reminders ORDER BY completed ASC, date ASC, time ASC")
    fun observeAll(): Flow<List<ReminderEntity>>
    @Insert suspend fun insert(item: ReminderEntity)
    @Query("UPDATE reminders SET completed = :completed WHERE id = :id")
    suspend fun setCompleted(id: Long, completed: Boolean)
    @Delete suspend fun delete(item: ReminderEntity)
}

@Dao
interface NoteDao {
    @Query("SELECT * FROM notes ORDER BY pinned DESC, id DESC")
    fun observeAll(): Flow<List<NoteEntity>>
    @Insert suspend fun insert(item: NoteEntity)
    @Query("UPDATE notes SET pinned = :pinned WHERE id = :id")
    suspend fun setPinned(id: Long, pinned: Boolean)
    @Delete suspend fun delete(item: NoteEntity)
}

@Database(
    entities = [TransactionEntity::class, RecurringEntity::class, ReminderEntity::class, NoteEntity::class],
    version = 2,
    exportSchema = false
)
abstract class FinanceDatabase : RoomDatabase() {
    abstract fun transactionDao(): TransactionDao
    abstract fun recurringDao(): RecurringDao
    abstract fun reminderDao(): ReminderDao
    abstract fun noteDao(): NoteDao

    companion object {
        @Volatile private var instance: FinanceDatabase? = null

        fun get(context: Context): FinanceDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    FinanceDatabase::class.java,
                    "daily_hisab.db"
                ).fallbackToDestructiveMigration().build().also { instance = it }
            }
    }
}
