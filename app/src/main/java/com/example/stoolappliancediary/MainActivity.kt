package com.example.stoolappliancediary

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
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
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
                        val cacheFile = java.io.File(context.cacheDir, "backup_stool_diary.json")
                        Toast.makeText(context, "バックアップCSVデータの準備ができました（デモ）", Toast.LENGTH_SHORT).show()
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
            StoolCalendar(
                logs = logs,
                selectedDate = selectedDate,
                onDateSelected = { selectedDate = it }
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

            Text(
                text = SimpleDateFormat("yyyy年M月d日 の履歴", Locale.JAPAN).format(selectedDate.time),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            Box(modifier = Modifier.weight(1f)) {
                DailyLogList(
                    logs = logs,
                    selectedDate = selectedDate,
                    onEditLog = { selectedLogForEdit = it },
                    onDeleteLog = { viewModel.deleteLog(it) }
                )
            }

            StockManagementSection(
                stock = stock,
                stockInput = stockInputString,
                onValueChange = { stockInputString = it },
                onSave = {
                    val inputNum = stockInputString.toIntOrNull()
                    if (inputNum != null) {
                        viewModel.setApplianceStock(inputNum)
                        Toast.makeText(context, "在庫を設定しました", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(context, "有効な数字を入力してください", Toast.LENGTH_SHORT).show()
                    }
                }
            )
        }
    }

    if (showAddDialog) {
        StoolLogFormDialog(
            onDismiss = { showAddDialog = false },
            onSave = { amount, hardness, changed, note ->
                viewModel.addLog(amount, hardness, changed, note, selectedDate.timeInMillis)
                showAddDialog = false
            }
        )
    }

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
    val firstDayOfWeek = currentMonthCalendar.get(Calendar.DAY_OF_WEEK) - 1

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
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
                                            isApplianceChangedThisDay -> Color(0xFFE8F5E9)
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
                            onLongClick = { onDeleteLog(log) }
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
                                log.amount?.let { amt ->
                                    val text = when (amt) {
                                        1 -> "少"
                                        2 -> "並"
                                        else -> "多"
                                    }
                                    SuggestionChip(
                                        onClick = {},
                                        label = { Text("量: ${text}") },
                                        modifier = Modifier.padding(end = 4.dp)
                                    )
                                }
                                log.hardness?.let { hrd ->
                                    val text = when (hrd) {
                                        1 -> "軟"
                                        2 -> "普"
                                        else -> "硬"
                                    }
                                    SuggestionChip(
                                        onClick = {},
                                        label = { Text("硬: ${text}") }
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
                        text = "${stock} 個",
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoolLogFormDialog(
    initialLog: StoolLog? = null,
    onDismiss: () -> Unit,
    onSave: (amount: Int?, hardness: Int?, isApplianceChanged: Boolean, note: String) -> Unit
) {
    var amount by remember { mutableStateOf(initialLog?.amount ?: 2) }
    var hardness by remember { mutableStateOf(initialLog?.hardness ?: 2) }
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
