import React, { useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, Plus, Calendar as CalendarIcon, Trash2, Edit3, ShieldAlert, Star, List } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface StoolLog {
  id: string;
  amount: number | null; // 1: 少, 2: 並, 3: 多
  hardness: number | null; // 1: 軟, 2: 普, 3: 硬
  isApplianceChanged: boolean;
  note: string;
  timestamp: number; // ms
}

interface CalendarViewProps {
  logs: StoolLog[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onAddLog: (log: Omit<StoolLog, "id" | "timestamp">) => void;
  onDeleteLog: (id: string) => void;
  onEditLog: (log: StoolLog) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  logs,
  selectedDate,
  onSelectDate,
  onAddLog,
  onDeleteLog,
  onEditLog,
}) => {
  const [currentYear, setCurrentYear] = useState<number>(selectedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(selectedDate.getMonth()); // 0-indexed
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "memos">("calendar");
  const [showStarredOnly, setShowStarredOnly] = useState<boolean>(false);

  // Edit form state
  const [editAmount, setEditAmount] = useState<number | null>(2);
  const [editHardness, setEditHardness] = useState<number | null>(2);
  const [editAppliance, setEditAppliance] = useState<boolean>(false);
  const [editNote, setEditNote] = useState<string>("");

  // Dialogue state for add stool
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addAmount, setAddAmount] = useState<number | null>(2);
  const [addHardness, setAddHardness] = useState<number | null>(2);
  const [addAppliance, setAddAppliance] = useState<boolean>(false);
  const [addNote, setAddNote] = useState<string>("");

  const monthNames = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月"
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday, etc.

  // Calendar dates generation
  const datesArray: (Date | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    datesArray.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    datesArray.push(new Date(currentYear, currentMonth, i));
  }

  // Get start and end of day in timestamps
  const getDayRange = (d: Date) => {
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
    return { start, end };
  };

  const getLogsForDate = (d: Date) => {
    const { start, end } = getDayRange(d);
    return logs.filter((l) => l.timestamp >= start && l.timestamp <= end);
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // List of logs on selected day
  const activeDayLogs = getLogsForDate(selectedDate).sort((a, b) => a.timestamp - b.timestamp);

  const startEdit = (log: StoolLog) => {
    setEditingLogId(log.id);
    setEditAmount(log.amount);
    setEditHardness(log.hardness);
    setEditAppliance(log.isApplianceChanged);
    setEditNote(log.note);
  };

  const saveEdit = (log: StoolLog) => {
    onEditLog({
      ...log,
      amount: editAmount,
      hardness: editHardness,
      isApplianceChanged: editAppliance,
      note: editNote,
    });
    setEditingLogId(null);
  };

  const triggerAddSubmit = () => {
    onAddLog({
      amount: addAmount,
      hardness: addHardness,
      isApplianceChanged: addAppliance,
      note: addNote,
    });
    // Reset state
    setAddAmount(2);
    setAddHardness(2);
    setAddAppliance(false);
    setAddNote("");
    setShowAddModal(false);
  };

  return (
    <div id="calendar-view-container" className="flex flex-col gap-4 w-full">
      {/* Segmented Control for View Mode */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 w-full justify-between gap-1 shadow-2xs">
        <button
          onClick={() => setViewMode("calendar")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            viewMode === "calendar"
              ? "bg-white text-slate-800 shadow-xs"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/30"
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>📅 カレンダー</span>
        </button>
        <button
          onClick={() => setViewMode("memos")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            viewMode === "memos"
              ? "bg-white text-slate-800 shadow-xs"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/30"
          }`}
        >
          <List className="w-3.5 h-3.5 text-blue-600" />
          <span>📝 メモ一覧表示</span>
        </button>
      </div>

      {viewMode === "calendar" ? (
        <>
          {/* Dynamic Native Calendar Sheet Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        {/* Header containing month selectors */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-600" />
            <span className="text-lg font-bold text-slate-800">
              {currentYear}年 {monthNames[currentMonth]}
            </span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handlePrevMonth}
              id="btn-calendar-prev"
              className="p-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-600 font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setCurrentYear(now.getFullYear());
                setCurrentMonth(now.getMonth());
                onSelectDate(now);
              }}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-600 font-semibold"
            >
              今日
            </button>
            <button
              onClick={handleNextMonth}
              id="btn-calendar-next"
              className="p-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-600 font-semibold"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Week Day Titles */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["日", "月", "火", "水", "木", "金", "土"].map((d, index) => (
            <span
              key={index}
              className={`text-xs font-semibold py-1 ${
                index === 0
                  ? "text-rose-500"
                  : index === 6
                  ? "text-indigo-500"
                  : "text-slate-400"
              }`}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Days grid layout */}
        <div className="grid grid-cols-7 gap-1.5">
          {datesArray.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="aspect-square opacity-0" />;
            }

            const dayLogs = getLogsForDate(date);
            const isSelected = isSameDay(date, selectedDate);
            const totalLogs = dayLogs.length;
            const hadApplianceChanged = dayLogs.some((l) => l.isApplianceChanged);
            const hadNotes = dayLogs.some((l) => l.note.trim().length > 0);

            return (
              <button
                key={date.toISOString()}
                onClick={() => onSelectDate(date)}
                id={`calendar-day-${date.getDate()}`}
                className={`aspect-square relative flex flex-col items-center justify-between p-1.5 rounded-xl transition duration-150 group cursor-pointer ${
                  isSelected
                    ? hadApplianceChanged
                      ? "bg-emerald-800 text-white font-bold ring-2 ring-emerald-500 shadow-sm"
                      : "bg-slate-800 text-white font-bold ring-2 ring-slate-800/20"
                    : hadApplianceChanged
                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-medium border border-emerald-200/50"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-transparent"
                }`}
              >
                {/* Date indicator */}
                <span className="text-sm z-10">{date.getDate()}</span>

                {/* Status signals (dots and bubbles) */}
                <div className="flex flex-col items-center gap-0.5 w-full mt-1">
                  {/* Note speech icon indicator */}
                  {hadNotes && (
                    <MessageSquare
                      className={`w-2.5 h-2.5 ${
                        isSelected ? "text-emerald-300" : "text-amber-500"
                      } transform -translate-y-0.5`}
                    />
                  )}

                  {/* Logs dot indicators */}
                  {totalLogs > 0 && (
                    <div className="flex items-center gap-0.5 justify-center mt-auto">
                      {Array.from({ length: Math.min(totalLogs, 4) }).map((_, dotIdx) => (
                        <div
                          key={dotIdx}
                          className={`w-1 h-1 rounded-full ${
                            isSelected ? "bg-white" : "bg-emerald-600"
                          }`}
                        />
                      ))}
                      {totalLogs > 4 && (
                        <span className={`text-[8px] leading-none ${isSelected ? "text-slate-300" : "text-emerald-700"}`} >
                          +
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Little helper badge indicating appliance has changed (Always visible for clarity) */}
                {hadApplianceChanged && (
                  <div 
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full border ${
                      isSelected ? "bg-emerald-300 border-emerald-800 animate-pulse" : "bg-emerald-600 border-white"
                    }`} 
                    title="装具交換あり" 
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day details chronological timeline list card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日の記録
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              この日付に対して排便・装具交換履歴の閲覧と登録ができます。
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            id="btn-trigger-add-log"
            className="flex items-center gap-1 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 active:scale-95 transition font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> 記録を追加
          </button>
        </div>

        {activeDayLogs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 flex flex-col items-center justify-center gap-2">
            <MessageSquare className="w-8 h-8 text-slate-300" />
            <p className="text-sm">この日の記録データはまだありません</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs text-emerald-600 font-bold hover:underline"
            >
              今すぐ新しく記録する
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeDayLogs.map((log) => {
              const dateObj = new Date(log.timestamp);
              const formattedTime = `${String(dateObj.getHours()).padStart(2, "0")}:${String(dateObj.getMinutes()).padStart(2, "0")}`;
              const isEditing = editingLogId === log.id;

              return (
                <div
                  key={log.id}
                  id={`log-item-${log.id}`}
                  className={`border rounded-xl p-4 transition ${
                    log.isApplianceChanged ? "border-emerald-200 bg-emerald-50/20" : "border-slate-100 bg-slate-50/30"
                  }`}
                >
                  {isEditing ? (
                    // Edit mode form in-place
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Amount select */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">排便量</label>
                          <div className="grid grid-cols-3 gap-1">
                            {([
                              { value: 1, label: "少" },
                              { value: 2, label: "並" },
                              { value: 3, label: "多" }
                            ] as const).map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => setEditAmount(opt.value)}
                                className={`py-1 text-xs font-bold rounded-md border ${
                                  editAmount === opt.value
                                    ? "bg-slate-800 text-white border-slate-800"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                            <button
                              onClick={() => setEditAmount(null)}
                              className={`py-1 text-xs rounded-md border ${
                                editAmount === null
                                  ? "bg-slate-800 text-white border-slate-800"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              なし
                            </button>
                          </div>
                        </div>

                        {/* Hardness selection */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">硬さ</label>
                          <div className="grid grid-cols-3 gap-1">
                            {([
                              { value: 1, label: "軟" },
                              { value: 2, label: "普" },
                              { value: 3, label: "硬" }
                            ] as const).map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => setEditHardness(opt.value)}
                                className={`py-1 text-xs font-bold rounded-md border ${
                                  editHardness === opt.value
                                    ? "bg-slate-800 text-white border-slate-800"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                            <button
                              onClick={() => setEditHardness(null)}
                              className={`py-1 text-xs rounded-md border ${
                                editHardness === null
                                  ? "bg-slate-800 text-white border-slate-800"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              なし
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Appliance toggle */}
                      <label className="flex items-center gap-2 select-none cursor-pointer text-xs font-medium text-slate-700 mt-1">
                        <input
                          type="checkbox"
                          checked={editAppliance}
                          onChange={(e) => setEditAppliance(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                        />
                        <span>ストーマ装具を同時に交換した</span>
                      </label>

                      {/* Note box */}
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="メモを入力..."
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editNote.startsWith("☆")) {
                              setEditNote(editNote.replace(/^☆\s*/, ""));
                            } else {
                              setEditNote("☆ " + editNote.trim());
                            }
                          }}
                          className={`p-2 rounded-lg border transition cursor-pointer ${
                            editNote.startsWith("☆")
                              ? "bg-amber-100 border-amber-300 text-amber-500 hover:bg-amber-200"
                              : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
                          }`}
                          title="重要タグ（文頭に☆を追加）"
                        >
                          <Star className={`w-3.5 h-3.5 ${editNote.startsWith("☆") ? "fill-amber-500" : ""}`} />
                        </button>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingLogId(null)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={() => saveEdit(log)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Static read display mode
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900 font-bold text-sm bg-slate-100 px-2 py-0.5 rounded-md">
                            {formattedTime}
                          </span>
                          <div className="flex gap-1.5">
                            {log.amount !== null && (
                              <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                                量: {log.amount === 1 ? "少" : log.amount === 2 ? "並" : "多"}
                              </span>
                            )}
                            {log.hardness !== null && (
                              <span className="text-xs bg-amber-50 border border-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                                硬さ: {log.hardness === 1 ? "軟" : log.hardness === 2 ? "普" : "硬"}
                              </span>
                            )}
                            {log.amount === null && log.hardness === null && !log.isApplianceChanged && (
                              <span className="text-xs italic text-slate-400">
                                メモのみの記録
                              </span>
                            )}
                          </div>
                        </div>

                        {log.note.trim() && (
                          <div className="text-slate-600 text-xs bg-slate-50 border border-slate-100/85 p-2 rounded-lg italic">
                            「 {log.note} 」
                          </div>
                        )}

                        {log.isApplianceChanged && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg w-fit font-bold">
                            <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ストーマ装具を交換しました (在庫 -1)</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons (Edit & Delete) */}
                      <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition">
                        <button
                          onClick={() => startEdit(log)}
                          title="編集"
                          className="p-1 px-1.5 rounded hover:bg-slate-100 text-slate-600"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteLog(log.id)}
                          title="長押し・通常クリックで削除"
                          className="p-1 px-1.5 rounded hover:bg-rose-50 text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <List className="w-4 h-4 text-blue-600" />
                <span>メモ・備考履歴一覧</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                排便メモや装具交換メッセージを検索・確認できます。
              </p>
            </div>
            
            {/* Filter Buttons */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40">
              <button
                onClick={() => setShowStarredOnly(false)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  !showStarredOnly
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                すべて
              </button>
              <button
                onClick={() => setShowStarredOnly(true)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  showStarredOnly
                    ? "bg-amber-400 text-slate-950 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-705"
                }`}
              >
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                重要のみ
              </button>
            </div>
          </div>

          {/* List display */}
          {(() => {
            const memoLogs = logs
              .filter((l) => l.note && l.note.trim() !== "")
              .filter((l) => !showStarredOnly || l.note.startsWith("☆") || l.note.includes("☆"))
              .sort((a, b) => b.timestamp - a.timestamp);

            if (memoLogs.length === 0) {
              return (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center gap-1.5 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-medium">登録されたメモはありません</p>
                </div>
              );
            }

            return (
              <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {memoLogs.map((log) => {
                  const dObj = new Date(log.timestamp);
                  const formattedDate = `${dObj.getFullYear()}/${dObj.getMonth() + 1}/${dObj.getDate()}`;
                  const formattedTime = `${String(dObj.getHours()).padStart(2, "0")}:${String(dObj.getMinutes()).padStart(2, "0")}`;
                  const isStarred = log.note.startsWith("☆") || log.note.includes("☆");

                  return (
                    <div
                      key={log.id}
                      onClick={() => {
                        onSelectDate(dObj);
                        setCurrentYear(dObj.getFullYear());
                        setCurrentMonth(dObj.getMonth());
                        setViewMode("calendar");
                      }}
                      className={`flex items-start justify-between gap-2.5 p-3 rounded-xl border transition-all cursor-pointer group/item select-none ${
                        isStarred 
                          ? "bg-amber-500/5 hover:bg-amber-500/10 border-amber-200/60" 
                          : "bg-slate-50 hover:bg-slate-100/80 border-slate-100/90"
                      }`}
                      title="タップしてカレンダーで選択表示"
                    >
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 font-mono">
                          <span className="text-slate-500">📅 {formattedDate} {formattedTime}</span>
                          {log.isApplianceChanged && (
                            <span className="bg-emerald-500/10 text-emerald-700 px-1 py-0.1 rounded text-[8px] font-black">装具交換</span>
                          )}
                          {log.amount !== null && (
                            <span className="bg-blue-500/10 text-blue-700 px-1 py-0.1 rounded text-[8px] font-black">
                              量:{log.amount === 1 ? "少" : log.amount === 2 ? "並" : "多"}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-700 font-semibold leading-relaxed break-all flex items-start gap-1">
                          {isStarred && <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0 mt-0.5" />}
                          <span className="group-hover/item:text-slate-900 transition">{log.note}</span>
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold opacity-0 group-hover/item:opacity-100 transition shrink-0 self-center bg-white border border-slate-200/45 px-1.5 py-0.5 rounded shadow-3xs">
                        表示 &gt;
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Insert Log dialogue popup */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-100"
            >
              <div className="p-5 border-b border-slate-100 bg-slate-50">
                <h4 className="text-slate-800 font-bold text-base">
                  新しい排便・交換ログを追加
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  日時: {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
                </p>
              </div>

              <div className="p-5 flex flex-col gap-4">
                {/* Amount select buttons */}
                <div>
                  <span className="block text-xs font-bold text-slate-600 mb-1.5">
                    排便の量
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([
                      { value: 1, label: "少" },
                      { value: 2, label: "並" },
                      { value: 3, label: "多" }
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAddAmount(opt.value)}
                        className={`py-1.5 text-xs font-bold rounded-lg border ${
                          addAmount === opt.value
                            ? "bg-slate-800 text-white border-slate-800 shadow"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAddAmount(null)}
                      className={`py-1.5 text-xs font-bold rounded-lg border ${
                        addAmount === null
                          ? "bg-slate-800 text-white border-slate-800 shadow"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      該当なし
                    </button>
                  </div>
                </div>

                {/* Hardness selection row */}
                <div>
                  <span className="block text-xs font-bold text-slate-600 mb-1.5">
                    排便の硬さ
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([
                      { value: 1, label: "軟" },
                      { value: 2, label: "普" },
                      { value: 3, label: "硬" }
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAddHardness(opt.value)}
                        className={`py-1.5 text-xs font-bold rounded-lg border ${
                          addHardness === opt.value
                            ? "bg-slate-800 text-white border-slate-800 shadow"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAddHardness(null)}
                      className={`py-1.5 text-xs font-bold rounded-lg border ${
                        addHardness === null
                          ? "bg-slate-800 text-white border-slate-800 shadow"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      該当なし
                    </button>
                  </div>
                </div>

                {/* Appliance exchange check */}
                <label className="flex items-start gap-2.5 select-none cursor-pointer text-xs font-medium text-slate-700 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                  <input
                    type="checkbox"
                    checked={addAppliance}
                    onChange={(e) => setAddAppliance(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-emerald-900 block">
                      ストーマ装具の交換を伴う
                    </span>
                    <span className="text-emerald-700 text-[10px] block mt-0.5">
                      交換フラグを有効にすると、指定した在庫数が -1 されます。
                    </span>
                  </div>
                </label>

                {/* Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    備考メモ
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={addNote}
                      onChange={(e) => setAddNote(e.target.value)}
                      placeholder="水分摂取、色など気付いたこと..."
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (addNote.startsWith("☆")) {
                          setAddNote(addNote.replace(/^☆\s*/, ""));
                        } else {
                          setAddNote("☆ " + addNote.trim());
                        }
                      }}
                      className={`p-2.5 rounded-lg border transition cursor-pointer ${
                        addNote.startsWith("☆")
                          ? "bg-amber-100 border-amber-300 text-amber-500 hover:bg-amber-200"
                          : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
                      }`}
                      title="重要タグ（文頭に☆を追加）"
                    >
                      <Star className={`w-3.5 h-3.5 ${addNote.startsWith("☆") ? "fill-amber-500" : ""}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 p-5 border-t border-slate-100 bg-slate-50 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={triggerAddSubmit}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  この内容で保存
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
