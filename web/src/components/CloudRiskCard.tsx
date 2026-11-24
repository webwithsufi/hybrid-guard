"use client";

import React, { useState } from "react";
import { Cloud, ShieldAlert, FileText, Copy, Check, Download, Sparkles, AlertCircle, ArrowUpRight } from "lucide-react";
import { DomainAudit } from "../types/audit";
import { generateCloudEscalationAnalysis } from "../lib/cloudAnalysis";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

interface CloudRiskCardProps {
  audit: DomainAudit;
  onAuditUpdated: (updated: DomainAudit) => void;
}

export const CloudRiskCard: React.FC<CloudRiskCardProps> = ({ audit, onAuditUpdated }) => {
  const [isEscalating, setIsEscalating] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const analysis = audit.cloudAnalysis;

  const handleEscalateToCloud = async () => {
    setIsEscalating(true);
    setErrorMsg(null);

    try {
      // ONLY "firebase/ai" call with InferenceMode.ONLY_IN_CLOUD (gemini-3.5-flash)
      const result = await generateCloudEscalationAnalysis({
        domain: audit.domain,
        targetUrl: audit.targetUrl,
        riskLevel: audit.riskLevel,
        reason: audit.reason,
        scrubbedContent: audit.scrubbedContent,
        piiRemoved: audit.piiRemoved
      });

      const updatedAudit: DomainAudit = {
        ...audit,
        cloudAnalysis: result
      };

      // Try updating Firestore if not a local mock ID
      if (audit.id && !audit.id.startsWith("local_")) {
        try {
          const docRef = doc(db, "domain_audits", audit.id);
          await updateDoc(docRef, { cloudAnalysis: result });
        } catch (dbErr) {
          console.warn("Could not sync cloud analysis to Firestore:", dbErr);
        }
      }

      onAuditUpdated(updatedAudit);
    } catch (err: any) {
      console.error("Cloud escalation failure:", err);
      setErrorMsg(err.message || "Failed to escalate to cloud model");
    } finally {
      setIsEscalating(false);
    }
  };

  const copyNotice = () => {
    if (!analysis?.gdprCcpaNotice) return;
    navigator.clipboard.writeText(analysis.gdprCcpaNotice);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const downloadNotice = () => {
    if (!analysis?.gdprCcpaNotice) return;
    const blob = new Blob([analysis.gdprCcpaNotice], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GDPR_CCPA_Notice_${audit.domain.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadAuditJson = () => {
    const jsonStr = JSON.stringify(audit, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Audit_Report_${audit.domain.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-purple-950/80 border border-purple-700/60 text-purple-400">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Cloud Risk Intelligence & Opt-Out Notice
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-400 border border-purple-800 font-semibold">
                gemini-3.5-flash
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Escalated via <code className="text-purple-300 font-mono">InferenceMode.ONLY_IN_CLOUD</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!analysis && (
            <button
              onClick={handleEscalateToCloud}
              disabled={isEscalating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEscalating ? "Querying Cloud..." : "Escalate to gemini-3.5-flash"}</span>
            </button>
          )}

          {analysis && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded-md border border-purple-800/60">
                Cloud Latency: {analysis.cloudLatencyMs}ms
              </span>
              <button
                onClick={handleEscalateToCloud}
                disabled={isEscalating}
                className="text-xs text-slate-400 hover:text-slate-200 underline font-mono cursor-pointer"
              >
                {isEscalating ? "Re-analyzing..." : "Re-run"}
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Content */}
      {!analysis && !isEscalating && (
        <div className="text-center py-8 px-4 bg-slate-950/50 rounded-xl border border-slate-800/80">
          <div className="w-12 h-12 rounded-full bg-purple-950/50 border border-purple-800 text-purple-400 flex items-center justify-center mx-auto mb-3">
            <Cloud className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">
            Zero-PII Report Ready for Cloud Escalation
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Sensitive user tokens and search parameters have been scrubbed locally on Gemini Nano. Escalate to <span className="text-purple-300 font-mono">gemini-3.5-flash</span> to generate an in-depth threat breakdown and formal GDPR/CCPA erasure demand.
          </p>
          <button
            onClick={handleEscalateToCloud}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Cloud Risk Breakdown & Notice</span>
          </button>
        </div>
      )}

      {isEscalating && (
        <div className="text-center py-10 px-4 bg-slate-950/50 rounded-xl border border-slate-800/80">
          <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">
            Escalating to InferenceMode.ONLY_IN_CLOUD
          </h3>
          <p className="text-xs text-slate-400">
            Running gemini-3.5-flash with App Check debug token verification...
          </p>
        </div>
      )}

      {analysis && !isEscalating && (
        <div className="space-y-5">
          {/* Risk Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Severity Score */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Threat Severity Score</span>
              <div className="my-2 flex items-baseline gap-2">
                <span className={`text-3xl font-black font-mono ${
                  analysis.riskBreakdown.severityScore > 75
                    ? "text-rose-400"
                    : analysis.riskBreakdown.severityScore > 40
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}>
                  {analysis.riskBreakdown.severityScore}/100
                </span>
                <span className="text-xs text-slate-500 font-mono">Normalized</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    analysis.riskBreakdown.severityScore > 75
                      ? "bg-rose-500"
                      : analysis.riskBreakdown.severityScore > 40
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${analysis.riskBreakdown.severityScore}%` }}
                />
              </div>
            </div>

            {/* Threat Category */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Classified Threat Category</span>
              <div className="my-2">
                <div className="text-sm font-bold text-white leading-tight">
                  {analysis.riskBreakdown.threatCategory}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {analysis.riskBreakdown.attackVector}
                </div>
              </div>
              <span className="text-[10px] font-mono text-purple-400 uppercase">
                {audit.riskLevel} PRIORITY TARGET
              </span>
            </div>

            {/* Data Exposure Risk */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Data Exposure Assessment</span>
              <div className="my-2 text-xs text-slate-300 leading-snug line-clamp-3">
                {analysis.riskBreakdown.dataExposureRisk}
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                ✓ Pre-Scrubbed Client-Side
              </span>
            </div>
          </div>

          {/* Heuristics Matched & Recommended Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Heuristic Red Flags Identified</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {analysis.riskBreakdown.heuristicsMatched?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Actionable Mitigation Directives</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {analysis.riskBreakdown.mitigationSteps?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* GDPR / CCPA Notice Document Card */}
          <div className="bg-slate-950 border border-purple-900/40 rounded-xl overflow-hidden">
            <div className="bg-purple-950/40 border-b border-purple-900/40 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-purple-200">
                  Ready-to-Copy GDPR / CCPA Data-Deletion & Opt-Out Notice
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyNotice}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  {copiedNotice ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedNotice ? "Copied!" : "Copy Notice"}</span>
                </button>
                <button
                  onClick={downloadNotice}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Download .txt</span>
                </button>
                <button
                  onClick={downloadAuditJson}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 font-mono text-xs text-purple-200/90 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
              {analysis.gdprCcpaNotice}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
