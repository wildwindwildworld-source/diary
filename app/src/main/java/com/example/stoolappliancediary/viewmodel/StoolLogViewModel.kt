package com.example.stoolappliancediary.viewmodel

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.stoolappliancediary.MainActivity
import com.example.stoolappliancediary.data.AppDatabase
import com.example.stoolappliancediary.data.StoolLog
import com.example.stoolappliancediary.data.StoolLogDao
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

class StoolLogViewModel(application: Application) : AndroidViewModel(application) {

    private val db = AppDatabase.getDatabase(application)
    private val dao: StoolLogDao = db.stoolLogDao()

    val allLogs: StateFlow<List<StoolLog>> = dao.getAllLogsFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // 装具の在庫管理 (SharedPreferencesで簡単永続化。初期値は 10 個とする)
    private val sharedPrefs = application.getSharedPreferences("appliance_prefs", Context.MODE_PRIVATE)
    private val _applianceStock = MutableStateFlow(sharedPrefs.getInt("appliance_stock", 10))
    val applianceStock: StateFlow<Int> = _applianceStock.asStateFlow()

    private val CHANNEL_ID = "appliance_low_stock_channel"
    private val NOTIFICATION_ID = 2026

    init {
        createNotificationChannel()
    }

    fun setApplianceStock(stock: Int) {
        _applianceStock.value = stock
        sharedPrefs.edit().putInt("appliance_stock", stock).apply()
    }

    // 新規ログ追加処理
    fun addLog(
        amount: Int?,
        hardness: Int?,
        isApplianceChanged: Boolean,
        note: String = "",
        customTimestamp: Long = System.currentTimeMillis()
    ) {
        viewModelScope.launch {
            val log = StoolLog(
                amount = amount,
                hardness = hardness,
                isApplianceChanged = isApplianceChanged,
                note = note,
                timestamp = customTimestamp
            )
            dao.insertLog(log)

            // 「装具交換」フラグがある場合、在庫を -1 減算する
            if (isApplianceChanged) {
                decrementStock()
            }
        }
    }

    // 装具交換にともなう減算処理 & 警告ロジック
    private fun decrementStock() {
        val currentStock = _applianceStock.value
        val newStock = (currentStock - 1).coerceAtLeast(0)
        setApplianceStock(newStock)

        // 在庫数が 7 以下の状態で交換をした場合、バイブレーション & 高プライオリティ通知
        if (newStock <= 7) {
            triggerVibration()
            showPriorityNotification(newStock)
        }
    }

    fun updateLog(log: StoolLog) {
        viewModelScope.launch {
            dao.updateLog(log)
        }
    }

    fun deleteLog(log: StoolLog) {
        viewModelScope.launch {
            dao.deleteLog(log)
        }
    }

    // 端末バイブレーション
    private fun triggerVibration() {
        val context = getApplication<Application>().applicationContext
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        if (vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // ドドドッと短く2回震えるパターン
                val timings = longArrayOf(0, 150, 100, 150)
                val amplitudes = intArrayOf(0, 255, 0, 255)
                vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(400)
            }
        }
    }

    // 高優先度常駐通知の作成
    private fun showPriorityNotification(remainingStock: Int) {
        val context = getApplication<Application>().applicationContext
        
        // 通知クリック時にアプリに飛ぶためのインテント
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_warning) // 標準の警告ピクト
            .setContentTitle("装具の在庫が少なくなっています")
            .setContentText("装具の残りが${remainingStock}個になりました。お早めにご購入ください。")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    // 通知チャネルの作成 (API 26以上必要)
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val context = getApplication<Application>().applicationContext
            val name = "Stoma Appliance Stock Warnings"
            val descriptionText = "Notifications triggered when ostomy supplies fall to 7 items or fewer."
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                enableVibration(true)
                enableLights(true)
            }
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    // エクスポート: JSON形式の書き出し
    suspend fun exportDataAsJson(file: File): Boolean = withContext(Dispatchers.IO) {
        try {
            val logsList = allLogs.value
            val dataMap = mapOf(
                "applianceStock" to _applianceStock.value,
                "logs" to logsList
            )
            val jsonString = Gson().toJson(dataMap)
            file.writeText(jsonString)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    // インポート: JSONデータの復元
    suspend fun importDataFromJson(jsonString: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val type = object : TypeToken<Map<String, Any>>() {}.type
            val dataMap = Gson().fromJson<Map<String, Any>>(jsonString, type)

            // 在庫数
            val stockDouble = dataMap["applianceStock"] as? Double
            stockDouble?.let {
                withContext(Dispatchers.Main) {
                    setApplianceStock(it.toInt())
                }
            }

            // 履歴リストの復元
            val logsJsonElement = Gson().toJson(dataMap["logs"])
            val logsType = object : TypeToken<List<StoolLog>>() {}.type
            val logsList = Gson().fromJson<List<StoolLog>>(logsJsonElement, logsType)

            db.clearAllTables()
            logsList.forEach { log ->
                dao.insertLog(log)
            }
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}
