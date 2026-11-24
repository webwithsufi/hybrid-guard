"use client";

import React, { useState } from "react";
import { Mail, Copy, Check, Download, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { DomainAudit } from "../types/audit";

interface DataRemovalCardProps {
  audit: DomainAudit;
}

export const DataRemovalCard: React.FC<DataRemovalCardProps> = ({ audit }) => {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Standard or generated GDPR/CCPA erasure letter
  const currentDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const defaultNotice = `Subject: Mandatory Request to Delete Personal Data (GDPR Art. 17 / CCPA § 1798.105)

Date: ${currentDate}
To: Privacy & Data Protection Team at ${audit.domain}

Hello,

I am writing to formally request the complete erasure of any personal data, search parameters, IP addresses, tracking identifiers, or account information collected by your systems associated with my visit to ${audit.domain}.

Under statutory data privacy rights (including the European GDPR Article 17 "Right to Erasure" and California CCPA/CPRA § 1798.105), you are required to permanently delete all personal data and confirm compliance in writing within 30 days.

Target Web Address: ${audit.targetUrl}

Please confirm via reply that all records, logs, and third-party shares have been permanently removed.

Sincerely,
Concerned Consumer (via HybridGuard Privacy Shield)`;

  const noticeText = audit.cloudAnalysis?.gdprCcpaNotice || defaultNotice;

  const handleCopyNotice = () => {
    navigator.clipboard.writeText(noticeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadNotice = () => {
    const blob = new Blob([noticeText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Data_Deletion_Request_${audit.domain.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Want this site to delete your data?
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-xl">
              Under privacy laws (GDPR & CCPA), websites are required to delete your personal info upon request. Copy this pre-written message and email it to the website&apos;s support team.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyNotice}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "✓ Copied to Clipboard!" : "Copy Request Email"}</span>
          </button>

          <button
            onClick={handleDownloadNotice}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            title="Download as .txt file"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* Collapsible preview */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <span>{showPreview ? "Hide Email Preview" : "Preview Email Message"}</span>
          {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showPreview && (
          <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
            {noticeText}
          </div>
        )}
      </div>
    </div>
  );
};
