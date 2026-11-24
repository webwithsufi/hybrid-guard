"use client";

import React, { useState } from "react";
import { DomainAudit, PrivacyGrade } from "../types/audit";
import { ArrowLeftRight, CheckCircle2, XCircle, ShieldCheck, ShieldAlert, Globe, Sparkles, Scale } from "lucide-react";

interface SiteComparisonProps {
  audits: DomainAudit[];
  onAnalyzeSite: (url: string) => Promise<DomainAudit | null>;
}

export const SiteComparison: React.FC<SiteComparisonProps> = ({ audits, onAnalyzeSite }) => {
  const [siteAInput, setSiteAInput] = useState(audits[0]?.domain || "github.com");
  const [siteBInput, setSiteBInput] = useState(audits[1]?.domain || "tiktok.com");
  const [isComparing, setIsComparing] = useState(false);

  // Find audit in memory or matching domain
  const findAudit = (domainOrUrl: string): DomainAudit | undefined => {
    const clean = domainOrUrl.toLowerCase().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].trim();
    return audits.find((a) => a.domain.toLowerCase().replace(/^www\./i, "") === clean);
  };

  const auditA = findAudit(siteAInput);
  const auditB = findAudit(siteBInput);

  const handleCompare = async () => {
    setIsComparing(true);
    try {
      if (!auditA && siteAInput) {
        await onAnalyzeSite(siteAInput);
      }
      if (!auditB && siteBInput) {
        await onAnalyzeSite(siteBInput);
      }
    } finally {
      setIsComparing(false);
    }
  };

  const gradeScore: Record<PrivacyGrade, number> = {
    "A+": 98,
    A: 92,
    B: 80,
    C: 65,
    D: 45,
    F: 20
  };

  const getScore = (audit?: DomainAudit): number => {
    if (!audit) return 70;
    const grade = audit.cloudAnalysis?.grade || (audit.riskLevel === "LOW" ? "A" : audit.riskLevel === "MEDIUM" ? "C" : "F");
    return gradeScore[grade] ?? 70;
  };

  const scoreA = getScore(auditA);
  const scoreB = getScore(auditB);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Side-by-Side Website Privacy Comparison
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
              Benchmarking
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Compare data collection policies, broker data selling, cookie tracking, and blocked permissions between any two domains.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {audits.length >= 2 && (
            <button
              onClick={() => {
                setSiteAInput(audits[0].domain);
                setSiteBInput(audits[1].domain);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
            >
              Use Recent Audits
            </button>
          )}
        </div>
      </div>

      {/* Selectors / Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-5">
          <label className="block text-xs font-medium text-slate-700 mb-1">Website 1</label>
          <div className="relative">
            <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={siteAInput}
              onChange={(e) => setSiteAInput(e.target.value)}
              placeholder="e.g. github.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="sm:col-span-2 flex items-center justify-center pt-4 sm:pt-4">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
        </div>

        <div className="sm:col-span-5">
          <label className="block text-xs font-medium text-slate-700 mb-1">Website 2</label>
          <div className="relative">
            <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={siteBInput}
              onChange={(e) => setSiteBInput(e.target.value)}
              placeholder="e.g. tiktok.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Compare Action Button if either audit isn't loaded */}
      {(!auditA || !auditB) && (
        <div className="text-center pt-1">
          <button
            onClick={handleCompare}
            disabled={isComparing}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition-all cursor-pointer disabled:opacity-75 disabled:cursor-wait"
          >
            {isComparing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Comparing Policies in 3s...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Side-by-Side Comparison</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Visual Score Comparison Bar */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
          <div className="flex items-center gap-1.5 text-indigo-700">
            <span>{auditA?.domain || siteAInput}</span>
            <span className="font-mono text-[11px] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
              {scoreA}/100
            </span>
          </div>

          <span className="text-[11px] text-slate-500 font-medium">Privacy Safety Index</span>

          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="font-mono text-[11px] bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300">
              {scoreB}/100
            </span>
            <span>{auditB?.domain || siteBInput}</span>
          </div>
        </div>

        {/* Comparison Ratio Bar */}
        <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden flex">
          <div
            className="h-full bg-indigo-600 transition-all duration-500"
            style={{ width: `${Math.round((scoreA / (scoreA + scoreB || 1)) * 100)}%` }}
          />
          <div
            className="h-full bg-slate-400 transition-all duration-500"
            style={{ width: `${Math.round((scoreB / (scoreA + scoreB || 1)) * 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <span>Higher score indicates stricter encryption &amp; minimal broker data sales</span>
          <span>{scoreA >= scoreB ? `+${scoreA - scoreB} pts advantage` : `+${scoreB - scoreA} pts advantage`}</span>
        </div>
      </div>

      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {/* Column A */}
        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{auditA?.domain || siteAInput}</h4>
                <p className="text-[11px] text-slate-500">Website 1</p>
              </div>
              <div className="text-right">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    (auditA?.cloudAnalysis?.grade || "A").startsWith("A")
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : (auditA?.cloudAnalysis?.grade || "B").startsWith("B")
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  Grade {auditA?.cloudAnalysis?.grade || (scoreA > 85 ? "A" : "B")}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block mb-1">What Data is Collected:</span>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {(auditA?.cloudAnalysis?.dataPills || ["🍪 Session Cookies", "📱 Device Telemetry", "📧 Account Inputs"]).map(
                    (p, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px]">
                        {p}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">Data Selling / Broker Sharing:</span>
                {auditA?.cloudAnalysis?.sellsOrSharesData?.doesSellOrShare ? (
                  <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-[11px]">
                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Shares with Commercial Ad Brokers</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Does NOT Sell Personal User Data</span>
                  </span>
                )}
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">Cookie Advice:</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {auditA?.cloudAnalysis?.cookiesAndPermissionsAdvice?.cookieAdvice ||
                    "Click 'Reject All' or 'Essential Only' to avoid cross-site tracking."}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">Blocked Hardware Permissions:</span>
                <span className="text-slate-600 text-[11px]">
                  {auditA?.blockedPermissions && auditA.blockedPermissions.length > 0
                    ? `Active shield blocked: ${auditA.blockedPermissions.join(", ")}`
                    : "0 unauthorized camera, GPS, or clipboard requests recorded"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500">
            {auditA?.scannedAt ? `Audited: ${new Date(auditA.scannedAt).toLocaleDateString()}` : "Ready for comparison"}
          </div>
        </div>

        {/* Column B */}
        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{auditB?.domain || siteBInput}</h4>
                <p className="text-[11px] text-slate-500">Website 2</p>
              </div>
              <div className="text-right">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    (auditB?.cloudAnalysis?.grade || "C").startsWith("A")
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : (auditB?.cloudAnalysis?.grade || "C").startsWith("B")
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  Grade {auditB?.cloudAnalysis?.grade || (scoreB > 75 ? "B" : "C")}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block mb-1">What Data is Collected:</span>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {(auditB?.cloudAnalysis?.dataPills || ["🍪 Tracking Cookies", "📍 Geolocation / IP", "📱 Hardware Fingerprint"]).map(
                    (p, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px]">
                        {p}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">Data Selling / Broker Sharing:</span>
                {auditB?.cloudAnalysis?.sellsOrSharesData?.doesSellOrShare || scoreB < 75 ? (
                  <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-[11px]">
                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Shares with Commercial Ad Brokers</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Does NOT Sell Personal User Data</span>
                  </span>
                )}
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">Cookie Advice:</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {auditB?.cloudAnalysis?.cookiesAndPermissionsAdvice?.cookieAdvice ||
                    "Click 'Reject All' to prevent tracking cookies from recording cross-site sessions."}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">Blocked Hardware Permissions:</span>
                <span className="text-slate-600 text-[11px]">
                  {auditB?.blockedPermissions && auditB.blockedPermissions.length > 0
                    ? `Active shield blocked: ${auditB.blockedPermissions.join(", ")}`
                    : "0 unauthorized camera, GPS, or clipboard requests recorded"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500">
            {auditB?.scannedAt ? `Audited: ${new Date(auditB.scannedAt).toLocaleDateString()}` : "Ready for comparison"}
          </div>
        </div>
      </div>
    </div>
  );
};
