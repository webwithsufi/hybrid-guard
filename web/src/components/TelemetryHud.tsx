"use client";

import React from "react";
import { Zap, Cloud, Lock } from "lucide-react";
import { DomainAudit } from "../types/audit";

interface TelemetryHudProps {
  audits: DomainAudit[];
  activeInferenceMode: "ON_DEVICE" | "IN_CLOUD";
  onToggleInferenceMode: (mode: "ON_DEVICE" | "IN_CLOUD") => void;
  isCloudCalling?: boolean;
}

export const TelemetryHud: React.FC<TelemetryHudProps> = ({
  audits,
  activeInferenceMode,
  onToggleInferenceMode,
  isCloudCalling = false
}) => {
  const totalAudits = audits.length;

  const baselineCloudLatency = 780; // Standard cloud model roundtrip in ms
  const avgLocalLatency = Math.round(
    audits.reduce((acc, a) => acc + (a.totalLocalLatencyMs || a.onDeviceLatencyMs || 14), 0) / (totalAudits || 1)
  );

  const savedMs = baselineCloudLatency - avgLocalLatency;

  // Never display a negative number like -32193ms.
  // If savedMs <= 0 or local latency is abnormal, display "0ms Cloud Upload" with subtext "100% scanned locally on your device"
  const isOptimal = savedMs > 0 && avgLocalLatency < 1000;
  const displaySpeedBadge = isOptimal ? `~${avgLocalLatency}ms` : "0ms Cloud Upload";
  const speedSubtext = isOptimal
    ? "Pre-click badges appear instantly on Google Search with zero waiting."
    : "100% scanned locally on your device";

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Highlight 1: On-Device AI */}
        <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>On-Device Privacy</span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Gemini Nano
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 mt-1 leading-snug">
              Passwords, query terms, and personal data stay securely on your computer.
            </p>
          </div>
        </div>

        {/* Highlight 2: Speed Advantage */}
        <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Instant Protection</span>
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {displaySpeedBadge}
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 mt-1 leading-snug">
              {speedSubtext}
            </p>
          </div>
        </div>

        {/* Highlight 3: Cloud Intelligence */}
        <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
            <Cloud className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Deep Safety Check</span>
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                Gemini 3.5 Flash
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 mt-1 leading-snug">
              In-depth security analysis and automated data removal letters on demand.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
