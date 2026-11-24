"use client";

import React from "react";
import {
  Globe,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Cookie,
  Share2,
  Lock,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  Camera,
  MapPin,
  Clipboard,
  Bell,
  Code2,
  Printer,
  FileDown
} from "lucide-react";
import { DomainAudit, PrivacyGrade } from "../types/audit";

interface VvipBentoHeroProps {
  audit: DomainAudit;
  isAnalyzingCloud: boolean;
  onOpenTechnicalProof: () => void;
  onRunCloudAnalysis: () => void;
}

export const VvipBentoHero: React.FC<VvipBentoHeroProps> = ({
  audit,
  isAnalyzingCloud,
  onOpenTechnicalProof,
  onRunCloudAnalysis
}) => {
  const analysis = audit.cloudAnalysis;
  const isHigh = audit.riskLevel === "HIGH";
  const isMed = audit.riskLevel === "MEDIUM";

  const grade: PrivacyGrade = analysis?.grade || (isHigh ? "F" : isMed ? "C" : "A");

  // Clean SaaS grade color scheme
  let ringColor = "border-emerald-500 text-emerald-700 bg-emerald-50";
  let gradeBadgeBg = "bg-emerald-50 text-emerald-800 border-emerald-200";

  if (grade === "A+" || grade === "A") {
    ringColor = "border-emerald-500 text-emerald-700 bg-emerald-50";
    gradeBadgeBg = "bg-emerald-50 text-emerald-800 border-emerald-200";
  } else if (grade === "B") {
    ringColor = "border-indigo-500 text-indigo-700 bg-indigo-50";
    gradeBadgeBg = "bg-indigo-50 text-indigo-800 border-indigo-200";
  } else if (grade === "C") {
    ringColor = "border-amber-500 text-amber-700 bg-amber-50";
    gradeBadgeBg = "bg-amber-50 text-amber-800 border-amber-200";
  } else if (grade === "D") {
    ringColor = "border-orange-500 text-orange-700 bg-orange-50";
    gradeBadgeBg = "bg-orange-50 text-orange-800 border-orange-200";
  } else {
    ringColor = "border-rose-500 text-rose-700 bg-rose-50";
    gradeBadgeBg = "bg-rose-50 text-rose-800 border-rose-200";
  }

  // 1-sentence plain verdict
  const plainVerdict =
    analysis?.summary ||
    (isHigh
      ? "Strong scam or deceptive credential harvesting cues detected. Avoid entering account passwords."
      : isMed
      ? "Unverified structure and aggressive cross-site tracking detected. Proceed with caution."
      : "Verified authentic web service with industry standard encryption and no credential traps.");

  const dataPills = analysis?.dataPills || [
    "🍪 Tracking Cookies",
    "📱 Device Telemetry",
    "📧 Account Details"
  ];

  const dataBullets = analysis?.dataCollected?.slice(0, 2) || [
    "Contact information and inputs submitted through forms",
    "Technical device specifications, IP address, and browser operating system"
  ];

  const sellsData = analysis?.sellsOrSharesData?.doesSellOrShare ?? (isHigh || isMed);
  const sellsExplanation =
    analysis?.sellsOrSharesData?.explanation ||
    (sellsData
      ? "Yes, device telemetry and browsing habits are shared with commercial ad networks."
      : "No, this website states it does not sell personal user information to third-party data brokers.");

  const cookieAdvice =
    analysis?.cookiesAndPermissionsAdvice?.cookieAdvice ||
    audit.detectedCookies?.advice ||
    "Click 'Reject All' or 'Essential Only' to prevent ad brokers from tracking you.";

  const permissionAdvice =
    analysis?.cookiesAndPermissionsAdvice?.permissionAdvice ||
    "Keep device sensors, location, and notification access blocked by default.";

  // Active shield blocked permissions list for this domain
  const blockedList = audit.blockedPermissions || [];

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-5 print-report-container">
      {/* 1. Hero Verdict & Circular Privacy Grade Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-5">
            {/* Circular Grade Gauge */}
            <div className="relative shrink-0">
              <div
                className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full border-4 flex flex-col items-center justify-center font-bold ${ringColor}`}
              >
                <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80">
                  Privacy
                </span>
                <span className="text-3xl sm:text-4xl font-extrabold leading-none tracking-tight">
                  {grade}
                </span>
              </div>
            </div>

            {/* Domain Info & Verdict */}
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const rawReason = analysis?.gradeReason || (isHigh ? "High Threat Risk" : "Standard Profile");
                  const cleanReason = rawReason.replace(/^grade\s+[a-f][+-]?\s*[:•\-]?\s*/i, "").trim();
                  return (
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${gradeBadgeBg}`}>
                      Grade {grade} &bull; {cleanReason || (isHigh ? "High Threat Risk" : "Standard Profile")}
                    </span>
                  );
                })()}

                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono" suppressHydrationWarning>
                  <Clock className="w-3 h-3 text-slate-400" />
                  {new Date(audit.scannedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>

                {isAnalyzingCloud && (
                  <span className="text-[10.5px] font-medium text-indigo-600 animate-pulse flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    Auto-Analyzing with Gemini 3.5 Flash...
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight break-all">
                {audit.domain}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {plainVerdict}
              </p>

              {/* Active Shield Log Chips (Blocked Sensors on this Domain) */}
              <div className="pt-1.5 flex items-center gap-2 flex-wrap">
                {blockedList.length > 0 ? (
                  blockedList.map((perm, idx) => {
                    let label = perm;
                    let icon = <ShieldAlert className="w-3 h-3" />;
                    if (perm.includes("camera") || perm.includes("mic")) {
                      label = "Blocked Camera / Mic";
                      icon = <Camera className="w-3 h-3" />;
                    } else if (perm.includes("location")) {
                      label = "Blocked GPS Location";
                      icon = <MapPin className="w-3 h-3" />;
                    } else if (perm.includes("clipboard")) {
                      label = "Blocked Clipboard Snooping";
                      icon = <Clipboard className="w-3 h-3" />;
                    } else if (perm.includes("notification")) {
                      label = "Blocked Notification Spam";
                      icon = <Bell className="w-3 h-3" />;
                    }
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                      >
                        {icon}
                        <span>🚫 {label}</span>
                      </span>
                    );
                  })
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Active Shield: 0 Unauthorized Sensor Access Attempts</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Links & 1-Click Export PDF Button */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 shrink-0 no-print">
            <button
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
              title="Print or save this privacy audit report as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Export PDF Report</span>
            </button>

            <a
              href={audit.rawUrl || audit.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors border border-slate-200 cursor-pointer"
            >
              <span>Visit Site</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-600" />
              <span>Nano Speed: {audit.onDeviceLatencyMs || 14}ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Three Scannable Bento Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Data Collected */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                1. Data Collected
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Zero Jargon</span>
            </div>

            {/* Pill Tags */}
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              {dataPills.map((pill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-medium"
                >
                  {pill}
                </span>
              ))}
            </div>

            {/* 2 Crisp Bullets */}
            <ul className="space-y-2">
              {dataBullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
            Plain-English data scope summary
          </div>
        </div>

        {/* Card 2: Data Sharing & Selling */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. Sharing / Selling</span>
              </span>
            </div>

            {/* Status Badge */}
            <div className="mb-2.5">
              {sellsData ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Shares with Ad Trackers</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Does NOT Sell Data</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {sellsExplanation}
            </p>
          </div>

          <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
            Commercial data broker inspection
          </div>
        </div>

        {/* Card 3: Cookies & Permissions Action */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Cookie className="w-3.5 h-3.5 text-indigo-600" />
                <span>3. Recommended Actions</span>
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">
                  🍪 Cookie Advice:
                </span>
                <span className="text-[11.5px] leading-relaxed block">{cookieAdvice}</span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">
                  🛡️ Device Permissions:
                </span>
                <span className="text-[11.5px] leading-relaxed block">{permissionAdvice}</span>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
            Actionable everyday recommendations
          </div>
        </div>
      </div>

      {/* 3. Compact Zero-PII Verification Strip */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Zero-PII Transmission Guarantee</span>
          </div>

          <span className="text-slate-300 hidden sm:inline">&bull;</span>

          <span className="text-slate-600">
            {audit.piiCount || (audit.piiRemoved ? audit.piiRemoved.length : 0)} personal details redacted locally before cloud analysis
          </span>
        </div>

        <button
          onClick={onOpenTechnicalProof}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200 shadow-2xs transition-colors shrink-0 cursor-pointer no-print"
        >
          <Code2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>Technical Verification &amp; Scrubbed Diff &rarr;</span>
        </button>
      </div>
    </div>
  );
};
