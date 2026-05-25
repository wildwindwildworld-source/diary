package com.example.stoolappliancediary.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
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
import androidx.glance.color.ColorProvider
import com.example.stoolappliancediary.MainActivity
import com.example.stoolappliancediary.data.AppDatabase
import com.example.stoolappliancediary.data.StoolLog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class StoolGlanceWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
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
            .background(ColorProvider(Color(0xFFFFFFFF), Color(0xFF121212)))
            .padding(12.dp),
        horizontalAlignment = Alignment.Horizontal.CenterHorizontally
    ) {
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

        Text(
            text = "クイック入力 (行:量 / 列:硬さ)",
            style = TextStyle(fontWeight = FontWeight.Bold)
        )

        Spacer(modifier = GlanceModifier.height(4.dp))

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
                        text = "${amountText}${hardnessText}",
                        onClick = actionRunCallback<QuickLogAction>(
                            androidx.glance.action.actionParametersOf(
                                QuickLogAction.PARAM_AMOUNT to amount,
                                QuickLogAction.PARAM_HARDNESS to hardness
                            )
                        ),
                        modifier = GlanceModifier.padding(2.dp).defaultWeight()
                    )
                }
            }
        }

        Spacer(modifier = GlanceModifier.height(8.dp))

        Button(
            text = "⚡ 装具交換 (-1)",
            onClick = actionRunCallback<WidgetApplianceChangeAction>(),
            modifier = GlanceModifier.fillMaxWidth().background(ColorProvider(Color(0xFFE8F5E9), Color(0xFF1B5E20)))
        )
    }
}

class QuickLogAction : ActionCallback {
    companion object {
        val PARAM_AMOUNT = androidx.glance.action.ActionParameters.Key<Int>("param_amount")
        val PARAM_HARDNESS = androidx.glance.action.ActionParameters.Key<Int>("param_hardness")
    }

    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: androidx.glance.action.ActionParameters) {
        val amount = parameters[PARAM_AMOUNT] ?: 2
        val hardness = parameters[PARAM_HARDNESS] ?: 2
        
        CoroutineScope(Dispatchers.IO).launch {
            val db = AppDatabase.getDatabase(context)
            val log = StoolLog(
                amount = amount,
                hardness = hardness,
                isApplianceChanged = false,
                note = "Widgetからクイック入力",
                timestamp = System.currentTimeMillis()
            )
            db.stoolLogDao().insertLog(log)
        }
    }
}

class WidgetApplianceChangeAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: androidx.glance.action.ActionParameters) {
        CoroutineScope(Dispatchers.IO).launch {
            val db = AppDatabase.getDatabase(context)
            val log = StoolLog(
                amount = null,
                hardness = null,
                isApplianceChanged = true,
                note = "Widgetから装具交換",
                timestamp = System.currentTimeMillis()
            )
            db.stoolLogDao().insertLog(log)

            val sharedPrefs = context.getSharedPreferences("appliance_prefs", Context.MODE_PRIVATE)
            val currentStock = sharedPrefs.getInt("appliance_stock", 10)
            val newStock = (currentStock - 1).coerceAtLeast(0)
            sharedPrefs.edit().putInt("appliance_stock", newStock).apply()
        }
    }
}
