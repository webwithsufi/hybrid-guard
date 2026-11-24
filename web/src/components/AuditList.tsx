"use client";

import React, { useState } from "react";
import { Search, Globe, ChevronRight, FileText, Trash2, ShieldAlert } from "lucide-react";
import { DomainAudit } from "../types/audit";

interface AuditListProps {
  audits: DomainAudit[];
  selectedAuditId: string | null;
  onSelectAudit: (audit: DomainAudit) => void;
  onClearHistory: () => void;
}

const LEGACY_DUMMY_DOMAINS = [
  "seed_1",
  "seed_2",
  "seed_3",
  "paypa1-security-verification.com",
  "appl3-id-security.site",
  "amaz0n-security-update.click",
  "microsoft-365-pass-reset.work",
  "chase.com"
];

export const AuditList: React.FC<AuditListProps> = ({
  audits,
  selectedAuditId,
  onSelectAudit,
  onClearHistory
}) => {
  const [filter, setFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter out any legacy dummy seed documents completely
  const realAudits = audits.filter(
    (a) => !LEGACY_DUMMY_DOMAINS.includes(a.domain.toLowerCase()) && !a.id.startsWith("seed_")
  );

  const filtered = realAudits.filter((a) => {
    if (filter !== "ALL" && a.riskLevel !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.domain.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col h-full no-print">
      {/* Header & Clear History */}
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Audited Websites</span>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {filtered.length}
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">Select a website to review</p>
        </div>

        {realAudits.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-medium border border-rose-200 transition-colors cursor-pointer"
            title="Clear all saved audit history"
          >
            <Trash2 className="w-3 h-3 text-rose-600" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filter audited domains..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
        />
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl mb-3 text-xs border border-slate-200/60">
        {(
          [
            { id: "ALL", label: "All" },
            { id: "HIGH", label: "Scams" },
            { id: "MEDIUM", label: "Caution" },
            { id: "LOW", label: "Safe" }
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`py-1 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
              filter === tab.id
                ? "bg-white text-slate-900 shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Audit Items List */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[580px] pr-0.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 space-y-2">
            <Globe className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
            <p className="text-xs font-semibold text-slate-700">No Audited Websites Yet</p>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
              Browse any site with HybridGuard extension or paste a link above to analyze privacy policies.
            </p>
          </div>
        ) : (
          filtered.map((audit) => {
            const isSelected = audit.id === selectedAuditId;
            const isHigh = audit.riskLevel === "HIGH";
            const isMed = audit.riskLevel === "MEDIUM";
            const grade = audit.cloudAnalysis?.grade || (isHigh ? "F" : isMed ? "C" : "A");

            let gradeBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
            if (grade === "B") gradeBadge = "bg-indigo-50 text-indigo-700 border-indigo-200";
            else if (grade === "C") gradeBadge = "bg-amber-50 text-amber-700 border-amber-200";
            else if (grade === "D" || grade === "F") gradeBadge = "bg-rose-50 text-rose-700 border-rose-200";

            return (
              <div
                key={audit.id}
                onClick={() => onSelectAudit(audit)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left select-none ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="font-semibold text-xs text-slate-900 truncate">
                    {audit.domain}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${gradeBadge}`}>
                    Grade {grade}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                  {audit.cloudAnalysis?.summary || audit.reason || audit.snippet}
                </p>

                <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-1 border-t border-slate-100">
                  <span className="font-mono">
                    {new Date(audit.scannedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                  <div className="flex items-center gap-1.5 font-medium text-indigo-600">
                    <span>View Report</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
