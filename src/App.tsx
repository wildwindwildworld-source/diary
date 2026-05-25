import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Code,
  Calendar as CalendarIcon,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Clipboard,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  TrendingDown,
  MessageSquare,
  Sparkles,
  Info,
  TrendingUp
} from "lucide-react";
import { CalendarView, StoolLog } from "./components/CalendarView";
import { WidgetSimulator } from "./components/WidgetSimulator";
import { ApplianceStockManager } from "./components/ApplianceStockManager";
import { CodeViewer } from "./components/CodeViewer";
import { NotificationBanner } from "./components/NotificationBanner";
import { StatsView } from "./components/StatsView";

// Setup Initial Helper to generate rich dummy logs from Feb 1 to May 26, 2026
function generateDummyLogs(): StoolLog[] {
  const dummyLogs: StoolLog[] = [];
  const startDate = new Date(2026, 1, 1); // Feb 1, 2026 (Month is 0-indexed, so 1 is Feb)
  const endDate = new Date(2026, 4, 26);   // May 26, 2026 (Month index 4 is May)

  const regularNotes = [
    "朝食後にすっきり出ました。良好です。",
    "水分を意識して多く摂りました。順調。",
    "特にお腹の張りもなく快適な時間帯。",
    "少しガスが多めですが問題ナシ。",
    "軽い散歩をして体を動かし、腸内調律。",
    "消化も良く、普段通りの平穏な一日。",
    "お腹の調子はとても良く安定中。",
    "昼食後に腹鳴があったが、その後は快調。",
    "肌への刺激が少なく、ストーマ周辺快適。",
    "水分バランスが良くスムーズな排出。",
    "規則正しい3食を実践。"
  ];

  const starredNotes = [
    "☆ 夜間に少し皮膚の痒みを感じたため丁寧にしっとり保湿。",
    "☆ 排泄物がやや緩い。冷たい飲料を控えるように注視。",
    "☆ ストーマ周囲に皮膚パウダーを軽く。状態は健全。",
    "☆ 面板の密着度を確認。漏れの気配もなくパーフェクト。",
    "☆ 夕食以降に回数が小刻み。消化に良いお粥を摂取した。",
    "☆ ストーマ外観は綺麗。そろそろ次回注文分の在庫確認を予定。",
    "☆ 軽い腹部圧迫感があったが、排泄後はすぐにすっきり解消。",
    "☆ 皮膚保護ウエハを丁寧に位置調整して優しく装着。"
  ];

  const changeNotes = [
    "定期装具交換を実施しました。皮膚トラブルやかぶれは一切なし。",
    "中2日での定期的な面板交換。ストーマ周囲の洗浄を丹念に実施。",
    "定期的なタイミングで装具交換。剥離剤使用でノーストレス剥ぎ。",
    "装具の定期メンテナンス。ストーマ周囲の皮膚は非常にモチモチ良好。"
  ];

  // Pseudo-random generator with seed to keep it consistent
  let seed = 12345;
  const pseudoRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const timeDiff = endDate.getTime() - startDate.getTime();
  const dayCount = Math.floor(timeDiff / (24 * 60 * 60 * 1000)) + 1;

  for (let i = 0; i < dayCount; i++) {
    const currentDay = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    
    // 1. 1日の平均排便回数は3回（ばらつきあり）
    const rVal = pseudoRandom();
    let dailyLogCount = 3;
    if (rVal < 0.12) dailyLogCount = 1;
    else if (rVal < 0.35) dailyLogCount = 2;
    else if (rVal < 0.70) dailyLogCount = 3;
    else if (rVal < 0.90) dailyLogCount = 4;
    else dailyLogCount = 5;

    // 6. 装具交換の頻度は中2日で3日ごとの交換 (i % 3 === 0)
    const isApplianceChangeDay = (i % 3 === 0);

    for (let currentNum = 0; currentNum < dailyLogCount; currentNum++) {
      // 2. 1回の排便量の平均は並(2)でばらつきあり (少: 20%, 並: 60%, 多: 20%)
      const amtRand = pseudoRandom();
      let amount = 2;
      if (amtRand < 0.20) amount = 1;
      else if (amtRand < 0.80) amount = 2;
      else amount = 3;

      // 3. 便の柔らかさは並(2)が半分以上でばらつきあり (軟: 20%, 普: 60%, 硬: 20%)
      const hardRand = pseudoRandom();
      let hardness = 2;
      if (hardRand < 0.20) hardness = 1;
      else if (hardRand < 0.80) hardness = 2;
      else hardness = 3;

      // Make the appalince change action tied to the first stool record of that day
      const isChanged = isApplianceChangeDay && (currentNum === 0);

      // Notes
      let note = "";
      if (isChanged) {
        // Tied appliance change memo
        const noteIdx = Math.floor(pseudoRandom() * changeNotes.length);
        note = changeNotes[noteIdx];
      } else {
        // 4. コメントは3日に1度くらいの一言。 
        // 5. 重要コメント(☆)は10日に1度くらいの頻度。
        // trigger check: ~12% probability per record ensures ~33% overall day-level notes.
        const noteTrigger = pseudoRandom();
        if (noteTrigger < 0.12) {
          // ~30% probability of a starred important note
          const isImportant = pseudoRandom() < 0.30;
          if (isImportant) {
            const noteIdx = Math.floor(pseudoRandom() * starredNotes.length);
            note = starredNotes[noteIdx];
          } else {
            const noteIdx = Math.floor(pseudoRandom() * regularNotes.length);
            note = regularNotes[noteIdx];
          }
        }
      }

      // Timing calculations to look highly natural (8:00, 13:00, 19:00 with variance)
      let hour = 8;
      if (dailyLogCount === 1) {
        hour = 9 + Math.floor(pseudoRandom() * 6); // 9 AM - 3 PM
      } else {
        const slots = [8, 13, 19, 11, 16];
        hour = slots[currentNum % 5] + Math.floor(pseudoRandom() * 3) - 1; // offset +/- 1hr
      }
      const minute = Math.floor(pseudoRandom() * 60);

      const logTimestamp = new Date(
        currentDay.getFullYear(),
        currentDay.getMonth(),
        currentDay.getDate(),
        hour,
        minute
      ).getTime();

      dummyLogs.push({
        id: `dummy-log-${i}-${currentNum}`,
        amount,
        hardness,
        isApplianceChanged: isChanged,
        note,
        timestamp: logTimestamp
      });
    }
  }

  // Sort by newest first
  return dummyLogs.sort((a, b) => b.timestamp - a.timestamp);
}

const INITIAL_LOGS: StoolLog[] = generateDummyLogs();

export default function App() {
  // Application Mode: "simulator" or "code"
  const [appMode, setAppMode] = useState<"simulator" | "code">("simulator");
  
  // App internal tabs: "calendar" | "stock" | "widget" | "stats"
  const [appTab, setAppTab] = useState<"calendar" | "stock" | "widget" | "stats">("widget");

  // Core App states persisted to localStorage
  const [logs, setLogs] = useState<StoolLog[]>([]);
  const [applianceStock, setApplianceStock] = useState<number>(10);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Alarm and vibration states
  const [showWarningNotification, setShowWarningNotification] = useState<boolean>(false);
  const [shakeDevice, setShakeDevice] = useState<boolean>(false);
  const [lastInsertedLogToast, setLastInsertedLogToast] = useState<string | null>(null);

  // Initialize and load States from LocalStorage
  useEffect(() => {
    const savedLogs = localStorage.getItem("stool_diary_logs");
    const savedStock = localStorage.getItem("stool_diary_stock");
    const hasInitialized = localStorage.getItem("stool_diary_initialized");
    
    if (savedLogs && hasInitialized === "true") {
      setLogs(JSON.parse(savedLogs));
    } else {
      setLogs(INITIAL_LOGS);
      localStorage.setItem("stool_diary_logs", JSON.stringify(INITIAL_LOGS));
      localStorage.setItem("stool_diary_initialized", "true");
    }

    if (savedStock) {
      setApplianceStock(parseInt(savedStock, 10));
    } else {
      setApplianceStock(10);
      localStorage.setItem("stool_diary_stock", "10");
    }
  }, []);

  // Sync state modifications to LocalStorage
  const saveLogsToStorage = (updatedLogs: StoolLog[]) => {
    setLogs(updatedLogs);
    localStorage.setItem("stool_diary_logs", JSON.stringify(updatedLogs));
  };

  const saveStockToStorage = (updatedStock: number) => {
    setApplianceStock(updatedStock);
    localStorage.setItem("stool_diary_stock", updatedStock.toString());
  };

  // Stool Log actions
  const handleAddLog = (newLogFields: Omit<StoolLog, "id" | "timestamp">, customTimestamp?: number) => {
    // Determine target timestamp based on active selected calendar date, or use custom overriding timestamp (e.g., from widget)
    const targetTimestamp = customTimestamp || new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      new Date().getHours(),
      new Date().getMinutes()
    ).getTime();

    const newLog: StoolLog = {
      id: `log-${Math.random().toString(36).substring(3, 9)}`,
      timestamp: targetTimestamp,
      ...newLogFields,
    };

    const nextLogs = [newLog, ...logs];
    saveLogsToStorage(nextLogs);

    // If appliance changed is checked, deduct -1 stock & deploy alerts if necessary
    if (newLogFields.isApplianceChanged) {
      handleApplianceDeduction();
    } else {
      showSuccessLogToast("排便の記録を追加しました。");
    }
  };

  const handleDeleteLog = (id: string) => {
    const nextLogs = logs.filter((l) => l.id !== id);
    saveLogsToStorage(nextLogs);
    showSuccessLogToast("記録を削除しました。");
  };

  const handleEditLog = (updatedLog: StoolLog) => {
    // Find previous state to see if isApplianceChanged transitioned from false to true
    const previousLog = logs.find((l) => l.id === updatedLog.id);
    const wasApplianceChangedBefore = previousLog?.isApplianceChanged || false;

    const nextLogs = logs.map((l) => (l.id === updatedLog.id ? updatedLog : l));
    saveLogsToStorage(nextLogs);

    if (updatedLog.isApplianceChanged && !wasApplianceChangedBefore) {
      handleApplianceDeduction();
    } else {
      showSuccessLogToast("記録を保存しました。");
    }
  };

  // Stock deduction & Warning Trigger logic
  const handleApplianceDeduction = () => {
    const currentStock = applianceStock;
    const nextStock = Math.max(0, currentStock - 1);
    saveStockToStorage(nextStock);

    showSuccessLogToast("装具交換を記録しました。（在庫 -1回分）");

    // Under-stock warning check (Stock <= 5)
    if (nextStock <= 5) {
      triggerVibrationFeedback();
      setShowWarningNotification(true);
    }
  };

  // Trigger web vibration API (fallback to UI screen shake)
  const triggerVibrationFeedback = () => {
    setShakeDevice(true);
    setTimeout(() => setShakeDevice(false), 6000);

    if (navigator.vibrate) {
      // Shakes 3 times quickly (Android warning vibration pattern simulation)
      navigator.vibrate([150, 100, 150, 100, 200]);
    }
  };

  // Handle direct Appliance Quick log from Widget Simulator
  const handleWidgetQuickLog = (amount: number, hardness: number, isApplianceChanged: boolean, note: string) => {
    // Add logger using the true exact current date/time regardless of active selected calendar date
    const logItem: Omit<StoolLog, "id" | "timestamp"> = {
      amount,
      hardness,
      isApplianceChanged,
      note,
    };
    handleAddLog(logItem, new Date().getTime());
    showSuccessLogToast(`ウィジェットから ${amount === 1 ? "少" : amount === 2 ? "並" : "多"}${hardness === 1 ? "軟" : hardness === 2 ? "普" : "硬"} の記録を送信しました。`);
  };

  const handleWidgetApplianceChanged = (note: string) => {
    // Add appliance change with the true exact current date/time regardless of active selected calendar date
    const logItem: Omit<StoolLog, "id" | "timestamp"> = {
      amount: null,
      hardness: null,
      isApplianceChanged: true,
      note: note || "ウィジェットからの装具交換",
    };
    handleAddLog(logItem, new Date().getTime());
  };

  // Success indicator message toasts
  const showSuccessLogToast = (msg: string) => {
    setLastInsertedLogToast(msg);
    setTimeout(() => {
      setLastInsertedLogToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Backup handlers
  const handleImportBackup = (importedStock: number, importedLogs: StoolLog[]) => {
    saveStockToStorage(importedStock);
    saveLogsToStorage(importedLogs);
    showSuccessLogToast("バックアップデータを正しく読み込みました。");
  };

  const handleClearAll = () => {
    saveLogsToStorage([]);
    saveStockToStorage(10);
    localStorage.setItem("stool_diary_initialized", "true");
    setShowWarningNotification(false);
    showSuccessLogToast("データを初期化しました。");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-3px, 3px) rotate(-1deg); }
          20% { transform: translate(-3px, -1px) rotate(1deg); }
          30% { transform: translate(3px, 1px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(2px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(2px, 2px) rotate(0deg); }
        }
        .vibrate-heavy {
          animation: shake 0.6s infinite;
        }
      `}</style>

      {/* Global alert toaster message layer */}
      <NotificationBanner
        visible={showWarningNotification}
        stockCount={applianceStock}
        onClear={() => setShowWarningNotification(false)}
      />

      {/* Top Main Navigation Header Bar */}
      <header className="max-w-7xl w-full mx-auto flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200/60 rounded-3xl p-5 gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-lg font-black shadow-md shadow-emerald-600/10">
            S
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Stool & Appliance Diary</h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium leading-none">
              排便・装具管理 Kotlin/Jetpack Compose 実機シミュレータ＆開発素材
            </p>
          </div>
        </div>

        {/* Display Selector Toggle: Interaction Simulator vs Code Inspector */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
          <button
            onClick={() => setAppMode("simulator")}
            id="tab-toggle-simulator"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition transform duration-150 ${
              appMode === "simulator"
                ? "bg-white text-slate-900 shadow-sm font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>📱 実機シミュレータ</span>
          </button>
          <button
            onClick={() => setAppMode("code")}
            id="tab-toggle-code"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition transform duration-150 ${
              appMode === "code"
                ? "bg-white text-slate-900 shadow-sm font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Code className="w-4 h-4" />
            <span>💻 Kotlin コード閲覧</span>
          </button>
        </div>
      </header>

      {/* Main viewport Container */}
      <main className="max-w-7xl w-full mx-auto flex-1 flex flex-col gap-6">
        {appMode === "simulator" ? (
          /* =========================================================
             SIMULATOR WORKSPACE
             ========================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
            {/* Left side: Interactive Android phone body frame */}
            <div className="lg:col-span-7 flex justify-center w-full">
              <div
                className={`relative w-full max-w-md bg-slate-950 rounded-[48px] p-4.5 border-4 border-slate-800 shadow-2xl transition duration-150 transform hover:scale-[1.01] ${
                  shakeDevice ? "vibrate-heavy ring-4 ring-rose-500/20" : ""
                }`}
              >
                {/* Dynamic warning bar when device shakes */}
                {shakeDevice && (
                  <div className="absolute inset-x-12 -top-3 z-30 bg-red-600 text-white font-extrabold text-[10px] px-3 py-1 rounded-full text-center shadow-lg animate-pulse">
                    ⚠️ 在庫僅少の端末バイブレーション警告が発動中！
                  </div>
                )}

                {/* Smartphone camera punch-hole notch */}
                <div className="absolute top-5 left-1/2 transform -translate-x-1/2 w-28 h-5.5 bg-black rounded-full z-30 flex items-center justify-between px-3">
                  <div className="w-2.5 h-2.5 bg-slate-900 rounded-full" />
                  <div className="w-10 h-1 bg-slate-900 rounded-full" />
                </div>

                {/* Simulated Screen Body Component */}
                <div className="bg-slate-50 rounded-[38px] overflow-hidden min-h-[640px] flex flex-col relative border border-slate-900">
                  {/* Status Bar */}
                  <div className="bg-slate-100/90 backdrop-blur-xs px-6 pt-7 pb-2.5 flex items-center justify-between text-[11px] text-slate-500 font-mono font-bold select-none border-b border-slate-200/40">
                    <span>14:02 🕒</span>
                    <div className="flex gap-2 items-center">
                      <span>📶 5G</span>
                      <span>🔋 92%</span>
                    </div>
                  </div>

                  {/* Application Main Title inside emulator */}
                  <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-extrabold tracking-wide">
                        Stool & Appliance Diary
                      </h2>
                      <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
                        ストーマ・排便日誌
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded border border-white/15 font-bold">
                        在庫: {applianceStock}個
                      </span>
                    </div>
                  </div>

                  {/* Android-style Navigation Tab Sheets */}
                  <nav className="bg-slate-900/95 border-b border-slate-800 text-slate-400 text-xs font-bold grid grid-cols-4">
                    <button
                      onClick={() => setAppTab("calendar")}
                      className={`py-3 flex flex-col items-center gap-1 border-b-2 transition cursor-pointer ${
                        appTab === "calendar"
                          ? "text-emerald-400 border-emerald-500 bg-slate-800/40"
                          : "border-transparent hover:text-slate-200 hover:bg-slate-800/10"
                      }`}
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px]">カレンダー</span>
                    </button>
                    <button
                      onClick={() => setAppTab("stock")}
                      className={`py-3 flex flex-col items-center gap-1 border-b-2 transition cursor-pointer ${
                        appTab === "stock"
                          ? "text-emerald-400 border-emerald-500 bg-slate-800/40"
                          : "border-transparent hover:text-slate-200 hover:bg-slate-800/10"
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="text-[10px]">在庫管理</span>
                    </button>
                    <button
                      onClick={() => setAppTab("stats")}
                      className={`py-3 flex flex-col items-center gap-1 border-b-2 transition cursor-pointer ${
                        appTab === "stats"
                          ? "text-emerald-400 border-emerald-500 bg-slate-800/40"
                          : "border-transparent hover:text-slate-200 hover:bg-slate-800/10"
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="text-[10px]">統計</span>
                    </button>
                    <button
                      onClick={() => setAppTab("widget")}
                      className={`py-3 flex flex-col items-center gap-1 border-b-2 transition cursor-pointer ${
                        appTab === "widget"
                          ? "text-emerald-400 border-emerald-500 bg-slate-800/40"
                          : "border-transparent hover:text-slate-200 hover:bg-slate-800/10"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span className="text-[10px]">ウィジェット</span>
                    </button>
                  </nav>

                  {/* Simulator Screen Content space */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-h-[500px]">
                    {appTab === "calendar" && (
                      <CalendarView
                        logs={logs}
                        selectedDate={selectedDate}
                        onSelectDate={(d) => setSelectedDate(d)}
                        onAddLog={handleAddLog}
                        onDeleteLog={handleDeleteLog}
                        onEditLog={handleEditLog}
                      />
                    )}

                    {appTab === "stock" && (
                      <div className="flex flex-col gap-4">
                        <ApplianceStockManager
                          stockCount={applianceStock}
                          onUpdateStock={(v) => saveStockToStorage(v)}
                          logs={logs}
                          onImportBackup={handleImportBackup}
                          onClearAll={handleClearAll}
                        />
                      </div>
                    )}

                    {appTab === "stats" && (
                      <StatsView logs={logs} />
                    )}

                    {appTab === "widget" && (
                      <div className="flex flex-col gap-4">
                        <div className="text-center bg-slate-100 border border-slate-200/60 p-3 rounded-2xl flex flex-col gap-1">
                          <span className="text-[11px] font-bold text-slate-700">ホーム用ウィジェット(Glance)のシミュレータ</span>
                          <span className="text-[10px] text-slate-400">
                            Androidホーム画面に配置する4x4ウィジェットの操作をお試しいただけます。
                          </span>
                        </div>
                        <WidgetSimulator
                          applianceStock={applianceStock}
                          onQuickLog={handleWidgetQuickLog}
                          onWidgetApplianceChanged={handleWidgetApplianceChanged}
                          onHeaderClick={() => setAppTab("calendar")}
                        />
                      </div>
                    )}
                  </div>

                  {/* App Toast message bar */}
                  {lastInsertedLogToast && (
                    <div className="absolute bottom-16 left-4 right-4 bg-slate-800/95 backdrop-blur-xs text-white text-[10px] sm:text-xs text-center py-2 px-3 rounded-xl shadow-lg border border-white/5 z-20 transition duration-300">
                      👍 {lastInsertedLogToast}
                    </div>
                  )}

                  {/* Android system navigation pills bottom home-bar */}
                  <div className="bg-slate-100/95 py-2.5 flex items-center justify-center border-t border-slate-200/40 select-none">
                    <div className="w-24 h-1 bg-slate-400 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Instructions & Highlights card */}
            <div className="lg:col-span-5 flex flex-col gap-5 justify-start h-full">
              {/* Feature highlight panel */}
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-xs">
                <div className="flex items-center gap-2 mb-3.5 border-b border-slate-100 pb-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">
                    アプリの連動仕様・見どころ
                  </h3>
                </div>

                <ul className="text-xs text-slate-600 space-y-3.5 leading-relaxed list-inside">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    <span>
                      <strong>カレンダー自動装飾:</strong> 1日の排便回数をドット、装具を交換した日は緑色のアクア背景
                      として描画。メモがある日には吹き出しが示されます（実機で試せます）。
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    <span>
                      <strong>在庫連動警告(段落5):</strong> 在庫が5個以下の時に「装具交換」フラグ付きの記録を
                      行うと、<strong>警告通知</strong>、<strong>ビープ音</strong>、さらに<strong>本体振動（画面の激しい揺れ）</strong>
                      の警告アクションが作動します。
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    <span>
                      <strong>1タップ・クイック入力ウィジェット:</strong> ウィジェットタブからマトリクス式ボタン（量×硬さ）
                      を押すと、縮小・拡大のポップなクリックアニメとともに日誌に瞬時登録されます。
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    <span>
                      <strong>実ファイル入出力（CSV/JSON）:</strong> 実際に書き出したファイルをPCに保存したり、ドロップして復元可能。
                      モックではない本物の移行機能が備わっています。
                    </span>
                  </li>
                </ul>

                {/* Developer prompt warning box */}
                <div className="mt-5 p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-950 flex flex-col gap-1 font-medium text-[11px]">
                  <span className="font-bold flex items-center gap-1 text-xs">
                    <Info className="w-4 h-4 text-indigo-600" /> 開発者様へのご案内
                  </span>
                  <p className="leading-normal">
                    このアプリ開発指示書に基づいた<strong>「Kotlinのソースコード」</strong>は、右上のトグルスイッチから
                    「💻 Kotlin コード閲覧」を選択して、全てコピー・閲覧いただけます。Room/Glanceも含めて完璧にモデリングを施してあります。
                  </p>
                </div>
              </div>

              {/* Status card showing state parameters for debugging */}
              <div className="bg-slate-900 text-slate-100 border border-slate-800 p-5 rounded-2xl shadow-md font-mono text-[11px] leading-relaxed flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-400">Local State Variables</span>
                  <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 rounded">ONLINE / STABLE</span>
                </div>
                <div>
                  <span className="text-slate-400 block">• Total Stored Logs:</span>
                  <span className="text-emerald-400 font-bold ml-1.5">{logs.length} items in localStorage</span>
                </div>
                <div>
                  <span className="text-slate-400 block">• Ostomy Appliance Stock:</span>
                  <span className="text-emerald-400 font-bold ml-1.5">{applianceStock} units (Trigger boundary: &le; 5)</span>
                </div>
                <div>
                  <span className="text-slate-400 block">• System Vibration Capability:</span>
                  <span className="text-amber-400 font-bold ml-1.5">{navigator.vibrate ? "AVAILABLE (Haptic-Vibrate Approved)" : "FAILED (Web fallback dynamic animation approved)"}</span>
                </div>
                <div className="text-[10px] text-slate-400 leading-normal border-t border-slate-800/80 pt-2 bg-slate-950/20 p-2 rounded">
                  💡 <strong>カレンダー日付選択テスト</strong>: マスをクリック選択してから「記録追加」を行うと、異なる日の歴史に直接割り込めます！
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================
             CODE INSPECTOR VIEW
             ========================================================= */
          <div className="w-full">
            <div className="bg-white border border-slate-200/60 p-5 rounded-3xl mb-6 shadow-xs">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <span>ビルド・導入ガイド・ライブラリ設定</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                本アプリは、Android Studioでの開発を円滑に行えるよう以下の最旬スタックに基づいて構成されています。
                対応するコードファイルを複製し、パッケージ構造 `com.example.stoolappliancediary` に合わせて配置してください。
              </p>

              {/* Steps to deploy code block */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
                <div className="border border-slate-100 p-3 rounded-xl bg-slate-50">
                  <span className="font-bold text-slate-700 block">Step 1. build.gradle</span>
                  <span className="text-slate-500 mt-1 block text-[11px] leading-normal">
                    お使いの Gradle モジュールファイルに Room, Glance 関連設定と Kotlin Kapt プラグインを追記して sync します。
                  </span>
                </div>
                <div className="border border-slate-100 p-3 rounded-xl bg-slate-50">
                  <span className="font-bold text-slate-700 block">Step 2. DataModel & Repository</span>
                  <span className="text-slate-500 mt-1 block text-[11px] leading-normal">
                    「排便量」「硬さ」の null 許容型、Room Database の DAO フロー等を定義し、いつでも取り出せる実保存領域を構築します。
                  </span>
                </div>
                <div className="border border-slate-100 p-3 rounded-xl bg-slate-50">
                  <span className="font-bold text-slate-700 block">Step 3. ViewModel / UI</span>
                  <span className="text-slate-500 mt-1 block text-[11px] leading-normal">
                    ViewModel に組み込まれた在庫減算・バイブ・通知アラーム発信ロジックと、Jetpack Glance の 3x3 クイックマトリクス UI を同期させます。
                  </span>
                </div>
              </div>
            </div>

            <CodeViewer />
          </div>
        )}
      </main>

      {/* Page simple footer */}
      <footer className="max-w-7xl w-full mx-auto text-center py-6 text-xs text-slate-400 font-mono flex items-center justify-between border-t border-slate-200/50 mt-auto">
        <span>Stool & Appliance Diary • Android Kotlin / Compose / Room Framework</span>
        <span>Build status: Green 🟢</span>
      </footer>
    </div>
  );
}
