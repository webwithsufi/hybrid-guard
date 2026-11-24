"use client";

import React, { useState, useEffect } from "react";
import {
  Camera,
  MapPin,
  Clipboard,
  Cookie,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Radio
} from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface GlobalShieldRules {
  blockCameraMic: boolean;
  blockLocation: boolean;
  blockClipboard: boolean;
  warnCookies: boolean;
  blockScamsOnSearch: boolean;
}

export const DEFAULT_GLOBAL_RULES: GlobalShieldRules = {
  blockCameraMic: true,
  blockLocation: true,
  blockClipboard: true,
  warnCookies: true,
  blockScamsOnSearch: true
};

const STORAGE_KEY = "hg_global_rules";

export const GlobalShieldControls: React.FC = () => {
  const [rules, setRules] = useState<GlobalShieldRules>(DEFAULT_GLOBAL_RULES);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<string | null>(null);

  // 1. Initialize from localStorage and Firestore doc settings/global_shield
  useEffect(() => {
    // Read local cache
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setRules((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }

    // Read Firestore doc
    const loadFirestoreSettings = async () => {
      try {
        const docRef = doc(db, "settings", "global_shield");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as Partial<GlobalShieldRules>;
          setRules((prev) => {
            const merged = { ...prev, ...data };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch (err) {
        console.warn("[HybridGuard] Firestore global settings read notice:", err);
      }
    };
    loadFirestoreSettings();

    // 2. Request initial sync from content-bridge
    if (typeof window !== "undefined") {
      window.postMessage({ type: "HYBRIDGUARD_REQUEST_GLOBAL_RULES" }, "*");
    }

    // 3. Listen for sync replies from content-bridge
    const handleBridgeMessage = (event: MessageEvent) => {
      if (event.data?.type === "HYBRIDGUARD_SYNC_GLOBAL_RULES" && event.data.rules) {
        setExtensionConnected(true);
        setRules((prev) => ({ ...prev, ...event.data.rules }));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(event.data.rules));
        } catch {}
        setLastSyncStatus("Synced with Extension");
      }
    };

    window.addEventListener("message", handleBridgeMessage);
    return () => window.removeEventListener("message", handleBridgeMessage);
  }, []);

  // Broadcast and persist changes
  const updateRules = async (newRules: GlobalShieldRules) => {
    setRules(newRules);

    // Persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRules));
    } catch {}

    // Broadcast to extension content-bridge
    if (typeof window !== "undefined") {
      window.postMessage(
        {
          type: "HYBRIDGUARD_UPDATE_GLOBAL_RULES",
          rules: newRules
        },
        "*"
      );
    }

    // Persist to Firestore settings/global_shield
    try {
      const docRef = doc(db, "settings", "global_shield");
      await setDoc(docRef, { ...newRules, updatedAt: serverTimestamp() }, { merge: true });
      setLastSyncStatus("Saved to Extension & Cloud");
    } catch (err) {
      setLastSyncStatus("Saved locally & sent to Extension");
    }

    setTimeout(() => setLastSyncStatus(null), 3000);
  };

  const handleToggle = (key: keyof GlobalShieldRules) => {
    const updated = {
      ...rules,
      [key]: !rules[key]
    };
    updateRules(updated);
  };

  const handleResetDefaults = () => {
    updateRules(DEFAULT_GLOBAL_RULES);
  };

  const activeCount = Object.values(rules).filter(Boolean).length;

  const controlItems = [
    {
      key: "blockCameraMic" as const,
      title: "Block Camera & Microphone",
      desc: "Intercepts navigator.mediaDevices.getUserMedia across all websites before scripts run",
      icon: Camera,
      iconColor: "text-rose-600 bg-rose-50 border-rose-100"
    },
    {
      key: "blockLocation" as const,
      title: "Block GPS Location Tracking",
      desc: "Denies navigator.geolocation coordinates and prevents background physical location telemetry",
      icon: MapPin,
      iconColor: "text-amber-600 bg-amber-50 border-amber-100"
    },
    {
      key: "blockClipboard" as const,
      title: "Block Clipboard Snooping",
      desc: "Stops unauthorized navigator.clipboard.readText from reading copied passwords or sensitive text",
      icon: Clipboard,
      iconColor: "text-indigo-600 bg-indigo-50 border-indigo-100"
    },
    {
      key: "warnCookies" as const,
      title: "Cookie Banner & Dark-Pattern Advisor",
      desc: "Detects cookie dialogs and dark patterns, providing 1-click Auto-Reject and plain-English advice",
      icon: Cookie,
      iconColor: "text-amber-600 bg-amber-50 border-amber-100"
    },
    {
      key: "blockScamsOnSearch" as const,
      title: "Block High-Risk Scam Sites on Search",
      desc: "Intercepts clicks on Google Search results flagged as high-risk phishing or lookalike traps",
      icon: ShieldAlert,
      iconColor: "text-rose-600 bg-rose-50 border-rose-100"
    }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">
                Global Protection Rules (All Websites)
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activeCount} of 5 Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Default hardware sensor firewall, clipboard protection, and search scam blocking enforced on all domains.
            </p>
          </div>
        </div>

        {/* Extension Connection & Sync Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              extensionConnected
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-slate-50 text-slate-700 border-slate-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                extensionConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
            <span>{extensionConnected ? "Extension Synced" : "Extension Ready"}</span>
          </div>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
            title="Reset to recommended security rules"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="divide-y divide-slate-100">
        {controlItems.map((item) => {
          const isEnabled = rules[item.key];
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/50 -mx-2 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${item.iconColor}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-slate-900">
                      {item.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isEnabled
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {isEnabled ? "Active Globally" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>

              {/* iOS / Tailwind Toggle Switch */}
              <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  onClick={() => handleToggle(item.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                    isEnabled ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sync Status Banner */}
      {lastSyncStatus && (
        <div className="mt-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{lastSyncStatus}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-mono">Real-time broadcast</span>
        </div>
      )}
    </div>
  );
};
