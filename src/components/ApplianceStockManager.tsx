import React, { useState, useRef } from "react";
import { Download, Upload, Trash, RefreshCw, AlertTriangle, ShieldCheck, FileCheck, HelpCircle } from "lucide-react";
import { StoolLog } from "./CalendarView";

interface ApplianceStockManagerProps {
  stockCount: number;
  onUpdateStock: (newVal: number) => void;
  logs: StoolLog[];
  onImportBackup: (importedStock: number, importedLogs: StoolLog[]) => void;
  onClearAll: () => void;
}

export const ApplianceStockManager: React.FC<ApplianceStockManagerProps> = ({
  stockCount,
  onUpdateStock,
  logs,
  onImportBackup,
  onClearAll,
}) => {
  const [inputVal, setInputVal] = useState<string>(stockCount.toString());
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLowStock = stockCount <= 5;

  const handleUpdateClick = () => {
    const num = parseInt(inputVal, 10);
    if (!isNaN(num) && num >= 0) {
      onUpdateStock(num);
    } else {
      alert("0以上の正しい数値を入力してください。");
    }
  };

  React.useEffect(() => {
    setInputVal(stockCount.toString());
  }, [stockCount]);

  // Export JSON Format
  const handleExportJSON = () => {
    try {
      const exportObject = {
        exportedAt: new Date().toISOString(),
        applianceStock: stockCount,
        logs: logs,
      };

      const dataStr = JSON.stringify(exportObject, null, 2);
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataUri);
      downloadAnchor.setAttribute("download", `stool-diary-backup-${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Export JSON Failed", e);
    }
  };

  // Export CSV Format
  const handleExportCSV = () => {
    try {
      // Form CSV content: id, timestamp, formatedTime, amount, hardness, isApplianceChanged, note
      const headers = ["ID", "Timestamp", "DateTimeISO", "Amount(1:少,2:並,3:多)", "Hardness(1:軟,2:普,3:硬)", "IsApplianceChanged(1/0)", "Note/Memo"];
      const rows = logs.map((log) => {
        const timeStr = new Date(log.timestamp).toISOString();
        return [
          log.id,
          log.timestamp,
          timeStr,
          log.amount !== null ? log.amount : "",
          log.hardness !== null ? log.hardness : "",
          log.isApplianceChanged ? "1" : "0",
          `"${(log.note || "").replace(/"/g, '""')}"`, // escape quotes for standard csv safety
        ];
      });

      // Stock is placed at the very first row or metadata header
      const stockMetadata = [`# ApplianceStockCount: ${stockCount}`, "", ""];
      const csvContent = [
        stockMetadata.join(","),
        headers.join(","),
        ...rows.map((r) => r.join(",")),
      ].join("\n");

      const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataUri);
      downloadAnchor.setAttribute("download", `stool-diary-records-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Export CSV Failed", e);
    }
  };

  // Handle backup file parsing
  const processUploadedFile = (file: File) => {
    setImportError(null);
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;

        // Try parsing JSON first
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          if (typeof parsed.applianceStock !== "number" || !Array.isArray(parsed.logs)) {
            throw new Error("JSON形式のバックアップファイル構成が不正です。");
          }
          onImportBackup(parsed.applianceStock, parsed.logs);
          setImportSuccess(true);
        } else if (file.name.endsWith(".csv")) {
          // Parse CSV
          const lines = text.split("\n");
          let parsedStock = 10;
          const parsedLogs: StoolLog[] = [];

          // Try to decode headers and metadata
          lines.forEach((line) => {
            const cleanLine = line.trim();
            if (!cleanLine) return;

            if (cleanLine.startsWith("# ApplianceStockCount:")) {
              const matches = RegExp(/# ApplianceStockCount:\s*(\d+)/).exec(cleanLine);
              if (matches && matches[1]) {
                parsedStock = parseInt(matches[1], 10);
              }
              return;
            }

            // Skip helper / header line
            if (cleanLine.startsWith("ID,") || cleanLine.startsWith("#")) {
              return;
            }

            // ID, Timestamp, DateTimeISO, Amount, Hardness, IsApplianceChanged, Note
            const parts = cleanLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // smart comma split ignoring inside quotes
            if (parts.length >= 6) {
              const id = parts[0] || `imported-${Math.random().toString(36).substring(3)}`;
              const timestamp = parseInt(parts[1], 10) || Date.now();
              const amt = parts[3] ? parseInt(parts[3], 10) : null;
              const hrd = parts[4] ? parseInt(parts[4], 10) : null;
              const changed = parts[5] === "1" || parts[5] === "true";
              const note = parts[6] ? parts[6].replace(/^"|"$/g, "").replace(/""/g, '"') : ""; // unescape csv quotes

              parsedLogs.push({
                id,
                timestamp,
                amount: amt,
                hardness: hrd,
                isApplianceChanged: changed,
                note,
              });
            }
          });

          onImportBackup(parsedStock, parsedLogs);
          setImportSuccess(true);
        } else {
          throw new Error("サポートされていない拡張子です。JSONまたはCSVファイルを選択してください。");
        }
      } catch (err: any) {
        setImportError(err.message || "ファイルの読み込み中にエラーが発生しました。");
      }
    };

    reader.readAsText(file);
  };

  // Drag and drop event triggers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div id="stock-manager-root" className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
      {/* Current inventory setting panel */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">ストーマ装具 在庫カウンター</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            日々の「装具交換」フラグ付き記録に応じて自動で -1 減算されます。
          </p>
        </div>

        {/* Display Status Banner of stock */}
        <div
          className={`rounded-2xl p-4 border flex items-center justify-between transition ${
            isLowStock
              ? "bg-rose-50 border-rose-200 text-rose-950"
              : "bg-emerald-50/50 border-emerald-100 text-emerald-950"
          }`}
        >
          <div className="flex items-center gap-3">
            {isLowStock ? (
              <AlertTriangle className="w-8 h-8 text-rose-500 animate-bounce" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
            )}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                現在の装具在庫
              </span>
              <span className="text-2xl font-black font-mono leading-none">
                {stockCount}
                <span className="text-xs font-bold ml-1">個</span>
              </span>
            </div>
          </div>

          <div className="text-right">
            {isLowStock ? (
              <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-1 rounded-md block leading-none">
                警告: 在庫僅少 (残り5個以下)
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-1 rounded-md block leading-none">
                在庫あり (適正状態)
              </span>
            )}
          </div>
        </div>

        {/* Form elements for directly amending count limit */}
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              ストック個数の即時一括設定
            </label>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="0"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="数量を入力"
                className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <button
                type="button"
                onClick={handleUpdateClick}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 rounded-lg active:scale-95 transition whitespace-nowrap"
              >
                在庫数を更新
              </button>
            </div>
          </div>
        </div>

        {/* Direct modification modifiers */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            type="button"
            onClick={() => onUpdateStock(stockCount + 5)}
            className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl active:scale-95 transition"
          >
            +5個を補充
          </button>
          <button
            type="button"
            onClick={() => onUpdateStock(Math.max(0, stockCount - 1))}
            className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl active:scale-95 transition"
          >
            -1個を消費 (テスト用)
          </button>
        </div>
      </div>

      {/* Backup file loader & export panels */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">データの入出力（JSON・CSVバックアップ）</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            日誌の排便ログや装具在庫を書き出してパソコンに保管したり、復元できます。
          </p>
        </div>

        {/* Download row triggers */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-1.5 p-2.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition active:scale-95 cursor-pointer text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span>JSONでエクスポート</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 p-2.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition active:scale-95 cursor-pointer text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5 text-teal-500" />
            <span>CSVでエクスポート</span>
          </button>
        </div>

        {/* Native drag-and-drop file uploader zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition duration-200 ${
            dragActive
              ? "border-emerald-500 bg-emerald-50/40"
              : importSuccess
              ? "border-emerald-600 bg-emerald-50/20 text-emerald-950"
              : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processUploadedFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          {importSuccess ? (
            <>
              <FileCheck className="w-8 h-8 text-emerald-600 animate-bounce" />
              <div>
                <p className="text-xs font-bold text-emerald-900">インポートに成功しました！</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">
                  在庫数とカレンダーデータが復元されました。
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-700">
                  クリック、またはファイルをドロップして入力
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  *エクスポートした .json または .csv ファイルに対応しています。
                </p>
              </div>
            </>
          )}

          {importError && (
            <p className="text-[10px] text-rose-500 font-bold bg-rose-50 px-2 py-1 rounded mt-1.5">
              ⚠️ {importError}
            </p>
          )}
        </div>

        {/* Clear log statistics button for diagnostics */}
        <button
          onClick={() => {
            if (confirm("全ての排便記録および装具在庫をデフォルト(10個)にリセットします。本当によろしいですか？")) {
              onClearAll();
            }
          }}
          className="flex items-center justify-center gap-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 p-2 rounded-xl border border-rose-100 hover:border-rose-200 transition"
        >
          <Trash className="w-3.5 h-3.5" />
          <span>すべての記録を消去・データベースリセット</span>
        </button>
      </div>
    </div>
  );
};
