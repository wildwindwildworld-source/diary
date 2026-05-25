import React, { useState, useMemo } from "react";
import { TrendingUp, Calendar, AlertTriangle, RefreshCw, BarChart2, Star } from "lucide-react";
import { StoolLog } from "./CalendarView";

interface StatsViewProps {
  logs: StoolLog[];
}

export const StatsView: React.FC<StatsViewProps> = ({ logs }) => {
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(7);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Generate date list from today going backwards
  const statsData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    // We will generate the target date range
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

      // Find logs inside this day range
      const dayLogs = logs.filter(l => l.timestamp >= startOfDay && l.timestamp <= endOfDay);
      
      // Calculate sum of stool amounts
      let totalAmount = 0;
      let validAmountLogs = 0;
      let totalHardness = 0;
      let validHardnessLogs = 0;
      let applianceChanges = 0;

      dayLogs.forEach(log => {
        if (log.amount !== null) {
          totalAmount += log.amount;
          validAmountLogs++;
        }
        if (log.hardness !== null) {
          totalHardness += log.hardness;
          validHardnessLogs++;
        }
        if (log.isApplianceChanged) {
          applianceChanges++;
        }
      });

      const avgHardness = validHardnessLogs > 0 ? Number((totalHardness / validHardnessLogs).toFixed(1)) : 0;

      // Date labels
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const fullDateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;

      data.push({
        label,
        fullDateStr,
        totalAmount, // Sum of amounts for that day
        avgHardness, // Average hardness for that day
        applianceChanges, // Count of appliance changes on that day
        logCount: dayLogs.length
      });
    }

    return data;
  }, [logs, rangeDays]);

  // Overall metrics calculation
  const summary = useMemo(() => {
    let totalLogsInPeriod = 0;
    let totalAmountInPeriod = 0;
    let totalHardnessInPeriod = 0;
    const hardnessPoints: number[] = [];
    let applianceChangesCount = 0;

    statsData.forEach(day => {
      totalLogsInPeriod += day.logCount;
      totalAmountInPeriod += day.totalAmount;
      applianceChangesCount += day.applianceChanges;
      if (day.avgHardness > 0) {
        hardnessPoints.push(day.avgHardness);
        totalHardnessInPeriod += day.avgHardness;
      }
    });

    const avgDailyAmount = Number((totalAmountInPeriod / rangeDays).toFixed(1));
    const avgHardnessValue = hardnessPoints.length > 0 
      ? Number((totalHardnessInPeriod / hardnessPoints.length).toFixed(1)) 
      : 0;

    let hardnessDescription = "データなし";
    if (avgHardnessValue > 0) {
      if (avgHardnessValue < 1.5) hardnessDescription = "軟らかめ (水・泥状便)";
      else if (avgHardnessValue <= 2.3) hardnessDescription = "普通 (泥・半練・有形)";
      else hardnessDescription = "硬め (有形コロコロ・固形状)";
    }

    return {
      totalLogsInPeriod,
      avgDailyAmount,
      avgHardnessValue,
      hardnessDescription,
      applianceChangesCount
    };
  }, [statsData, rangeDays]);

  // Dimensions for custom SVG chart
  const width = 360;
  const height = 150;
  const paddingX = 30;
  const paddingY = 20;

  // Compute maximum amount value in statsData to scale Y axes properly
  const maxAmount = useMemo(() => {
    const maxVal = Math.max(...statsData.map(d => d.totalAmount));
    return maxVal > 0 ? maxVal : 5; // Default reference high scale
  }, [statsData]);

  // Max hardness limit is strictly 3.0
  const maxHardness = 3.0;

  // Helper point calculation for SVG path rendering
  const chartPoints = useMemo(() => {
    const amountPoints: { x: number; y: number }[] = [];
    const hardnessPoints: { x: number; y: number }[] = [];
    
    const count = statsData.length;
    const stepX = (width - paddingX * 2) / (count - 1 || 1);

    statsData.forEach((day, index) => {
      const x = paddingX + index * stepX;
      
      // Map Stool Amount (Y goes from maxAmount down to 0)
      const amountY = paddingY + (1 - (day.totalAmount / (maxAmount || 1))) * (height - paddingY * 2);
      amountPoints.push({ x, y: amountY });

      // Map Hardness (Y goes from 3.0 down to 0)
      const hardnessY = paddingY + (1 - (day.avgHardness / maxHardness)) * (height - paddingY * 2);
      hardnessPoints.push({ x, y: hardnessY });
    });

    return { amountPoints, hardnessPoints };
  }, [statsData, maxAmount, width, height, paddingX, paddingY]);

  // Construct SVG path command strings
  const getLinePath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    return pts.reduce((acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), "");
  };

  const amountPathD = getLinePath(chartPoints.amountPoints);
  const hardnessPathD = getLinePath(chartPoints.hardnessPoints);

  return (
    <div id="stats-tab-view" className="flex flex-col gap-4">
      {/* Date interval controls */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40 w-full justify-between gap-1.5 shadow-2xs">
        {([7, 30, 90] as const).map(days => (
          <button
            key={days}
            onClick={() => {
              setRangeDays(days);
              setHoveredIndex(null);
            }}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
              rangeDays === days
                ? "bg-slate-800 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
            }`}
          >
            直近 {days}日間
          </button>
        ))}
      </div>

      {/* Visual Line Chart Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm relative overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
            排便量 ＆ 柔らかさ平均の推移
          </span>
          <div className="flex items-center gap-2 text-[9px] font-semibold">
            <span className="flex items-center gap-1 text-blue-600">
              <span className="w-2.5 h-0.5 bg-blue-600 inline-block" />
              排便総量
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-2.5 h-0.5 bg-amber-600 inline-block" />
              便の硬さ
            </span>
          </div>
        </div>

        {/* Dynamic Vector Canvas */}
        <div className="relative w-full aspect-[2.4/1] bg-slate-50/70 border border-slate-100 rounded-xl p-1">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            {/* Grid references */}
            <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#e2e8f0" strokeWidth="1" />

            {/* Plot Lines */}
            {amountPathD && (
              <path
                d={amountPathD}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
            )}
            
            {hardnessPathD && (
              <path
                d={hardnessPathD}
                fill="none"
                stroke="#d97706"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1 0.5"
                className="transition-all duration-300"
              />
            )}

            {/* Interaction Dots and Overlay hover hotspots */}
            {chartPoints.amountPoints.map((pt, idx) => {
              const dayData = statsData[idx];
              const hardPt = chartPoints.hardnessPoints[idx];
              const isSelected = hoveredIndex === idx;

              // Grid vertical reference guide on select
              return (
                <g key={idx}>
                  {isSelected && (
                    <line
                      x1={pt.x}
                      y1={paddingY}
                      x2={pt.x}
                      y2={height - paddingY}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Stool amount circle node */}
                  {dayData.totalAmount > 0 && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 4.5 : 3}
                      fill="#2563eb"
                      className="cursor-pointer transition-all hover:scale-125"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  )}

                  {/* Stool hardness circle node */}
                  {dayData.avgHardness > 0 && (
                    <circle
                      cx={hardPt.x}
                      cy={hardPt.y}
                      r={isSelected ? 4.5 : 3}
                      fill="#d97706"
                      className="cursor-pointer transition-all hover:scale-125"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  )}

                  {/* Date labels on horizontal base ticks (limited spacing to preserve readability) */}
                  {(rangeDays === 7 || (rangeDays === 30 && idx % 4 === 0) || (rangeDays === 90 && idx % 12 === 0)) && (
                    <text
                      x={pt.x}
                      y={height - 6}
                      textAnchor="middle"
                      className="text-[8px] fill-slate-400 font-bold select-none"
                    >
                      {dayData.label}
                    </text>
                  )}

                  {/* Invisible broad hitbox rectangle for easy mobile touch tracking */}
                  <rect
                    x={pt.x - 10}
                    y={0}
                    width={20}
                    height={height}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Dynamic Tooltip detail area below or absolute overlay */}
        <div className="mt-2 min-h-11 bg-slate-900 text-slate-100 rounded-xl p-2 px-3 text-[11px] font-mono flex flex-col justify-center border border-slate-800">
          {hoveredIndex !== null && statsData[hoveredIndex] ? (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-slate-400 font-extrabold text-[10px]">
                <span>📅 {statsData[hoveredIndex].fullDateStr}</span>
                {statsData[hoveredIndex].applianceChanges > 0 && (
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.1 rounded border border-emerald-500/20">裝具交換あり</span>
                )}
              </div>
              <div className="grid grid-cols-2 mt-0.5">
                <span className="text-blue-300">・排便量合計: <strong className="text-white text-xs">{statsData[hoveredIndex].totalAmount}</strong> (少:1, 並:2, 多:3)</span>
                <span className="text-amber-300">・便の硬さ平均: <strong className="text-white text-xs">{statsData[hoveredIndex].avgHardness > 0 ? statsData[hoveredIndex].avgHardness : "なし"}</strong> (軟:1 ~ 硬:3)</span>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-center text-[10px] py-1.5 select-none animate-pulse">
              💡 グラフ上の点やガイド線をなぞると、その日の詳細データが表示されます。
            </div>
          )}
        </div>
      </div>

      {/* Structured metrics summary */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col gap-3.5">
        <h4 className="text-xs font-bold text-slate-800 tracking-tight uppercase border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>期間統計メトリクス (約 {rangeDays}日間)</span>
        </h4>

        <div className="grid grid-cols-2 gap-3.5 text-xs">
          <div className="p-2.5 rounded-xl border border-slate-50 bg-slate-50/50 flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400 font-extrabold">1日あたりの平均排便量</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-blue-600">{summary.avgDailyAmount}</span>
              <span className="text-[10px] text-slate-500 font-semibold">ポイント / 日</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-slate-50 bg-slate-50/50 flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400 font-extrabold">期間中の装具交換回数</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-emerald-600">{summary.applianceChangesCount}</span>
              <span className="text-[10px] text-slate-500 font-semibold">回</span>
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl border border-amber-100/70 bg-amber-50/30 flex flex-col gap-1">
          <span className="text-[10px] text-amber-800 font-extrabold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            便の硬さ傾向の診断
          </span>
          <div className="flex items-center justify-between text-xs mt-0.5">
            <span className="text-slate-600 font-medium">硬さの加重平均値:</span>
            <span className="font-extrabold text-slate-900">{summary.avgHardnessValue > 0 ? `${summary.avgHardnessValue} / 3.0` : "データ蓄積なし"}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium bg-white/70 border border-slate-100 p-1.5 rounded-md mt-1 leading-normal italic">
            全体の平均像は「<strong>{summary.hardnessDescription}</strong>」です。
            ストーマ排出物の状態を適切に保てるよう水分摂取と食事量をご調整ください。
          </div>
        </div>
      </div>
    </div>
  );
};
