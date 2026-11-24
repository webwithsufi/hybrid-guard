"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Check,
  AlertCircle,
  FileText,
  Cookie,
  Share2,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Bell,
  MapPin,
  Lock
} from "lucide-react";
import { DomainAudit, CloudEscalationResult } from "../types/audit";
import { generateCloudEscalationAnalysis } from "../lib/cloudAnalysis";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

interface PrivacyPolicyReportCardProps {
  audit: DomainAudit;
  onAuditUpdated: (updated: DomainAudit) => void;
}

export const PrivacyPolicyReportCard: React.FC<PrivacyPolicyReportCardProps> = ({
  audit,
  onAuditUpdated
}) => {
  const [isAnalyzingCloud, setIsAnalyzingCloud] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const analysis = audit.cloudAnalysis;

  const handleRunCloudAnalysis = async () => {
    setIsAnalyzingCloud(true);
    setErrorMsg(null);

    try {
      // ONLY "firebase/ai" call with InferenceMode.ONLY_IN_CLOUD (gemini-3.5-flash)
      const result: CloudEscalationResult = await generateCloudEscalationAnalysis({
        domain: audit.domain,
        targetUrl: audit.targetUrl,
        policyUrl: audit.policyUrl,
        riskLevel: audit.riskLevel,
        reason: audit.reason,
        scrubbedContent: audit.scrubbedContent,
        piiRemoved: audit.piiRemoved,
        detectedCookies: audit.detectedCookies,
        detectedPermissions: audit.detectedPermissions
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

  // Derive initial values if cloud analysis has not yet been executed
  const isHigh = audit.riskLevel === "HIGH";
  const isMed = audit.riskLevel === "MEDIUM";

  const grade = analysis?.grade || (isHigh ? "F" : isMed ? "C" : "B");
  const gradeReason =
    analysis?.gradeReason ||
    (isHigh
      ? "High-risk deceptive markers and potential credential traps detected."
      : isMed
      ? "Uses third-party advertising cookies and cross-site telemetry."
      : "Standard privacy policy with basic analytics and no data brokering.");

  const summary =
    analysis?.summary ||
    (isHigh
      ? `This site on ${audit.domain} shows deceptive markers. Avoid sharing passwords or financial details.`
      : `Privacy policy review for ${audit.domain}. The site collects standard technical data for website operations.`);

  const dataCollected = analysis?.dataCollected || [
    "Contact information and form inputs you type into the site",
    "Technical specifications (IP address, operating system, browser type)",
    "Pages viewed, click interactions, and time spent on the website"
  ];

  const sellsData = analysis?.sellsOrSharesData?.doesSellOrShare ?? (isHigh || isMed);
  const sellsExplanation =
    analysis?.sellsOrSharesData?.explanation ||
    (sellsData
      ? "Yes, browsing behavior and device identifiers are shared with advertising partners and analytics networks."
      : "No, this website states it does not sell your personal data to third-party data brokers.");

  const cookieAdvice =
    analysis?.cookiesAndPermissionsAdvice?.cookieAdvice ||
    audit.detectedCookies?.advice ||
    "Click 'Reject All' or 'Essential Only' on the cookie consent banner to prevent ad trackers from following you across websites.";

  const permissionAdvice =
    analysis?.cookiesAndPermissionsAdvice?.permissionAdvice ||
    "Block notifications and GPS location access—they are not necessary for viewing content on this website.";

  // Grade badge color styling
  let gradeBg = "bg-emerald-50 text-emerald-800 border-emerald-300";
  let gradeLetterBg = "bg-emerald-600 text-white";
  if (grade === "A") {
    gradeBg = "bg-emerald-50 text-emerald-800 border-emerald-300";
    gradeLetterBg = "bg-emerald-600 text-white";
  } else if (grade === "B") {
    gradeBg = "bg-indigo-50 text-indigo-800 border-indigo-300";
    gradeLetterBg = "bg-indigo-600 text-white";
  } else if (grade === "C") {
    gradeBg = "bg-amber-50 text-amber-800 border-amber-300";
    gradeLetterBg = "bg-amber-500 text-white";
  } else if (grade === "D") {
    gradeBg = "bg-orange-50 text-orange-800 border-orange-300";
    gradeLetterBg = "bg-orange-600 text-white";
  } else if (grade === "F") {
    gradeBg = "bg-rose-50 text-rose-800 border-rose-300";
    gradeLetterBg = "bg-rose-600 text-white";
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Top Banner: Big Privacy Policy Grade & Cloud Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          {/* Big Grade Badge */}
          <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold shrink-0 border-2 shadow-xs ${gradeBg}`}>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-75">Grade</span>
            <span className="text-3xl leading-none font-black">{grade}</span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Privacy Policy &amp; Cookie Report</span>
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5 max-w-lg">
              {gradeReason}
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xl">
              {summary}
            </p>
          </div>
        </div>

        {/* Cloud Analysis Action Button */}
        <div>
          {!analysis ? (
            <button
              onClick={handleRunCloudAnalysis}
              disabled={isAnalyzingCloud}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isAnalyzingCloud ? "Analyzing Policy with Cloud AI..." : "Run Deep Cloud Analysis"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-indigo-600" />
                <span>Deep Analysis Ready ({analysis.cloudLatencyMs}ms • Gemini 3.5 Flash)</span>
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
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3 Clear Everyday Cards/Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: What data this site collects */}
        <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-3">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>1. What Data It Collects</span>
            </div>

            <ul className="space-y-2.5">
              {dataCollected.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-400">
            No technical jargon • Plain English summary
          </div>
        </div>

        {/* Card 2: Do they sell or share your data? */}
        <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-3">
              <Share2 className="w-4 h-4 text-indigo-600" />
              <span>2. Sells or Shares Data?</span>
            </div>

            {/* Clear Yes / No Badge */}
            <div className="mb-3">
              {sellsData ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>YES — Shares with Ad Trackers</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>NO — Does Not Sell Personal Data</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              {sellsExplanation}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-400">
            Data broker &amp; cross-site marketing check
          </div>
        </div>

        {/* Card 3: Cookies & Permissions Advice */}
        <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-3">
              <Cookie className="w-4 h-4 text-indigo-600" />
              <span>3. Cookies &amp; Permissions</span>
            </div>

            <div className="space-y-3">
              {/* Cookie advice */}
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 text-xs">
                <span className="font-semibold text-slate-900 block mb-1 flex items-center gap-1.5">
                  <span>🍪 Cookie Consent:</span>
                </span>
                <span className="text-slate-600 leading-snug block">
                  {cookieAdvice}
                </span>
              </div>

              {/* Permission advice */}
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 text-xs">
                <span className="font-semibold text-slate-900 block mb-1 flex items-center gap-1.5">
                  <Bell className="w-3 h-3 text-amber-600" />
                  <span>Permissions Advice:</span>
                </span>
                <span className="text-slate-600 leading-snug block">
                  {permissionAdvice}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-400">
            Everyday recommendations for your browser
          </div>
        </div>
      </div>
    </div>
  );
};
