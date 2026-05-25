import React, { useState } from "react";
import { Sparkles, MessageSquare, RefreshCw, Star, ExternalLink } from "lucide-react";
import { motion } from "motion/react";

interface WidgetSimulatorProps {
  applianceStock: number;
  onQuickLog: (amount: number, hardness: number, isApplianceChanged: boolean, note: string) => void;
  onWidgetApplianceChanged: (note: string) => void;
  onHeaderClick?: () => void;
}

export const WidgetSimulator: React.FC<WidgetSimulatorProps> = ({
  applianceStock,
  onQuickLog,
  onWidgetApplianceChanged,
  onHeaderClick,
}) => {
  const [memo, setMemo] = useState<string>("");

  const amounts = [
    { value: 1, label: "少" },
    { value: 2, label: "並" },
    { value: 3, label: "多" },
  ];

  const hardnessStates = [
    { value: 1, label: "軟" },
    { value: 2, label: "普" },
    { value: 3, label: "硬" },
  ];

  const toggleStar = () => {
    if (memo.startsWith("☆")) {
      setMemo(memo.replace(/^☆\s*/, ""));
    } else {
      setMemo("☆ " + memo.trim());
    }
  };

  const handleQuickLogPress = (amountVal: number, hardnessVal: number) => {
    onQuickLog(amountVal, hardnessVal, false, memo);
    setMemo(""); // Clear memo after log
  };

  const handleApplianceChangePress = () => {
    onWidgetApplianceChanged(memo);
    setMemo(""); // Clear memo after log
  };

  return (
    <div id="widget-simulator-container" className="flex flex-col gap-4">
      <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 border border-slate-800 shadow-xl max-w-sm mx-auto w-full">
        {/* Widget Header with Simulated Glance Frame Dimensions */}
        <div 
          onClick={onHeaderClick}
          className={`flex items-center justify-between border-b border-slate-800 pb-3 mb-3.5 select-none ${
            onHeaderClick ? "cursor-pointer hover:bg-slate-850 p-1.5 -m-1.5 rounded-t-2xl transition-all duration-150 relative group" : ""
          }`}
          title="タップしてアプリを起動（カレンダー画面へ）"
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-[10px]">
              S
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                Android Glance Widget (5x4)
                <span className="text-[8px] text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded group-hover:bg-emerald-500/20">
                  タップでアプリ起動
                </span>
              </p>
            </div>
          </div>
          {onHeaderClick && (
            <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition" />
          )}
        </div>

        {/* 1-line memo text box */}
        <div className="mb-4">
          <div className="relative flex items-center bg-slate-950 rounded-xl border border-slate-800 px-3 py-2 focus-within:border-emerald-500/50 transition">
            <MessageSquare className="w-3.5 h-3.5 text-slate-500 mr-2" />
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="メモを入力（ここに入力してボタンを押す）"
              className="bg-transparent text-xs text-white placeholder-slate-600 focus:outline-none w-full"
            />
            {/* Star Tag Toggler */}
            <button
              onClick={toggleStar}
              type="button"
              className="p-1 hover:bg-slate-800 rounded transition ml-1 cursor-pointer"
              title="重要タグ（文頭に☆を追加）"
            >
              <Star
                className={`w-4 h-4 transition ${
                  memo.startsWith("☆") ? "text-amber-400 fill-amber-400" : "text-slate-500 hover:text-slate-300"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Matrix label */}
        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold mb-2 uppercase tracking-wide">
          <Sparkles className="w-3" />
          <span>量 × 硬さ クイックマトリクス</span>
        </div>

        {/* 3x3 Button grid (Row: Amount, Column: Hardness) */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {amounts.map((row) =>
            hardnessStates.map((col, colIdx) => {
              const buttonLabel = `${row.label}${col.label}`;
              
              // Map combinations explicitly to guarantee Tailwind compile & strict theme pairing
              // Row index: row.value (1, 2, 3), Column index: colIdx (0, 1, 2)
              interface StyleConfig {
                bg: string;
                text: string;
                sub: string;
              }

              const getButtonStyle = (amount: number, cIdx: number): StyleConfig => {
                if (amount === 1) { // 1st Row: Bottom 1/3 fill (少)
                  if (cIdx === 0) { // Blue / 群青
                    return {
                      bg: "bg-[linear-gradient(to_top,#12227d_33%,#0d111d_33%)] border-blue-900/40 hover:brightness-110 active:brightness-90",
                      text: "text-blue-200",
                      sub: "text-blue-400/60",
                    };
                  } else if (cIdx === 1) { // Purple / 紫
                    return {
                      bg: "bg-[linear-gradient(to_top,#2f1b4f_33%,#0f0d1a_33%)] border-purple-900/40 hover:brightness-110 active:brightness-90",
                      text: "text-purple-200",
                      sub: "text-purple-400/60",
                    };
                  } else { // Brown / 焦げ茶
                    return {
                      bg: "bg-[linear-gradient(to_top,#45200c_33%,#130f0d_33%)] border-amber-950/40 hover:brightness-110 active:brightness-90",
                      text: "text-amber-200",
                      sub: "text-amber-400/60",
                    };
                  }
                } else if (amount === 2) { // 2nd Row: Bottom 2/3 fill (並)
                  if (cIdx === 0) {
                    return {
                      bg: "bg-[linear-gradient(to_top,#12227d_66%,#0d111d_66%)] border-blue-900/50 hover:brightness-110 active:brightness-90",
                      text: "text-blue-100",
                      sub: "text-blue-300/80",
                    };
                  } else if (cIdx === 1) {
                    return {
                      bg: "bg-[linear-gradient(to_top,#2f1b4f_66%,#0f0d1a_66%)] border-purple-900/50 hover:brightness-110 active:brightness-90",
                      text: "text-purple-100",
                      sub: "text-purple-300/80",
                    };
                  } else {
                    return {
                      bg: "bg-[linear-gradient(to_top,#45200c_66%,#130f0d_66%)] border-amber-950/50 hover:brightness-110 active:brightness-90",
                      text: "text-amber-100",
                      sub: "text-amber-300/80",
                    };
                  }
                } else { // 3rd Row: Fully filled (多)
                  if (cIdx === 0) {
                    return {
                      bg: "bg-[#12227d] border-blue-800/60 hover:bg-[#1c30a6] active:bg-[#0d1656]",
                      text: "text-white font-extrabold",
                      sub: "text-blue-200",
                    };
                  } else if (cIdx === 1) {
                    return {
                      bg: "bg-[#2f1b4f] border-purple-800/60 hover:bg-[#3f2766] active:bg-[#21113b]",
                      text: "text-white font-extrabold",
                      sub: "text-purple-200",
                    };
                  } else {
                    return {
                      bg: "bg-[#45200c] border-amber-900/60 hover:bg-[#592c15] active:bg-[#2f1506]",
                      text: "text-white font-extrabold",
                      sub: "text-amber-200",
                    };
                  }
                }
              };

              const buttonColor = getButtonStyle(row.value, colIdx);

              return (
                <motion.button
                  key={`${row.value}-${col.value}`}
                  onClick={() => handleQuickLogPress(row.value, col.value)}
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 450, damping: 15 }}
                  className={`${buttonColor.bg} ${buttonColor.text} border flex flex-col items-center justify-center py-2.5 rounded-xl cursor-pointer shadow-sm relative overflow-hidden group select-none`}
                >
                  <span className="text-xs font-bold leading-tight select-none z-10">
                    {buttonLabel}
                  </span>
                  <span className={`text-[9px] ${buttonColor.sub} capitalize scale-95 mt-0.5 select-none font-mono z-10`}>
                    {row.value}:{col.value}
                  </span>
                  {/* Subtle hover visual effect */}
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </motion.button>
              );
            })
          )}
        </div>

        {/* Independent Appliance Change Button */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800">
          <motion.button
            onClick={handleApplianceChangePress}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 font-bold text-slate-950 flex items-center justify-center gap-1.5 py-3 rounded-xl cursor-pointer text-xs shadow-md shadow-emerald-950/20 select-none"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>装具交換</span>
          </motion.button>
        </div>
      </div>

      <div className="text-xs text-slate-550 max-w-sm mx-auto text-center">
        💡 <strong className="text-slate-650">Widgetテスト方法</strong>:
        <p className="mt-0.5">
          マトリクスを押すと「選択中の日付」に対して排便ログが即時追加。
          下の「装具交換」を押すと在庫が1減衰し、残りが<strong>5個以下</strong>になると、画面シェイクによる震動フィードバックと警告通知が発動します。
        </p>
      </div>
    </div>
  );
};
