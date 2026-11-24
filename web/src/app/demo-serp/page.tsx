"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Zap, Search } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

const SAMPLE_RESULTS = [
  {
    title: "PayPal Security Verification - Confirm Account Login",
    domain: "paypa1-security-verification.com",
    url: "https://paypa1-security-verification.com/login?session=928a&user_email=john.doe@gmail.com&q=paypal+fraud+recovery",
    snippet: "Urgent security update required: verify your password, account email, and debit card credentials immediately to prevent permanent account suspension.",
    riskLevel: "HIGH",
    reason: "Fake login page warning",
    latencyMs: 14
  },
  {
    title: "Chase Bank Security Center - Official Banking & Fraud Protection",
    domain: "www.chase.com",
    url: "https://www.chase.com/personal/security",
    snippet: "Explore how Chase safeguards your account with 24/7 fraud monitoring, encryption, and practical tips to keep your digital identity protected.",
    riskLevel: "LOW",
    reason: "Verified safe official website",
    latencyMs: 12
  },
  {
    title: "Apple ID Account Verification - Verify Suspended Access Now",
    domain: "appl3-id-security.site",
    url: "https://appl3-id-security.site/verify?q=apple+recovery&client_ip=192.168.1.105",
    snippet: "Your Apple ID has been temporarily locked due to unauthorized attempts. Provide your Apple ID password and security question answers now.",
    riskLevel: "HIGH",
    reason: "Deceptive scam website detected",
    latencyMs: 16
  },
  {
    title: "Amazon Prime Customer Refund Portal - Claim Delayed Shipment Credit",
    domain: "amaz0n-prime-customer-refund.top",
    url: "https://amaz0n-prime-customer-refund.top/auth?ref=deal&user=victim@work.org",
    snippet: "Exclusive instant refund payout for prime members. Submit your credit card details and social security number to deposit your approved rebate.",
    riskLevel: "HIGH",
    reason: "Dangerous account credential trap",
    latencyMs: 18
  }
];

export default function DemoSerpPage() {
  const [inspectingIdx, setInspectingIdx] = useState<number | null>(null);

  const handleSimulateInspect = async (item: typeof SAMPLE_RESULTS[0], idx: number) => {
    setInspectingIdx(idx);

    try {
      const docRef = await addDoc(collection(db, "domain_audits"), {
        domain: item.domain,
        targetUrl: item.url.replace(/[?&](q|user_email|user)=[^&]+/g, "$1=[REDACTED]"),
        rawUrl: item.url,
        title: item.title,
        snippet: item.snippet,
        riskLevel: item.riskLevel,
        reason: item.reason,
        inferenceSource: "ON_DEVICE",
        onDeviceLatencyMs: item.latencyMs,
        piiScrubLatencyMs: 8,
        totalLocalLatencyMs: item.latencyMs + 8,
        scannedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
        rawSnippet: `Simulated browser fetch for ${item.domain}. Capturing query parameters: ${item.url}. Content snippet: ${item.snippet}`,
        scrubbedContent: `Simulated browser fetch for ${item.domain}. Capturing query parameters: ${item.url.replace(/[?&](q|user_email|user)=[^&]+/g, "$1=[REDACTED]")}. Content snippet: ${item.snippet}`,
        piiRemoved: ["Query Parameter (q)", "User Email Identifier"],
        piiCount: 2,
        zeroPiiVerified: true,
        status: "AUDITED_LOCAL",
        cloudAnalysis: null
      });

      window.location.href = `/?auditId=${docRef.id}`;
    } catch (err) {
      console.error(err);
      setInspectingIdx(null);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Search Header */}
      <header className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <Link href="/" className="flex items-center gap-2 text-indigo-600 font-bold text-lg hover:underline">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-blue-600 font-black">Google</span>
          </Link>
          <div className="relative flex-1">
            <input
              type="text"
              value="urgent bank account security verification"
              readOnly
              className="w-full bg-white border border-slate-300 rounded-full px-4 py-2 text-sm shadow-sm font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-4 top-3" />
          </div>
        </div>

        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Back to Safety Report</span>
        </Link>
      </header>

      {/* Main SERP Results */}
      <main className="max-w-3xl ml-24 py-6 px-4">
        <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs">
          <strong>Search Result Simulator:</strong> Notice how pre-click safety pills appear before you visit a site. Click <strong>&quot;Check Safely →&quot;</strong> on any result to remove personal details and view the full privacy report.
        </div>

        <div className="text-xs text-slate-500 mb-6">About 14,200,000 results (0.38 seconds)</div>

        <div className="space-y-8">
          {SAMPLE_RESULTS.map((item, idx) => (
            <div key={idx} className="g border-b border-slate-100 pb-6">
              <div className="text-xs text-slate-600 mb-1 flex items-center gap-2">
                <span className="font-mono text-slate-700">{item.domain} &rsaquo; auth</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg text-blue-800 hover:underline cursor-pointer font-medium">
                  {item.title}
                </h3>

                {/* Friendly Safety Pill */}
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      item.riskLevel === "HIGH"
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {item.riskLevel === "HIGH" ? "🚨 Likely Scam" : "✅ Safe Site"}
                  </span>
                  <span className="text-[11px] font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                    {item.reason}
                  </span>
                  <span className="text-[10.5px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                    🔒 Checked on your device ({item.latencyMs}ms)
                  </span>

                  <button
                    onClick={() => handleSimulateInspect(item, idx)}
                    disabled={inspectingIdx === idx}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold cursor-pointer shadow-sm transition-all"
                  >
                    <span>{inspectingIdx === idx ? "Checking Safely..." : "Check Safely →"}</span>
                  </button>
                </span>
              </div>

              <div className="text-sm text-slate-600 mt-2 leading-relaxed max-w-2xl">
                {item.snippet}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
