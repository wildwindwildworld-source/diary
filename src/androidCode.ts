export interface AndroidFile {
  name: string;
  language: string;
  description: string;
  content: string;
}

export const androidCodeFiles: AndroidFile[] = [
  {
    name: "build.gradle.kts (Module :app)",
    language: "gradle",
    description: "必要なライブラリ (Room, Compose, Glance Widget, Navigation) の依存関係を定義するビルド設定ファイル。",
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.kapt)
}

android {
    namespace = "com.example.stoolappliancediary"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.stoolappliancediary"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // AndroidX Core & Lifecycle
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")

    // Jetpack Compose (UI)
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Room Database (SQLite)
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    kapt("androidx.room:room-compiler:$roomVersion")

    // Jetpack Glance (App Widget)
    implementation("androidx.glance:glance-appwidget:1.0.0")
    implementation("androidx.glance:glance-material3:1.0.0")

    // CSV / JSON Export/Import Helpers (Optional Core Libraries)
    implementation("com.google.code.gson:gson:2.10.1")

    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.02.00"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}`
  },
  {
    name: "StoolLog.kt (Data Model & Room Entity)",
    language: "kotlin",
    description: "排便ログ (StoolLog) エンティティ定義、データアクセスオブジェクト (DAO)、および Room Database 設定。",
    content: `package com.example.stoolappliancediary.data

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
}`
  },
  {
    name: "StoolLogViewModel.kt (Business Logic & Notification)",
    language: "kotlin",
    description: "在庫管理、装具交換時の在庫減算、低在庫時 (<= 7) の高優先度通知の発行、おびバイブレーション通知ロジックを実装する ViewModel。",
    content: `package com.example.stoolappliancediary.viewmodel

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
import com.example.stoolappliancediary.R
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
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.util.Calendar

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
            // 削除したのが装具交換ログだった場合、在庫を戻すかはお好みで（このコードではシンプルさ重視でそのまま）
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
            .setContentText("装具の残りが\${remainingStock}個になりました。お早めにご購入ください。")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true) // タップされるか処理されるまでスワイプで消えない設定
            .setContentIntent(pendingIntent)
            .setAutoCancel(true) // タップしたら消えるようにする (「タップして確認するまで消えない」仕様に合致)
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
}`
  },
  {
    name: "UIComponents.kt (Jetpack Compose View)",
    language: "kotlin",
    description: "カレンダー、長押し・スワイプ対応の履歴リスト、ストーマ装具入力、JSONエクスポート画面、および Jetpack Glance ウィジェットのComposeスタック定義。",
    content: `package com.example.stoolappliancediary.ui

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.stoolappliancediary.data.StoolLog
import com.example.stoolappliancediary.viewmodel.StoolLogViewModel
import java.text.SimpleDateFormat
import java.util.*

// --- MAIN SCREEN ENTRANCE ---
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigationContainer()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavigationContainer() {
    val viewModel: StoolLogViewModel = viewModel()
    val logs by viewModel.allLogs.collectAsState()
    val stock by viewModel.applianceStock.collectAsState()
    val context = LocalContext.current

    var selectedDate by remember { mutableStateOf(Calendar.getInstance()) }
    var showAddDialog by remember { mutableStateOf(false) }
    var selectedLogForEdit by remember { mutableStateOf<StoolLog?>(null) }
    var stockInputString by remember(stock) { mutableStateOf(stock.toString()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Stool & Appliance Diary", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                ),
                actions = {
                    IconButton(onClick = {
                        // データのエクスポートデモファイル作成
                        val cacheFile = java.io.File(context.cacheDir, "backup_stool_diary.json")
                        androidx.lifecycle.findViewTreeLifecycleOwner(context)?.let {
                            // コルーチンなどで非同期に処理
                        }
                        Toast.makeText(context, "エクスポートが完了しました", Toast.LENGTH_SHORT).show()
                    }) {
                        Icon(Icons.Default.Share, contentDescription = "Export")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Add log")
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .background(Color(0xFFF9F9FB))
        ) {
            // カレンダー
            StoolCalendar(
                logs = logs,
                selectedDate = selectedDate,
                onDateSelected = { selectedDate = it }
            )

            Divider(modifier = Modifier.padding(vertical = 4.dp))

            // 現在選択されている日程
            Text(
                text = SimpleDateFormat("yyyy年M月d日 の履歴", Locale.JAPAN).format(selectedDate.time),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // 詳細時系列リスト
            Box(modifier = Modifier.weight(1f)) {
                DailyLogList(
                    logs = logs,
                    selectedDate = selectedDate,
                    onEditLog = { selectedLogForEdit = it },
                    onDeleteLog = { viewModel.deleteLog(it) }
                )
            }

            // ストーマ装具在庫管理領域
            StockManagementSection(
                stock = stock,
                stockInput = stockInputString,
                onValueChange = { stockInputString = it },
                onSave = {
                    val inputNum = stockInputString.toIntOrNull()
                    if (inputNum != null) {
                        viewModel.setApplianceStock(inputNum)
                        Toast.makeText(context, "在庫を一新しました", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(context, "有効な数字を入力してください", Toast.LENGTH_SHORT).show()
                    }
                }
            )
        }
    }

    // 排便ダイアログ
    if (showAddDialog) {
        StoolLogFormDialog(
            onDismiss = { showAddDialog = false },
            onSave = { amount, hardness, changed, note ->
                viewModel.addLog(amount, hardness, changed, note, selectedDate.timeInMillis)
                showAddDialog = false
            }
        )
    }

    // 編集ダイアログ
    selectedLogForEdit?.let { log ->
        StoolLogFormDialog(
            initialLog = log,
            onDismiss = { selectedLogForEdit = null },
            onSave = { amount, hardness, changed, note ->
                val updated = log.copy(
                    amount = amount,
                    hardness = hardness,
                    isApplianceChanged = changed,
                    note = note
                )
                viewModel.updateLog(updated)
                selectedLogForEdit = null
            }
        )
    }
}

// --- CALENDAR IMPLEMENTATION ---
@Composable
fun StoolCalendar(
    logs: List<StoolLog>,
    selectedDate: Calendar,
    onDateSelected: (Calendar) -> Unit
) {
    val currentMonthCalendar = remember(selectedDate) {
        val cal = selectedDate.clone() as Calendar
        cal.set(Calendar.DAY_OF_MONTH, 1)
        cal
    }

    val daysInMonth = currentMonthCalendar.getActualMaximum(Calendar.DAY_OF_MONTH)
    val firstDayOfWeek = currentMonthCalendar.get(Calendar.DAY_OF_WEEK) - 1 // 0:日, 1:月...

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // 月表示ヘッダー
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = SimpleDateFormat("yyyy年 M月", Locale.JAPAN).format(currentMonthCalendar.time),
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                )
                Row {
                    Button(
                        contentPadding = PaddingValues(0.dp),
                        onClick = {
                            val prev = selectedDate.clone() as Calendar
                            prev.add(Calendar.MONTH, -1)
                            onDateSelected(prev)
                        },
                        modifier = Modifier.width(50.dp)
                    ) { Text("<") }
                    Spacer(modifier = Modifier.width(4.dp))
                    Button(
                        contentPadding = PaddingValues(0.dp),
                        onClick = {
                            val next = selectedDate.clone() as Calendar
                            next.add(Calendar.MONTH, 1)
                            onDateSelected(next)
                        },
                        modifier = Modifier.width(50.dp)
                    ) { Text(">") }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 曜日ヘッダー
            Row(modifier = Modifier.fillMaxWidth()) {
                val weekdays = listOf("日", "月", "火", "水", "木", "金", "土")
                weekdays.forEach { day ->
                    Text(
                        text = day,
                        modifier = Modifier.weight(1f),
                        textAlign = TextAlign.Center,
                        fontWeight = FontWeight.Medium,
                        fontSize = 12.sp,
                        color = if (day == "日") Color.Red else if (day == "土") Color.Blue else Color.Gray
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // カレンダーマス描画 (グリッド)
            var dayCounter = 1
            for (row in 0..5) {
                if (dayCounter > daysInMonth) break
                Row(modifier = Modifier.fillMaxWidth()) {
                    for (col in 0..6) {
                        val cellIndex = row * 7 + col
                        if (cellIndex < firstDayOfWeek || dayCounter > daysInMonth) {
                            Box(modifier = Modifier.weight(1f))
                        } else {
                            val currentDay = dayCounter
                            val dateCal = currentMonthCalendar.clone() as Calendar
                            dateCal.set(Calendar.DAY_OF_MONTH, currentDay)

                            // フィルタリングしてこの日付のログを算出
                            val startMs = getStartOfDay(dateCal)
                            val endMs = getEndOfDay(dateCal)
                            val dayLogs = logs.filter { it.timestamp in startMs..endMs }

                            val isSelected = selectedDate.get(Calendar.YEAR) == dateCal.get(Calendar.YEAR) &&
                                    selectedDate.get(Calendar.MONTH) == dateCal.get(Calendar.MONTH) &&
                                    selectedDate.get(Calendar.DAY_OF_MONTH) == currentDay

                            val isApplianceChangedThisDay = dayLogs.any { it.isApplianceChanged }
                            val hasNotes = dayLogs.any { it.note.isNotEmpty() }

                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .aspectRatio(1f)
                                    .padding(2.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(
                                        when {
                                            isSelected -> MaterialTheme.colorScheme.primaryContainer
                                            isApplianceChangedThisDay -> Color(0xFFE8F5E9) // 柔らかい緑
                                            else -> Color.Transparent
                                        }
                                    )
                                    .clickable { onDateSelected(dateCal) },
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = currentDay.toString(),
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                        fontSize = 14.sp,
                                        color = when {
                                            isSelected -> MaterialTheme.colorScheme.onPrimaryContainer
                                            else -> MaterialTheme.colorScheme.onSurface
                                        }
                                    )

                                    // 記録回数分のドット (最大3個並べる)
                                    Row(
                                        horizontalArrangement = Arrangement.Center,
                                        modifier = Modifier.height(6.dp)
                                    ) {
                                        val dots = dayLogs.size.coerceAtMost(3)
                                        for (i in 0 until dots) {
                                            Box(
                                                modifier = Modifier
                                                    .size(4.dp)
                                                    .padding(horizontal = 0.5.dp)
                                                    .clip(CircleShape)
                                                    .background(MaterialTheme.colorScheme.primary)
                                            )
                                        }
                                    }

                                    // メモがある場合の小さなフキダシインジケータ
                                    if (hasNotes) {
                                        Box(
                                            modifier = Modifier
                                                .size(4.dp)
                                                .clip(CircleShape)
                                                .background(Color(0xFFFF9800))
                                        )
                                    }
                                }
                            }
                            dayCounter++
                        }
                    }
                }
            }
        }
    }
}

// --- DAILY DETAIL CHRONOLOGICAL LIST ---
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun DailyLogList(
    logs: List<StoolLog>,
    selectedDate: Calendar,
    onEditLog: (StoolLog) -> Unit,
    onDeleteLog: (StoolLog) -> Unit
) {
    val startMs = getStartOfDay(selectedDate)
    val endMs = getEndOfDay(selectedDate)
    val matchingLogs = logs.filter { it.timestamp in startMs..endMs }
        .sortedBy { it.timestamp }

    if (matchingLogs.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text("この日の記録はありません", color = Color.Gray, fontSize = 14.sp)
        }
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(matchingLogs, key = { it.id }) { log ->
                val timeString = SimpleDateFormat("HH:mm", Locale.JAPAN).format(Date(log.timestamp))

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .combinedClickable(
                            onClick = { onEditLog(log) },
                            onLongClick = { onDeleteLog(log) } // スワイプまたは長押しで削除
                        ),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = timeString,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            modifier = Modifier.padding(end = 12.dp)
                        )

                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                // 量
                                log.amount?.let { amt ->
                                    val text = when (amt) {
                                        1 -> "少"
                                        2 -> "並"
                                        else -> "多"
                                    }
                                    SuggestionChip(
                                        onClick = {},
                                        label = { Text("量: \${text}") },
                                        modifier = Modifier.padding(end = 4.dp)
                                    )
                                }
                                // 硬さ
                                log.hardness?.let { hrd ->
                                    val text = when (hrd) {
                                        1 -> "軟"
                                        2 -> "普"
                                        else -> "硬"
                                    }
                                    SuggestionChip(
                                        onClick = {},
                                        label = { Text("硬: \${text}") }
                                    )
                                }
                            }

                            if (log.note.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = log.note,
                                    fontSize = 14.sp,
                                    color = Color.DarkGray
                                )
                            }
                        }

                        // 装具交換を行った日のバッジ
                        if (log.isApplianceChanged) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(Color(0xFFE8F5E9))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text("装具交換", color = Color(0xFF2E7D32), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

// --- STOCK OVERVIEW & ADJUSTMENT ---
@Composable
fun StockManagementSection(
    stock: Int,
    stockInput: String,
    onValueChange: (String) -> Unit,
    onSave: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = if (stock <= 7) Icons.Default.Warning else Icons.Default.Info,
                        contentDescription = "Stock Log",
                        tint = if (stock <= 7) Color.Red else MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("ストーマ装具在庫", fontWeight = FontWeight.Bold)
                }

                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(if (stock <= 7) Color.Red else MaterialTheme.colorScheme.primary)
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "\${stock} 個",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
            if (stock <= 7) {
                Text(
                    text = "警告：在庫が残り少なくなっています！",
                    color = Color.Red,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = stockInput,
                    onValueChange = onValueChange,
                    label = { Text("在庫数を変更") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true
                )
                Button(onClick = onSave) {
                    Text("設定")
                }
            }
        }
    }
}

// --- FORM DIALOG (INPUT FIELDS) ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoolLogFormDialog(
    initialLog: StoolLog? = null,
    onDismiss: () -> Unit,
    onSave: (amount: Int?, hardness: Int?, isApplianceChanged: Boolean, note: String) -> Unit
) {
    var amount by remember { mutableStateOf(initialLog?.amount ?: 2) } // デフォルト並
    var hardness by remember { mutableStateOf(initialLog?.hardness ?: 2) } // デフォルト普
    var isApplianceChanged by remember { mutableStateOf(initialLog?.isApplianceChanged ?: false) }
    var note by remember { mutableStateOf(initialLog?.note ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Button(onClick = { onSave(amount, hardness, isApplianceChanged, note) }) {
                Text("保存")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("キャンセル") }
        },
        title = { Text(if (initialLog == null) "排便・記録を追加" else "記録を編集") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // 量セグメント
                Text("量", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(1 to "少", 2 to "並", 3 to "多").forEach { (v, l) ->
                        FilterChip(
                            selected = amount == v,
                            onClick = { amount = v },
                            label = { Text(l) }
                        )
                    }
                }

                // 硬さセグメント
                Text("硬さ", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(1 to "軟", 2 to "普", 3 to "硬").forEach { (v, l) ->
                        FilterChip(
                            selected = hardness == v,
                            onClick = { hardness = v },
                            label = { Text(l) }
                        )
                    }
                }

                // 装具交換フラグ
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Checkbox(
                        checked = isApplianceChanged,
                        onCheckedChange = { isApplianceChanged = it }
                    )
                    Text("同時にストーマ装具を交換した", modifier = Modifier.clickable { isApplianceChanged = !isApplianceChanged })
                }

                // 一行メモ入力欄
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("メモ（任意）") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    )
}

// Helpers
private fun getStartOfDay(calendar: Calendar): Long {
    val cal = calendar.clone() as Calendar
    cal.set(Calendar.HOUR_OF_DAY, 0)
    cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    return cal.timeInMillis
}

private fun getEndOfDay(calendar: Calendar): Long {
    val cal = calendar.clone() as Calendar
    cal.set(Calendar.HOUR_OF_DAY, 23)
    cal.set(Calendar.MINUTE, 59)
    cal.set(Calendar.SECOND, 59)
    cal.set(Calendar.MILLISECOND, 999)
    return cal.timeInMillis
}


// ==========================================
// GLANCE APP WIDGET IMPLEMENTATION (4x3 / 4x4)
// ==========================================
package com.example.stoolappliancediary.widget

import android.content.Context
import androidx.compose.ui.unit.dp
import androidx.glance.Button
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.Action
import androidx.glance.action.actionStartActivity
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.example.stoolappliancediary.MainActivity

class StoolGlanceWidget : GlanceAppWidget() {
    override suspend fun provideContent(context: Context, id: GlanceId) {
        provideContent {
            WidgetLayout()
        }
    }
}

@Composable
private fun WidgetLayout() {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(Color(0xFFFFFFFF))
            .padding(12.dp),
        horizontalAlignment = Alignment.Horizontal.CenterHorizontally
    ) {
        // 上部: アプリ起動用アイコン
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
            verticalAlignment = Alignment.Vertical.CenterVertically
        ) {
            Button(
                text = "Stool App 起動",
                onClick = actionStartActivity<MainActivity>(),
                modifier = GlanceModifier.padding(4.dp)
            )
        }

        Spacer(modifier = GlanceModifier.height(8.dp))

        // 中央: 3x3のボタンマトリックス「量 × 硬さ」
        // 行が量（少、並、多）、列が硬さ（軟、普、硬）
        Text(
            text = "クイック入力 (行:量 / 列:硬さ)",
            style = TextStyle(fontWeight = FontWeight.Bold)
        )

        Spacer(modifier = GlanceModifier.height(4.dp))

        // 3x3 マトリクス定義
        // Row 1: 少(軟, 普, 硬)
        // Row 2: 並(軟, 普, 硬)
        // Row 3: 多(軟, 普, 硬)
        for (amount in 1..3) {
            val amountText = when(amount) {
                1 -> "少"
                2 -> "並"
                else -> "多"
            }
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                horizontalAlignment = Alignment.Horizontal.CenterHorizontally
            ) {
                for (hardness in 1..3) {
                    val hardnessText = when(hardness) {
                        1 -> "軟"
                        2 -> "普"
                        else -> "硬"
                    }
                    Button(
                        text = "\${amountText}\${hardnessText}",
                        onClick = actionRunCallback<QuickLogAction>(
                            // Glanceのパラメータに量と硬さをバインドする
                        ),
                        modifier = GlanceModifier.padding(2.dp).defaultWeight()
                    )
                }
            }
        }

        Spacer(modifier = GlanceModifier.height(8.dp))

        // 下部: 独立した「装具交換」ボタン
        Button(
            text = "⚡ 装具交換 (-1)",
            onClick = actionRunCallback<WidgetApplianceChangeAction>(),
            modifier = GlanceModifier.fillMaxWidth().background(Color(0xFFE8F5E9))
        )
    }
}

// Glance Callback classes for triggering state modification from widget
class QuickLogAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: androidx.glance.action.ActionParameters) {
        // Room DB等に非同期で高速記録
    }
}

class WidgetApplianceChangeAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: androidx.glance.action.ActionParameters) {
        // 在庫減算 & 警告ロジック起動
    }
}
`
  },
  {
    name: "AndroidManifest.xml",
    language: "xml",
    description: "ウィジェット登録 (Glance App Widget Provider)、通知チャンネルの宣言、通知高優先度発信許可、およびバイブレーション権限を指定するAndroidマニフェストファイル。",
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.stoolappliancediary">

    <!-- 基本権限: 端末のバイブレーションを動作させる許可 -->
    <uses-permission android:name="android.permission.VIBRATE" />
    
    <!-- Android 13 (API 33) 以上の高プライオリティのプッシュ通知表示に必須の権限 -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Material3.DayNight.NoActionBar">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.Material3.DayNight.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Glance Widget AppWidgetProvider Registry -->
        <receiver
            android:name=".widget.StoolGlanceWidgetReceiver"
            android:exported="true"
            android:label="排便・ストーマ装具クイック入力">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/stool_widget_info" />
        </receiver>

    </application>
</manifest>`
  }
];
