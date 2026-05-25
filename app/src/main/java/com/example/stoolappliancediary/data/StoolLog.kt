package com.example.stoolappliancediary.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Delete
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "stool_logs")
data class StoolLog(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val amount: Int?,               // 1: 少, 2: 並, 3: 多 (null許容)
    val hardness: Int?,             // 1: 軟, 2: 普, 3: 硬 (null許容)
    val isApplianceChanged: Boolean, // 装具交換フラグ
    val note: String = "",          // メモ
    val timestamp: Long             // 記録時刻 (エポックミリ秒)
)

@Dao
interface StoolLogDao {
    @Query("SELECT * FROM stool_logs ORDER BY timestamp DESC")
    fun getAllLogsFlow(): Flow<List<StoolLog>>

    @Query("SELECT * FROM stool_logs WHERE timestamp >= :startOfDay AND timestamp <= :endOfDay ORDER BY timestamp ASC")
    fun getLogsForDayFlow(startOfDay: Long, endOfDay: Long): Flow<List<StoolLog>>

    @Query("SELECT * FROM stool_logs WHERE timestamp >= :startOfDay AND timestamp <= :endOfDay ORDER BY timestamp ASC")
    suspend fun getLogsForDay(startOfDay: Long, endOfDay: Long): List<StoolLog>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLog(log: StoolLog): Long

    @Update
    suspend fun updateLog(log: StoolLog)

    @Delete
    suspend fun deleteLog(log: StoolLog)

    @Query("SELECT COUNT(*) FROM stool_logs WHERE isApplianceChanged = 1 AND timestamp >= :startOfDay AND timestamp <= :endOfDay")
    suspend fun countApplianceChangesForDay(startOfDay: Long, endOfDay: Long): Int
}

@Database(entities = [StoolLog::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun stoolLogDao(): StoolLogDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "stool_appliance_diary_db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
