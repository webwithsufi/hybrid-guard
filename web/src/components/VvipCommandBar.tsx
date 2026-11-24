"use client";

import React from "react";
import { Shield, Cloud, Globe, ExternalLink, Lock, EyeOff } from "lucide-react";
import Link from "next/link";
import { DomainAudit } from "../types/audit";

interface VvipCommandBarProps {
  audits: DomainAudit[];
}

export const VvipCommandBar: React.FC<VvipCommandBarProps> = ({ audits }) => {
  const totalAudits = audits.length;

  // Sum all blocked permissions recorded across audits
  const totalBlockedPermissions = audits.reduce((acc, a) => {
    return acc + (a.blockedPermissions ? a.blockedPermissions.length : 0);
  }, 0);

  // Total PII items scrubbed
  const totalPiiShielded = audits.reduce((acc, a) => {
    return acc + (a.piiCount || (a.piiRemoved ? a.piiRemoved.length : 0));
  }, 0);

  return (
    <div className="w-full space-y-4 no-print">
      {/* Top SaaS Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base tracking-tight text-slate-900 leading-none">
                  HybridGuard
                </h1>
                <span className="text-slate-400 font-normal text-sm hidden sm:inline">&bull;</span>
                <span className="font-semibold text-xs sm:text-sm text-slate-700 tracking-tight hidden sm:inline">
                  Website Privacy &amp; Security Analytics
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5 font-normal">
                On-device sensor firewall, dark-pattern detection &amp; plain-English privacy breakdown
              </p>
            </div>
          </div>

          {/* Engine Status Pills & Simulator Link */}
          <div className="flex items-center gap-2.5 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>On-Device Nano Shield Active</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
              <Cloud className="w-3.5 h-3.5 text-indigo-600" />
              <span>Cloud 3.5 Flash Ready</span>
            </div>

            <Link
              href="/demo-serp"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors border border-slate-200 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>Search Simulator</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>
          </div>
        </div>
      </header>

      {/* 3 Crisp SaaS KPI Counters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* KPI 1: Websites Audited */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
                Websites Audited
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">
                {totalAudits}
              </div>
              <span className="text-[11.5px] text-slate-500">
                {totalAudits > 0 ? "Real-time policy assessments" : "Awaiting first domain audit"}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Globe className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 2: Device Permissions Blocked */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
                Permissions Blocked
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">
                {totalBlockedPermissions}
              </div>
              <span className="text-[11.5px] text-slate-500">
                Camera, GPS, mic &amp; clipboard snooping
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Lock className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 3: Zero-PII Masked */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
                Zero-PII Guarantee
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight flex items-center gap-1.5">
                <span>100%</span>
                <span className="text-xs font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {totalPiiShielded} Tokens Masked
                </span>
              </div>
              <span className="text-[11.5px] text-slate-500">
                Pre-scrubbed in &lt;5ms before cloud evaluation
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <EyeOff className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
