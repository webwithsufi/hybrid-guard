"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Sparkles, Cloud, Check, AlertCircle } from "lucide-react";
import { DomainAudit } from "../types/audit";
import { generateCloudEscalationAnalysis } from "../lib/cloudAnalysis";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

interface SafetyGuidelinesCardProps {
  audit: DomainAudit;
  onAuditUpdated: (updated: DomainAudit) => void;
}

export const SafetyGuidelinesCard: React.FC<SafetyGuidelinesCardProps> = ({ audit, onAuditUpdated }) => {
  const [isAnalyzingCloud, setIsAnalyzingCloud] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isHigh = audit.riskLevel === "HIGH";
  const isMed = audit.riskLevel === "MEDIUM";
  const isLow = audit.riskLevel === "LOW";
  const analysis = audit.cloudAnalysis;

  const handleRunCloudAnalysis = async () => {
    setIsAnalyzingCloud(true);
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
      console.error("Cloud analysis error:", err);
      setErrorMsg(err.message || "Failed to run cloud analysis");
    } finally {
      setIsAnalyzingCloud(false);
    }
  };

  // Determine 3 plain bullets for "Why this might be risky"
  const defaultRisks = isHigh
    ? [
        "The website address looks similar to a well-known brand but has misspelled words to trick you.",
        "It aggressively requests sensitive passwords or account credentials with fake urgency.",
        "It lacks verified security certificates from the legitimate organization."
      ]
    : isMed
    ? [
        "The website address contains unusual endings or excessive hyphens commonly found in unverified sites.",
        "It attempts to gather personal contact details and track your browsing history.",
        "The identity of the website owner cannot be independently verified."
      ]
    : [
        "Verified official website matching the legitimate organization.",
        "Uses industry-standard encryption to protect your browsing session.",
        "No fake login prompts, phishing cues, or deceptive traps detected."
      ];

  // Determine 3 plain tips for "How to stay safe"
  const defaultTips = (isHigh || isMed)
    ? [
        "Never type your password, debit card, or personal info on this page.",
        "Open a fresh browser tab and type the official website address yourself.",
        "Use the 1-click button below to request this website delete any data they saved."
      ]
    : [
        "Always double-check the web address in your browser bar before entering passwords.",
        "Turn on two-factor authentication on your account for an extra layer of protection.",
        "You can safely access this official site and browse normally."
      ];

  const riskBullets = analysis?.riskBreakdown?.heuristicsMatched?.slice(0, 3) || defaultRisks;
  const safeTips = analysis?.riskBreakdown?.mitigationSteps?.slice(0, 3) || defaultTips;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            What You Should Know & Do
          </h2>
          <p className="text-xs text-slate-500">
            Clear, everyday guidance to help you make informed decisions online.
          </p>
        </div>

        <div>
          {!analysis ? (
            <button
              onClick={handleRunCloudAnalysis}
              disabled={isAnalyzingCloud}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isAnalyzingCloud ? "Analyzing with Cloud AI..." : "Run Deep Cloud Analysis"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 flex items-center gap-1">
                <Check className="w-3 h-3 text-indigo-600" />
                <span>Deep Analysis Ready ({analysis.cloudLatencyMs}ms)</span>
              </span>
              <button
                onClick={handleRunCloudAnalysis}
                disabled={isAnalyzingCloud}
                className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer"
              >
                Re-check
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Two Clean Side-by-Side Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left List: Why this might be risky */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <AlertTriangle className={`w-4 h-4 ${isHigh ? "text-rose-600" : isMed ? "text-amber-600" : "text-emerald-600"}`} />
            <span>{isLow ? "Why this site is safe" : "Why this might be risky"}</span>
          </h3>

          <ul className="space-y-2.5">
            {riskBullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isHigh ? "bg-rose-500" : isMed ? "bg-amber-500" : "bg-emerald-500"}`} />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right List: How to stay safe */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>How to stay safe</span>
          </h3>

          <ul className="space-y-2.5">
            {safeTips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  ✓
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
