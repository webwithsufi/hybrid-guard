import React, { useState, useEffect } from "react";
import { Shield, Zap, ExternalLink, Lock, Eye, FileText, Cookie, Camera, MapPin, Clipboard, Bell, CheckCircle2 } from "lucide-react";
import { scanSerpResultOnDevice } from "../lib/onDeviceFirewall";

interface SiteSettings {
  blockCameraMic: boolean;
  blockLocation: boolean;
  blockClipboard: boolean;
  warnCookies: boolean;
}

const DEFAULT_SETTINGS: SiteSettings = {
  blockCameraMic: true,
  blockLocation: true,
  blockClipboard: true,
  warnCookies: true
};

const PRESET_DOMAINS = [
  {
    title: "PayPal Security Resolution - Identity Check",
    url: "https://paypa1-secure-verification.com/login?session=928a&user_email=john.doe@gmail.com",
    snippet: "Urgent security update required: verify your password and debit card credentials immediately to prevent account suspension."
  },
  {
    title: "Chase Bank Security Center - Official Banking & Fraud Protection",
    url: "https://www.chase.com/personal/security",
    snippet: "Explore how Chase safeguards your account with 24/7 fraud monitoring, encryption, and practical tips to keep your digital identity protected."
  },
  {
    title: "Wikipedia: Online Privacy and Information Security",
    url: "https://en.wikipedia.org/wiki/Information_privacy",
    snippet: "Information privacy is the relationship between the collection and dissemination of data, technology, and public expectations of privacy."
  }
];

export const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"controls" | "test">("controls");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [isAuditingPolicy, setIsAuditingPolicy] = useState(false);
  const [currentTabInfo, setCurrentTabInfo] = useState<{ id?: number; url: string; title: string; domain: string } | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [savedNotice, setSavedNotice] = useState(false);
  const [hasCustomOverride, setHasCustomOverride] = useState(false);

  useEffect(() => {
    try {
      if (typeof chrome !== "undefined" && chrome.tabs?.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          if (tabs && tabs[0]?.url) {
            const url = tabs[0].url;
            try {
              const parsed = new URL(url);
              if (parsed.protocol.startsWith("http")) {
                const domain = parsed.hostname.toLowerCase();
                const tabInfo = {
                  id: tabs[0].id,
                  url,
                  title: tabs[0].title || domain,
                  domain
                };
                setCurrentTabInfo(tabInfo);

                // Load stored global rules & per-site overrides
                const globalData = await chrome.storage.local.get("hg_global_shield_rules");
                const gRules = globalData.hg_global_shield_rules || DEFAULT_SETTINGS;

                const key = `hg_site_settings_${domain}`;
                const data = await chrome.storage.local.get(key);
                if (data[key]) {
                  setSiteSettings({ ...DEFAULT_SETTINGS, ...data[key] });
                  setHasCustomOverride(true);
                } else {
                  setSiteSettings({
                    blockCameraMic: gRules.blockCameraMic !== undefined ? gRules.blockCameraMic : true,
                    blockLocation: gRules.blockLocation !== undefined ? gRules.blockLocation : true,
                    blockClipboard: gRules.blockClipboard !== undefined ? gRules.blockClipboard : true,
                    warnCookies: gRules.warnCookies !== undefined ? gRules.warnCookies : true
                  });
                  setHasCustomOverride(false);
                }
              }
            } catch {
              // ignore
            }
          }
        });
      }
    } catch (e) {
      console.warn("Could not query active tab:", e);
    }
  }, []);

  const handleToggleSetting = async (key: keyof SiteSettings) => {
    if (!currentTabInfo) return;
    const newSettings = {
      ...siteSettings,
      [key]: !siteSettings[key]
    };
    setSiteSettings(newSettings);
    setHasCustomOverride(true);

    const storageKey = `hg_site_settings_${currentTabInfo.domain}`;
    await chrome.storage.local.set({ [storageKey]: newSettings });

    // Notify the active tab content script
    if (currentTabInfo.id) {
      try {
        chrome.tabs.sendMessage(currentTabInfo.id, {
          type: "SITE_SETTINGS_UPDATED",
          payload: newSettings
        });
      } catch (err) {
        // Tab might be restricted or unloaded
      }
    }

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleReadCurrentTabPolicy = async () => {
    if (!currentTabInfo) return;
    setIsAuditingPolicy(true);

    try {
      chrome.runtime.sendMessage(
        {
          type: "ANALYZE_PRIVACY_POLICY",
          payload: {
            pageUrl: currentTabInfo.url,
            policyUrl: `${new URL(currentTabInfo.url).origin}/privacy`,
            title: currentTabInfo.title,
            detectedCookies: {
              hasBanner: true,
              advice: "🍪 Choose 'Essential Only' to protect your identity from ad brokers."
            },
            detectedPermissions: []
          }
        },
        () => {
          setIsAuditingPolicy(false);
        }
      );
    } catch (err) {
      console.error("Policy audit trigger error:", err);
      setIsAuditingPolicy(false);
    }
  };

  const handleTestScan = async (item: { title: string; url: string; snippet: string }) => {
    setIsScanning(true);
    setScanResult(null);

    try {
      const res = await scanSerpResultOnDevice(item);
      setScanResult({
        ...res,
        ...item
      });
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  const openWebHud = () => {
    chrome.tabs.create({ url: "http://localhost:3000" });
  };

  return (
    <div style={{ width: 360, padding: 18, fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif", background: "#ffffff", color: "#0f172a", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(79, 70, 229, 0.25)" }}>
            <Shield style={{ width: 18, height: 18, color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>HybridGuard</h1>
            <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Privacy Policy &amp; Security Shield</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#ecfdf5", color: "#047857", padding: "4px 9px", borderRadius: 9999, fontSize: 11, fontWeight: 600, border: "1px solid #a7f3d0" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
          Shield Active
        </div>
      </div>

      {/* Navigation tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: 14 }}>
        <button
          onClick={() => setActiveTab("controls")}
          style={{
            flex: 1,
            padding: "7px 0",
            background: "none",
            border: "none",
            borderBottom: activeTab === "controls" ? "2px solid #4f46e5" : "none",
            color: activeTab === "controls" ? "#4f46e5" : "#64748b",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer"
          }}
        >
          Site Shield Controls
        </button>
        <button
          onClick={() => setActiveTab("test")}
          style={{
            flex: 1,
            padding: "7px 0",
            background: "none",
            border: "none",
            borderBottom: activeTab === "test" ? "2px solid #4f46e5" : "none",
            color: activeTab === "test" ? "#4f46e5" : "#64748b",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer"
          }}
        >
          Sample Check
        </button>
      </div>

      {activeTab === "controls" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Active Domain Info */}
          {currentTabInfo ? (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Domain</span>
                {savedNotice && (
                  <span style={{ fontSize: 10.5, color: "#047857", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle2 style={{ width: 12, height: 12 }} />
                    Saved
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", wordBreak: "break-all" }}>
                {currentTabInfo.domain}
              </div>
            </div>
          ) : (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, fontSize: 12, color: "#64748b" }}>
              Navigate to any website to configure its hardware sensor firewall and cookie alerts.
            </div>
          )}

          {/* Global Protection Banner */}
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a", display: "inline-block" }}></span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#166534" }}>
                {hasCustomOverride ? "Custom Site Overrides Active" : "Inheriting Global Rules (All Sites)"}
              </span>
            </div>
            <button
              onClick={openWebHud}
              style={{ fontSize: 10.5, color: "#4f46e5", fontWeight: 600, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Dashboard →
            </button>
          </div>

          {/* 4 Clean Per-Site Toggle Switches */}
          {currentTabInfo && (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "8px 12px", display: "flex", flexDirection: "column" }}>
              {/* Toggle 1: Camera & Mic */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Camera style={{ width: 15, height: 15, color: siteSettings.blockCameraMic ? "#e11d48" : "#94a3b8" }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>Block Camera &amp; Mic</div>
                    <div style={{ fontSize: 10.5, color: "#64748b" }}>Rejects getUserMedia by default</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={siteSettings.blockCameraMic}
                  onChange={() => handleToggleSetting("blockCameraMic")}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#4f46e5" }}
                />
              </div>

              {/* Toggle 2: GPS Location */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MapPin style={{ width: 15, height: 15, color: siteSettings.blockLocation ? "#e11d48" : "#94a3b8" }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>Block GPS Location</div>
                    <div style={{ fontSize: 10.5, color: "#64748b" }}>Blocks geolocation tracking</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={siteSettings.blockLocation}
                  onChange={() => handleToggleSetting("blockLocation")}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#4f46e5" }}
                />
              </div>

              {/* Toggle 3: Clipboard Snooping */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Clipboard style={{ width: 15, height: 15, color: siteSettings.blockClipboard ? "#e11d48" : "#94a3b8" }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>Block Clipboard Snooping</div>
                    <div style={{ fontSize: 10.5, color: "#64748b" }}>Blocks unauthorized copy-paste reads</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={siteSettings.blockClipboard}
                  onChange={() => handleToggleSetting("blockClipboard")}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#4f46e5" }}
                />
              </div>

              {/* Toggle 4: Auto-Warn on Cookie Popups */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Cookie style={{ width: 15, height: 15, color: siteSettings.warnCookies ? "#d97706" : "#94a3b8" }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>Auto-Warn on Cookie Popups</div>
                    <div style={{ fontSize: 10.5, color: "#64748b" }}>Dark pattern detection &amp; auto-reject</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={siteSettings.warnCookies}
                  onChange={() => handleToggleSetting("warnCookies")}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#4f46e5" }}
                />
              </div>
            </div>
          )}

          {/* 1-Click Privacy Policy Audit for Current Tab */}
          {currentTabInfo && (
            <button
              onClick={handleReadCurrentTabPolicy}
              disabled={isAuditingPolicy}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "9px 12px",
                background: "#f1f5f9",
                color: "#1e293b",
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.15s ease"
              }}
            >
              <FileText style={{ width: 14, height: 14, color: "#4f46e5" }} />
              <span>{isAuditingPolicy ? "Scrubbing & Analyzing Policy..." : "Read Privacy Policy & Cookie Report →"}</span>
            </button>
          )}

          {/* Open Main Web Dashboard */}
          <button
            onClick={openWebHud}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 14px",
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(79, 70, 229, 0.25)"
            }}
          >
            <span>Open Security &amp; Privacy Analytics</span>
            <ExternalLink style={{ width: 13, height: 13 }} />
          </button>
        </div>
      ) : (
        <div>
          <p style={{ margin: "0 0 10px 0", fontSize: 11.5, color: "#64748b" }}>
            Test on-device safety scoring with Gemini Nano:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {PRESET_DOMAINS.map((item, i) => (
              <button
                key={i}
                onClick={() => handleTestScan(item)}
                disabled={isScanning}
                style={{
                  textAlign: "left",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: "9px 11px",
                  borderRadius: 8,
                  cursor: "pointer",
                  color: "#1e293b"
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 600, color: i === 0 ? "#b91c1c" : "#047857" }}>
                  {item.title.slice(0, 42)}...
                </div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                  {new URL(item.url).hostname}
                </div>
              </button>
            ))}
          </div>

          {isScanning && (
            <div style={{ padding: 12, textAlign: "center", background: "#f8fafc", borderRadius: 8, fontSize: 11.5, color: "#4f46e5", fontWeight: 500 }}>
              Checking site safety on device...
            </div>
          )}

          {scanResult && !isScanning && (
            <div style={{ background: "#f8fafc", padding: 11, borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span
                  style={{
                    padding: "3px 9px",
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: scanResult.riskLevel === "HIGH" ? "#fef2f2" : "#ecfdf5",
                    color: scanResult.riskLevel === "HIGH" ? "#b91c1c" : "#047857",
                    border: `1px solid ${scanResult.riskLevel === "HIGH" ? "#fecaca" : "#a7f3d0"}`
                  }}
                >
                  {scanResult.riskLevel === "HIGH" ? "🚨 Likely Scam" : "✅ Safe Site"}
                </span>
                <span style={{ fontSize: 10.5, color: "#047857", fontWeight: 500 }}>
                  🔒 {scanResult.latencyMs}ms on device
                </span>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                {scanResult.reason}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
                {scanResult.details}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
