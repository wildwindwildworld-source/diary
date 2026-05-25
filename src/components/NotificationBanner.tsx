import React, { useEffect, useRef } from "react";
import { AlertCircle, CheckCircle, BellRing } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NotificationBannerProps {
  visible: boolean;
  stockCount: number;
  onClear: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  visible,
  stockCount,
  onClear,
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play beep high-priority warning chimer
  const playWarningChime = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Chain of sweet high-pitched warning notes
      const playNote = (delay: number, duration: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
      };

      // Play double warning chime (similar to a priority notifications alert sound on Android)
      playNote(0, 0.45, 987.77);  // B5 note
      playNote(0.18, 0.55, 987.77); // B5 note double tap
    } catch (e) {
      console.warn("Failed to play notification synthesized alert audio:", e);
    }
  };

  useEffect(() => {
    if (visible) {
      playWarningChime();
    }
  }, [visible, stockCount]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, x: "-50%", opacity: 0 }}
          animate={{ y: 0, x: "-50%", opacity: 1 }}
          exit={{ y: -60, x: "-50%", opacity: 0 }}
          style={{ left: "50%" }}
          className="fixed top-4 z-50 w-full max-w-sm px-4 pointer-events-auto"
        >
          {/* Warning Card Frame resembling Android Notification Drawer component */}
          <div className="bg-slate-900 border border-red-900/60 text-slate-100 rounded-2xl shadow-xl shadow-red-950/25 p-4 flex gap-3.5 relative overflow-hidden backdrop-blur-md">
            {/* Ambient dynamic red breathing highlight backdrop */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600 animate-pulse" />

            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs select-none uppercase tracking-wider">
                <BellRing className="w-3.5 h-3.5 animate-bounce" />
                <span>システム通知：重要警告 (高優先度)</span>
              </div>
              
              <h5 className="font-bold text-sm text-slate-200 mt-1 max-w-[90%]">
                装具の在庫が少なくなっています
              </h5>

              <p className="text-xs text-rose-200/95 mt-1.5 leading-relaxed">
                装具の残りが <strong className="text-white text-sm bg-red-600/50 px-1 border border-red-500/20 rounded font-mono">{stockCount}個</strong> になりました。
                タップして確認するまで消えません。お早めに補充してください。
              </p>

              {/* Explicit Tap to clear confirmation button to obey specs */}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={onClear}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>タップして内容を確認</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
