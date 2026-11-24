"use client";

import React, { useState } from "react";
import { DomainAudit } from "../types/audit";
import { ShieldCheck, ShieldAlert, AlertTriangle, Zap, Cloud, Cpu, Activity, Info } from "lucide-react";

interface AnalyticsChartsProps {
  audits: DomainAudit[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ audits }) => {
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<string | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const totalAudits = audits.length;

  // 1. Risk Breakdown
  const safeCount = audits.filter((a) => a.riskLevel === "LOW").length;
  const cautionCount = audits.filter((a) => a.riskLevel === "MEDIUM").length;
  const highRiskCount = audits.filter((a) => a.riskLevel === "HIGH").length;

  const safePct = totalAudits > 0 ? Math.round((safeCount / totalAudits) * 100) : 70;
  const cautionPct = totalAudits > 0 ? Math.round((cautionCount / totalAudits) * 100) : 20;
  const highRiskPct = totalAudits > 0 ? Math.max(0, 100 - safePct - cautionPct) : 10;

  // Average Privacy Grade calculation
  const gradePoints: Record<string, number> = { "A+": 4.3, A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0 };
  const totalGradeScore = audits.reduce((acc, a) => {
    const g = a.cloudAnalysis?.grade || (a.riskLevel === "LOW" ? "A" : a.riskLevel === "MEDIUM" ? "C" : "F");
    return acc + (gradePoints[g] ?? 3.0);
  }, 0);
  const avgScore = totalAudits > 0 ? (totalGradeScore / totalAudits).toFixed(1) : "3.8";
  const avgGradeLabel = Number(avgScore) >= 3.7 ? "Grade A" : Number(avgScore) >= 2.7 ? "Grade B" : "Grade C";

  // 2. Data Exposure Categories Frequency
  let adCookiesCount = 0;
  let locationIpCount = 0;
  let dataSharingCount = 0;
  let deviceFingerprintCount = 0;

  if (totalAudits > 0) {
    audits.forEach((a) => {
      const pills = (a.cloudAnalysis?.dataPills || []).map((p) => p.toLowerCase());
      const bullets = (a.cloudAnalysis?.dataCollected || []).map((b) => b.toLowerCase());
      const fullText = (a.scrubbedContent || "").toLowerCase();

      if (
        pills.some((p) => p.includes("cookie") || p.includes("ad")) ||
        a.detectedCookies?.hasBanner ||
        fullText.includes("cookie") ||
        fullText.includes("ad")
      ) {
        adCookiesCount++;
      }

      if (
        pills.some((p) => p.includes("location") || p.includes("ip")) ||
        bullets.some((b) => b.includes("location") || b.includes("ip")) ||
        a.blockedPermissions?.includes("location")
      ) {
        locationIpCount++;
      }

      if (
        a.cloudAnalysis?.sellsOrSharesData?.doesSellOrShare ||
        fullText.includes("third-party") ||
        fullText.includes("partner")
      ) {
        dataSharingCount++;
      }

      if (
        pills.some((p) => p.includes("device") || p.includes("telemetry")) ||
        bullets.some((b) => b.includes("fingerprint") || b.includes("browser") || b.includes("operating system"))
      ) {
        deviceFingerprintCount++;
      }
    });
  } else {
    // Standard baseline for demo state
    adCookiesCount = 8;
    locationIpCount = 5;
    dataSharingCount = 4;
    deviceFingerprintCount = 6;
  }

  const denominator = Math.max(totalAudits, 10);
  const exposureCategories = [
    {
      name: "Ad & Cross-Site Tracking Cookies",
      count: adCookiesCount,
      pct: Math.min(100, Math.round((adCookiesCount / denominator) * 100)),
      color: "#4F46E5",
      description: "Sites using tracking beacons or persistent advertising cookies"
    },
    {
      name: "Device Fingerprinting & Telemetry",
      count: deviceFingerprintCount,
      pct: Math.min(100, Math.round((deviceFingerprintCount / denominator) * 100)),
      color: "#0284C7",
      description: "Collection of browser headers, display resolution, and OS specs"
    },
    {
      name: "Third-Party Data Sharing / Brokers",
      count: dataSharingCount,
      pct: Math.min(100, Math.round((dataSharingCount / denominator) * 100)),
      color: "#D97706",
      description: "User profiles synced with advertising syndicates and data exchanges"
    },
    {
      name: "Location / IP Geolocation Tracking",
      count: locationIpCount,
      pct: Math.min(100, Math.round((locationIpCount / denominator) * 100)),
      color: "#E11D48",
      description: "Precision GPS or reverse-IP coordinate logging"
    }
  ];

  // 3. Performance Metrics
  const avgNanoLatency =
    totalAudits > 0
      ? Math.round(audits.reduce((acc, a) => acc + (a.onDeviceLatencyMs || 14), 0) / totalAudits)
      : 14;
  const avgCloudLatency =
    totalAudits > 0
      ? Math.round(audits.reduce((acc, a) => acc + (a.cloudAnalysis?.cloudLatencyMs || 2200), 0) / totalAudits)
      : 2200;

  // SVG Donut calculation
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.16
  const safeDash = (safePct / 100) * circumference;
  const cautionDash = (cautionPct / 100) * circumference;
  const highRiskDash = (highRiskPct / 100) * circumference;

  const safeOffset = 0;
  const cautionOffset = -safeDash;
  const highRiskOffset = -(safeDash + cautionDash);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Privacy &amp; Security Analytics
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated metrics across {totalAudits} audited websites, tracker frequencies, and local vs cloud AI latency.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Safe ({safePct}%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Caution ({cautionPct}%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>High Risk ({highRiskPct}%)</span>
          </div>
        </div>
      </div>

      {/* 3 Interactive Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Chart 1: Privacy & Risk Distribution Donut (4 cols) */}
        <div className="lg:col-span-4 bg-slate-50/80 border border-slate-200/80 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              1. Risk Distribution
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Avg {avgGradeLabel} ({avgScore}/4.0)
            </span>
          </div>

          {/* Interactive SVG Donut */}
          <div className="relative flex items-center justify-center my-3">
            <svg width="150" height="150" viewBox="0 0 140 140" className="transform -rotate-90">
              {/* Background ring */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#E2E8F0"
                strokeWidth="14"
              />

              {/* Safe Segment */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#059669"
                strokeWidth={hoveredDonutSegment === "safe" ? "18" : "14"}
                strokeDasharray={`${safeDash} ${circumference}`}
                strokeDashoffset={safeOffset}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredDonutSegment("safe")}
                onMouseLeave={() => setHoveredDonutSegment(null)}
              />

              {/* Caution Segment */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#D97706"
                strokeWidth={hoveredDonutSegment === "caution" ? "18" : "14"}
                strokeDasharray={`${cautionDash} ${circumference}`}
                strokeDashoffset={cautionOffset}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredDonutSegment("caution")}
                onMouseLeave={() => setHoveredDonutSegment(null)}
              />

              {/* High Risk Segment */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#E11D48"
                strokeWidth={hoveredDonutSegment === "highRisk" ? "18" : "14"}
                strokeDasharray={`${highRiskDash} ${circumference}`}
                strokeDashoffset={highRiskOffset}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredDonutSegment("highRisk")}
                onMouseLeave={() => setHoveredDonutSegment(null)}
              />
            </svg>

            {/* Central Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-900 leading-none">
                {hoveredDonutSegment === "safe"
                  ? `${safePct}%`
                  : hoveredDonutSegment === "caution"
                  ? `${cautionPct}%`
                  : hoveredDonutSegment === "highRisk"
                  ? `${highRiskPct}%`
                  : `${totalAudits}`}
              </span>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                {hoveredDonutSegment === "safe"
                  ? "Safe Sites"
                  : hoveredDonutSegment === "caution"
                  ? "Caution"
                  : hoveredDonutSegment === "highRisk"
                  ? "High Risk"
                  : "Websites"}
              </span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-200/60">
            <div
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                hoveredDonutSegment === "safe" ? "bg-emerald-50 text-emerald-800" : "text-slate-600"
              }`}
              onMouseEnter={() => setHoveredDonutSegment("safe")}
              onMouseLeave={() => setHoveredDonutSegment(null)}
            >
              <div className="text-xs font-bold text-emerald-700">{safeCount}</div>
              <div className="text-[10px] text-slate-500">Safe</div>
            </div>
            <div
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                hoveredDonutSegment === "caution" ? "bg-amber-50 text-amber-800" : "text-slate-600"
              }`}
              onMouseEnter={() => setHoveredDonutSegment("caution")}
              onMouseLeave={() => setHoveredDonutSegment(null)}
            >
              <div className="text-xs font-bold text-amber-700">{cautionCount}</div>
              <div className="text-[10px] text-slate-500">Caution</div>
            </div>
            <div
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                hoveredDonutSegment === "highRisk" ? "bg-rose-50 text-rose-800" : "text-slate-600"
              }`}
              onMouseEnter={() => setHoveredDonutSegment("highRisk")}
              onMouseLeave={() => setHoveredDonutSegment(null)}
            >
              <div className="text-xs font-bold text-rose-700">{highRiskCount}</div>
              <div className="text-[10px] text-slate-500">High Risk</div>
            </div>
          </div>
        </div>

        {/* Chart 2: Data Exposure & Tracker Categories Bar Chart (5 cols) */}
        <div className="lg:col-span-5 bg-slate-50/80 border border-slate-200/80 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              2. Data Exposure Categories
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Frequency Rate</span>
          </div>

          <div className="space-y-3.5 my-auto">
            {exposureCategories.map((cat, idx) => (
              <div
                key={idx}
                className="space-y-1 cursor-pointer group"
                onMouseEnter={() => setHoveredBarIndex(idx)}
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`font-medium transition-colors ${
                      hoveredBarIndex === idx ? "text-indigo-600 font-semibold" : "text-slate-700"
                    }`}
                  >
                    {cat.name}
                  </span>
                  <span className="font-mono text-slate-500 text-[11px] font-semibold">
                    {cat.pct}%
                  </span>
                </div>

                {/* Progress track */}
                <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${cat.pct}%`,
                      backgroundColor: cat.color,
                      opacity: hoveredBarIndex !== null && hoveredBarIndex !== idx ? 0.45 : 1
                    }}
                  />
                </div>

                {/* Hover description */}
                {hoveredBarIndex === idx && (
                  <p className="text-[10.5px] text-slate-500 italic pt-0.5 animate-fadeIn">
                    {cat.description}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Advertising cookies remain the most prevalent tracker type across websites.</span>
          </div>
        </div>

        {/* Chart 3: Hybrid AI Performance (Nano vs Cloud 3.5 Flash) (3 cols) */}
        <div className="lg:col-span-3 bg-slate-50/80 border border-slate-200/80 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                3. AI Engine Latency
              </span>
              <span className="text-[10px] font-mono text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                150x Faster
              </span>
            </div>

            <div className="space-y-4 my-2">
              {/* On-Device Nano Card */}
              <div className="p-3 rounded-lg bg-white border border-emerald-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gemini Nano</span>
                  </div>
                  <span className="font-mono text-emerald-600 font-bold">{avgNanoLatency}ms</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  On-device pre-click check &amp; regex PII redaction. Zero network roundtrip.
                </div>
                <div className="w-full h-1.5 rounded-full bg-emerald-100 mt-2 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "8%" }} />
                </div>
              </div>

              {/* Cloud Gemini 3.5 Flash Card */}
              <div className="p-3 rounded-lg bg-white border border-indigo-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                  <div className="flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Gemini 3.5 Flash</span>
                  </div>
                  <span className="font-mono text-indigo-600 font-bold">{(avgCloudLatency / 1000).toFixed(1)}s</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Deep policy clauses, cookie analysis, and data broker synthesis in the cloud.
                </div>
                <div className="w-full h-1.5 rounded-full bg-indigo-100 mt-2 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: "85%" }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
            Local Nano shields device data before cloud analysis.
          </div>
        </div>
      </div>
    </div>
  );
};
