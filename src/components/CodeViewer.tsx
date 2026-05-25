import React, { useState } from "react";
import { androidCodeFiles, AndroidFile } from "../androidCode";
import { Code, Check, Clipboard, Info, BookOpen, Smartphone } from "lucide-react";

export const CodeViewer: React.FC = () => {
  const [activeFileIdx, setActiveFileIdx] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeFile = androidCodeFiles[activeFileIdx];

  const handleCopy = (content: string, key: string) => {
    navigator.clipboard.writeText(content);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  return (
    <div id="code-viewer-root" className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full">
      {/* Sidebar navigation list for code files */}
      <div className="lg:col-span-1 flex flex-col gap-2 bg-slate-50 border border-slate-200/60 p-3 rounded-2xl">
        <div className="flex items-center gap-1.5 px-2 pb-2.5 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>Android構成ファイル一覧</span>
        </div>

        <div className="flex flex-col gap-1.5 mt-2">
          {androidCodeFiles.map((file, idx) => {
            const isActive = idx === activeFileIdx;
            return (
              <button
                key={file.name}
                onClick={() => setActiveFileIdx(idx)}
                className={`w-full text-left p-3 rounded-xl transition font-medium text-xs flex flex-col gap-1 ${
                  isActive
                    ? "bg-slate-800 text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 border border-slate-200/50 text-slate-600 hover:text-slate-800"
                }`}
              >
                <span className="font-bold font-mono">{file.name}</span>
                <span className={`${isActive ? "text-slate-300" : "text-slate-400"} text-[10px] truncate max-w-[200px]`}>
                  {file.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-slate-100 border border-slate-200/60 rounded-xl text-[11px] text-slate-500 leading-relaxed flex flex-col gap-1.5">
          <div className="flex items-center gap-1 font-bold text-slate-700">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>開発環境の推奨構成</span>
          </div>
          <p>
            • IDE: Android Studio Koala以上
            <br />
            • SDK: Compile SDK 34, Min SDK 26
            <br />
            • Jetpack Core (M3 Compose, Room SQLite, Glance Widget 1.0)
          </p>
        </div>
      </div>

      {/* Code viewer display block */}
      <div className="lg:col-span-3 flex flex-col bg-slate-950 rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
        {/* Header toolbar */}
        <div className="bg-slate-900 border-b border-slate-800 p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-slate-200 font-mono text-xs sm:text-sm">
                {activeFile.name}
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {activeFile.description}
            </p>
          </div>

          <button
            onClick={() => handleCopy(activeFile.content, activeFile.name)}
            className="flex items-center justify-center gap-1.5 self-start sm:self-center bg-slate-800 hover:bg-slate-700/80 active:scale-95 text-xs text-white border border-slate-700 font-semibold px-3 py-1.5 rounded-lg transition"
          >
            {copiedKey === activeFile.name ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">コピー完了</span>
              </>
            ) : (
              <>
                <Clipboard className="w-3.5 h-3.5" />
                <span>コードをコピー</span>
              </>
            )}
          </button>
        </div>

        {/* Scrollable syntax-highlight styled block of codes */}
        <div className="p-4 overflow-x-auto max-h-[550px] overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed bg-slate-950">
          <pre className="whitespace-pre">
            <code>{activeFile.content}</code>
          </pre>
        </div>

        {/* Action guidelines footer */}
        <div className="bg-slate-900/40 p-3 px-4 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between font-mono">
          <span>Type: {activeFile.language.toUpperCase()} FILE</span>
          <span className="flex items-center gap-1 text-slate-500">
            <Smartphone className="w-3 h-3" /> com.example.stoolappliancediary
          </span>
        </div>
      </div>
    </div>
  );
};
