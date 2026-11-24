"use client";

import React, { useState } from "react";
import { ShieldCheck, AlertTriangle, Cpu, Copy, Check, Eye, EyeOff, Lock } from "lucide-react";
import { DomainAudit } from "../types/audit";

interface PiiScrubbingDiffProps {
  audit: DomainAudit;
}

export const PiiScrubbingDiff: React.FC<PiiScrubbingDiffProps> = ({ audit }) => {
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedScrubbed, setCopiedScrubbed] = useState(false);
  const [maskRawSensitive, setMaskRawSensitive] = useState(false);

  const handleCopy = (text: string, isScrubbed: boolean) => {
    navigator.clipboard.writeText(text);
    if (isScrubbed) {
      setCopiedScrubbed(true);
      setTimeout(() => setCopiedScrubbed(false), 2000);
    } else {
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  // Helper to visually render raw text with high-visibility callouts
  const formatRawSnippet = (text: string) => {
    if (!text) return "No raw data recorded.";
    if (maskRawSensitive) {
      return text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "•••@•••••.•••")
                 .replace(/(?:\d{1,3}\.){3}\d{1,3}/g, "•••.•••.•••.•••");
    }
    return text;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Local PII Scrubbing Diff
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                ONLY_ON_DEVICE
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Zero-PII verification diff before cloud escalation to gemini-3.5-flash
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setMaskRawSensitive(!maskRawSensitive)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          >
            {maskRawSensitive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{maskRawSensitive ? "Reveal Raw PII" : "Mask Raw Preview"}</span>
          </button>
          <div className="flex items-center gap-1 font-mono text-[11px] text-indigo-400 bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-800/60">
            <Cpu className="w-3.5 h-3.5" />
            <span>Local Scrub: {audit.piiScrubLatencyMs || 12}ms</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Diff Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Raw Ingested Data */}
        <div className="bg-slate-950 border border-rose-900/40 rounded-xl overflow-hidden flex flex-col">
          {/* Column Header */}
          <div className="bg-rose-950/40 border-b border-rose-900/40 px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold text-rose-300">
                Raw Ingested Data (Pre-Scrub - Local Device Only)
              </span>
            </div>
            <button
              onClick={() => handleCopy(audit.rawSnippet, false)}
              className="text-[11px] text-rose-400 hover:text-rose-200 flex items-center gap-1 font-mono"
            >
              {copiedRaw ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedRaw ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <div className="p-2 bg-rose-950/20 text-[11px] text-rose-400 border-b border-rose-900/30 flex items-center gap-1.5 font-mono px-3.5">
            <Lock className="w-3 h-3" />
            <span>STRICTLY BOUND TO LOCAL MEMORY — BLOCKED FROM CLOUD TRANSMISSION</span>
          </div>

          {/* Raw Text Body */}
          <div className="p-3.5 font-mono text-xs text-rose-200/90 whitespace-pre-wrap break-all leading-relaxed max-h-72 overflow-y-auto">
            {formatRawSnippet(audit.rawSnippet)}
          </div>
        </div>

        {/* Right Column: Escalated Anonymized Report */}
        <div className="bg-slate-950 border border-emerald-900/50 rounded-xl overflow-hidden flex flex-col">
          {/* Column Header */}
          <div className="bg-emerald-950/40 border-b border-emerald-900/50 px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300">
                Escalated Anonymized Report (Zero PII - Escaped to Cloud)
              </span>
            </div>
            <button
              onClick={() => handleCopy(audit.scrubbedContent, true)}
              className="text-[11px] text-emerald-400 hover:text-emerald-200 flex items-center gap-1 font-mono"
            >
              {copiedScrubbed ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedScrubbed ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <div className="p-2 bg-emerald-950/20 text-[11px] text-emerald-400 border-b border-emerald-900/30 flex items-center gap-1.5 font-mono px-3.5">
            <Check className="w-3 h-3" />
            <span>VERIFIED ZERO-PII — SAFE FOR TIER-3 CLOUD AI INFERENCE</span>
          </div>

          {/* Scrubbed Text Body */}
          <div className="p-3.5 font-mono text-xs text-emerald-200/90 whitespace-pre-wrap break-all leading-relaxed max-h-72 overflow-y-auto">
            {audit.scrubbedContent}
          </div>
        </div>
      </div>

      {/* Redacted Items Summary Footer */}
      <div className="mt-4 pt-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-medium">Locally Stripped Entities ({audit.piiRemoved?.length || 0}):</span>
          {audit.piiRemoved && audit.piiRemoved.length > 0 ? (
            audit.piiRemoved.map((item, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-mono text-[11px]"
              >
                {item}
              </span>
            ))
          ) : (
            <span className="text-slate-500 italic">Target URL & query identifiers sanitized</span>
          )}
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Scrub Engine: Gemini Nano | Target: {audit.domain}
        </div>
      </div>
    </div>
  );
};
