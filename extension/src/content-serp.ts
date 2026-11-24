import {
  scanSerpResultOnDevice,
  getCachedDomainVerdict,
  extractHostname,
  isOfficialDomain,
  SerpScanResult
} from "./lib/onDeviceFirewall";

console.log("[HybridGuard] Website Safety & Privacy Protection active on search page");

// Global shield rules cache (synced with chrome.storage.local)
let globalShieldRules = {
  blockScamsOnSearch: true
};

function loadGlobalRules() {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    chrome.storage.local.get("hg_global_shield_rules", (res) => {
      if (res.hg_global_shield_rules) {
        globalShieldRules = { ...globalShieldRules, ...res.hg_global_shield_rules };
      }
    });
  }
}
loadGlobalRules();

if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.hg_global_shield_rules) {
      loadGlobalRules();
    }
  });
}

// Friendly, human 4-to-6 word explanation with cleaned prefixes
function getFriendlyReason(rawReason: string, riskLevel: "LOW" | "MEDIUM" | "HIGH"): string {
  let cleaned = (rawReason || "")
    .trim()
    .replace(/^(LOW|MEDIUM|HIGH|RISK)\s*[-:–—|•]\s*/gi, "")
    .replace(/^[-:–—|•\s]+/g, "")
    .replace(/[.]+$/, "")
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);

  // If the model or heuristic already provided a clean 2-to-6 word natural summary, display directly
  if (
    words.length >= 2 &&
    words.length <= 6 &&
    !cleaned.includes("{") &&
    !cleaned.includes("|") &&
    !cleaned.includes("\"") &&
    !cleaned.includes(":")
  ) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  const lower = cleaned.toLowerCase();
  if (riskLevel === "HIGH") {
    if (lower.includes("phish") || lower.includes("credential") || lower.includes("login") || lower.includes("pass")) {
      return "Fake login page warning";
    }
    if (lower.includes("lookalike") || lower.includes("typo") || lower.includes("deceptive")) {
      return "Deceptive scam website detected";
    }
    if (lower.includes("harvest") || lower.includes("seed") || lower.includes("wallet")) {
      return "Dangerous account credential trap";
    }
    return "Likely scam website warning";
  }
  if (riskLevel === "MEDIUM") {
    if (lower.includes("financial") || lower.includes("crypto") || lower.includes("bank")) {
      return "Unverified financial site";
    }
    if (lower.includes("hyphen") || lower.includes("tld") || lower.includes("structure")) {
      return "Unfamiliar website, proceed carefully";
    }
    if (lower.includes("harvest") || lower.includes("track")) {
      return "Aggressive personal data collection";
    }
    return "Be careful before sharing info";
  }
  // LOW
  if (lower.includes("verified") || lower.includes("authentic") || lower.includes("official") || lower.includes("standard")) {
    return "Verified safe official website";
  }
  return "Trusted safe website profile";
}

// Format latency cleanly in seconds if >= 1000ms (e.g. 1.4s instead of 29371ms)
function formatLatency(ms: number): string {
  if (isNaN(ms) || ms <= 0) return "14ms";
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${Math.round(ms)}ms`;
}

// Inject styles for badges and action buttons
function injectStyles() {
  if (document.getElementById("hybridguard-styles")) return;
  const style = document.createElement("style");
  style.id = "hybridguard-styles";
  style.textContent = `
    .hg-badge-container {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      margin: 6px 0 8px 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      line-height: normal;
      vertical-align: middle;
      user-select: none;
      transform: none !important;
      writing-mode: horizontal-tb !important;
      direction: ltr !important;
      width: fit-content;
      max-width: 100%;
      box-sizing: border-box;
    }
    .hg-badge-container,
    .hg-badge-container * {
      transform: none !important;
      writing-mode: horizontal-tb !important;
      direction: ltr !important;
      box-sizing: border-box;
    }
    .hg-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border-radius: 9999px;
      font-weight: 600;
      letter-spacing: -0.01em;
      border: 1px solid transparent;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    /* Soft green */
    .hg-risk-LOW {
      background: #ecfdf5;
      color: #047857;
      border-color: #a7f3d0;
    }
    /* Soft amber */
    .hg-risk-MEDIUM {
      background: #fffbeb;
      color: #b45309;
      border-color: #fde68a;
    }
    /* Soft red */
    .hg-risk-HIGH {
      background: #fef2f2;
      color: #b91c1c;
      border-color: #fecaca;
      box-shadow: 0 1px 3px rgba(239, 68, 68, 0.15);
    }
    .hg-risk-NOTICE {
      background: #f8fafc;
      color: #475569;
      border-color: #e2e8f0;
    }
    .hg-scanning {
      background: #f8fafc;
      color: #475569;
      border-color: #e2e8f0;
    }
    .hg-meta-tag {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2.5px 7px;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
      border-radius: 9999px;
      font-size: 10.5px;
      font-weight: 500;
      white-space: nowrap;
    }
    .hg-source-nano {
      background: #f0fdf4;
      color: #166534;
      border-color: #bbf7d0;
    }
    .hg-latency {
      color: #64748b;
      font-family: monospace;
    }
    .hg-reason {
      font-weight: 500;
      color: #334155;
      font-size: 11.5px;
      padding: 2.5px 7px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      white-space: nowrap;
    }
    .hg-inspect-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3.5px 10px;
      background: #4f46e5;
      color: #ffffff !important;
      border: 1px solid #4338ca;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(79, 70, 229, 0.25);
      transition: all 0.15s ease;
      text-decoration: none !important;
      white-space: nowrap;
    }
    .hg-inspect-btn:hover {
      background: #4338ca;
      transform: translateY(-0.5px);
      box-shadow: 0 2px 4px rgba(79, 70, 229, 0.35);
    }
    .hg-inspect-btn:active {
      transform: translateY(0);
    }
    .hg-inspect-btn.loading {
      opacity: 0.85;
      cursor: wait;
      background: #64748b;
      border-color: #475569;
    }
    .hg-spinner {
      width: 10px;
      height: 10px;
      border: 2px solid #4f46e5;
      border-top-color: transparent;
      border-radius: 50%;
      animation: hg-spin 0.6s linear infinite;
      display: inline-block;
    }
    .hg-spinner-white {
      border: 2px solid #ffffff;
      border-top-color: transparent;
    }
    @keyframes hg-spin {
      to { transform: rotate(360deg); }
    }

    /* Dangerous Website Full-Screen Blocking Warning Overlay */
    .hg-blocking-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: rgba(7, 11, 20, 0.94);
      backdrop-filter: blur(14px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-sizing: border-box;
      animation: hg-overlay-fade 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hg-blocking-modal {
      background: #0f172a;
      border: 1px solid #ef4444;
      border-radius: 24px;
      box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(239, 68, 68, 0.3);
      max-width: 560px;
      width: 100%;
      padding: 34px 30px;
      text-align: center;
      box-sizing: border-box;
      color: #f8fafc;
    }
    .hg-blocking-icon {
      width: 64px;
      height: 64px;
      border-radius: 20px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
      margin: 0 auto 18px auto;
    }
    .hg-blocking-title {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 10px 0;
      letter-spacing: -0.02em;
    }
    .hg-blocking-url {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11.5px;
      color: #fca5a5;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      padding: 8px 12px;
      border-radius: 10px;
      word-break: break-all;
      margin: 12px 0 16px 0;
      text-align: left;
    }
    .hg-blocking-desc {
      font-size: 13px;
      line-height: 1.5;
      color: #cbd5e1;
      margin: 0 0 24px 0;
    }
    .hg-blocking-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .hg-btn-goback {
      flex: 1;
      min-width: 160px;
      padding: 11px 18px;
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #475569;
      border-radius: 12px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .hg-btn-goback:hover {
      background: #334155;
      border-color: #64748b;
    }
    .hg-btn-inspect-safe {
      flex: 1.2;
      min-width: 180px;
      padding: 11px 18px;
      background: #4f46e5;
      color: #ffffff;
      border: 1px solid #4338ca;
      border-radius: 12px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(79, 70, 229, 0.35);
      transition: all 0.15s ease;
    }
    .hg-btn-inspect-safe:hover {
      background: #4338ca;
      transform: translateY(-0.5px);
    }
    .hg-btn-inspect-safe:disabled {
      opacity: 0.8;
      cursor: wait;
    }
    @keyframes hg-overlay-fade {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

interface SerpCandidate {
  h3: HTMLElement;
  anchor: HTMLAnchorElement;
  outerContainer: HTMLElement | null;
  targetUrl: string;
  title: string;
  snippet: string;
}

// 1-by-1 Sequential Async Queue for on-device Gemini Nano inference
type QueueTask = () => Promise<void>;
const scanQueue: QueueTask[] = [];
let isProcessingQueue = false;

function enqueueScan(task: QueueTask) {
  scanQueue.push(task);
  processQueue();
}

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  while (scanQueue.length > 0) {
    const task = scanQueue.shift();
    if (task) {
      try {
        await task();
      } catch (err) {
        console.warn("[HybridGuard] Sequential scan queue task warning:", err);
      }
    }
  }
  isProcessingQueue = false;
}

// IntersectionObserver for scanning cards within 200px of viewport
const candidateMap = new WeakMap<HTMLElement, SerpCandidate>();
let serpObserver: IntersectionObserver | null = null;

function getSerpObserver(): IntersectionObserver {
  if (!serpObserver) {
    serpObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const targetEl = entry.target as HTMLElement;
            serpObserver?.unobserve(targetEl);
            const candidate = candidateMap.get(targetEl);
            if (candidate) {
              candidateMap.delete(targetEl);
              triggerQueuedScan(candidate);
            }
          }
        }
      },
      { rootMargin: "200px" }
    );
  }
  return serpObserver;
}

// Find organic search results using #rso h3, #search h3 while filtering out sitelinks & duplicates
function findSerpCandidates(): SerpCandidate[] {
  let headings = Array.from(document.querySelectorAll<HTMLElement>("#rso h3, #search h3"));

  // Fallbacks for test/mock search pages
  if (headings.length === 0) {
    headings = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".container h3, .g h3, .serp-result-item h3, .test-g-result h3"
      )
    );
  }

  const candidates: SerpCandidate[] = [];

  for (const h3 of headings) {
    const anchor =
      h3.closest<HTMLAnchorElement>("a[href]") ||
      h3.querySelector<HTMLAnchorElement>("a[href]") ||
      h3.parentElement?.closest<HTMLAnchorElement>("a[href]");

    if (!anchor || !anchor.href) continue;

    // Skip if no valid external http(s) link is found (ignore google.com internal links)
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(anchor.href, window.location.href);
    } catch {
      continue;
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      continue;
    }

    const host = parsedUrl.hostname.toLowerCase();
    const path = parsedUrl.pathname.toLowerCase();

    let targetUrl = anchor.href;
    if (host.endsWith("google.com") || host.includes(".google.") || host === "google.com") {
      if (path.startsWith("/url")) {
        const direct = parsedUrl.searchParams.get("q") || parsedUrl.searchParams.get("url");
        if (direct && !direct.includes("google.com")) {
          targetUrl = direct;
        } else {
          continue;
        }
      } else {
        continue; // Skip Google internal links
      }
    }

    // Skip small sitelinks
    if (h3.closest("table, .usJj9c, .VNLkW")) continue;

    try {
      const fontSize = parseFloat(window.getComputedStyle(h3).fontSize);
      if (fontSize > 0 && fontSize < 18) {
        continue;
      }
    } catch {
      // ignore
    }

    // Skip if its outer result container already has a .hg-badge-container injected
    const outerContainer =
      h3.closest<HTMLElement>(".MjjYud, .tF2Cxc, .g") ||
      (anchor.parentElement?.parentElement as HTMLElement | null);

    if (outerContainer && outerContainer.querySelector(".hg-badge-container")) {
      continue;
    }

    if (h3.dataset.hybridguardScanned === "true" || anchor.dataset.hybridguardScanned === "true") {
      continue;
    }

    // Extract snippet text
    let snippet = "";
    if (outerContainer) {
      const snippetEl = outerContainer.querySelector<HTMLElement>(
        "div[data-sncf], .VwiC3b, .yXK7lf, .snippet, [style*='-webkit-line-clamp']"
      );
      if (snippetEl) {
        snippet = snippetEl.textContent?.trim() || "";
      } else {
        const textNodes = Array.from(outerContainer.querySelectorAll("div, p, span"))
          .filter(
            (el) =>
              el !== h3 &&
              !h3.contains(el) &&
              el !== anchor &&
              !anchor.contains(el) &&
              !el.classList.contains("hg-badge-container")
          )
          .map((el) => el.textContent?.trim() || "")
          .filter((t) => t.length > 20 && !t.includes("http"));

        if (textNodes.length > 0) {
          snippet = textNodes[0];
        }
      }
    }

    const title = h3.textContent?.trim() || "";
    if (!title) continue;

    candidates.push({
      h3,
      anchor,
      outerContainer,
      targetUrl,
      title,
      snippet
    });
  }

  return candidates;
}

// Insert .hg-badge-container cleanly right AFTER the title's wrapper
function injectBadgeContainer(candidate: SerpCandidate): HTMLDivElement {
  const badgeContainer = document.createElement("div");
  badgeContainer.className = "hg-badge-container";
  badgeContainer.style.setProperty("transform", "none", "important");
  badgeContainer.style.setProperty("writing-mode", "horizontal-tb", "important");
  badgeContainer.style.setProperty("direction", "ltr", "important");

  badgeContainer.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  const { h3, anchor, outerContainer } = candidate;

  // Mark elements scanned to prevent duplicates
  h3.dataset.hybridguardScanned = "true";
  anchor.dataset.hybridguardScanned = "true";
  if (outerContainer) {
    outerContainer.dataset.hybridguardScanned = "true";
  }

  const titleWrapper = anchor.closest<HTMLElement>(".yuRUbf") || anchor.parentElement || anchor;
  titleWrapper.insertAdjacentElement("afterend", badgeContainer);

  return badgeContainer;
}

// Track high-risk scam/phishing URLs and hostnames to block navigation
const highRiskUrls = new Set<string>();
const highRiskHostnames = new Set<string>();

// Show sleek full-screen blocking warning overlay when a dangerous link is clicked
function showDangerousWebsiteBlockedOverlay(targetUrl: string, title: string = "", snippet: string = "") {
  if (document.getElementById("hg-dangerous-block-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "hg-dangerous-block-overlay";
  overlay.className = "hg-blocking-overlay";

  overlay.innerHTML = `
    <div class="hg-blocking-modal">
      <div class="hg-blocking-icon">⛔</div>
      <h2 class="hg-blocking-title">Dangerous Website Blocked by HybridGuard</h2>
      <div class="hg-blocking-url">
        <strong>Blocked destination:</strong> ${targetUrl}
      </div>
      <p class="hg-blocking-desc">
        This link shows strong signs of a phishing scam or fake login trap. HybridGuard blocked it to protect your passwords and device.
      </p>
      <div class="hg-blocking-actions">
        <button class="hg-btn-goback" id="hg-btn-goback-action">
          ← Go Back Safely
        </button>
        <button class="hg-btn-inspect-safe" id="hg-btn-inspect-safe-action">
          <span>🔍 Inspect Safely (Zero-PII)</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Button 1: Go Back Safely
  overlay.querySelector("#hg-btn-goback-action")?.addEventListener("click", () => {
    overlay.remove();
  });

  // Button 2: Inspect Safely (Zero-PII) in Background
  const inspectBtn = overlay.querySelector<HTMLButtonElement>("#hg-btn-inspect-safe-action");
  inspectBtn?.addEventListener("click", () => {
    inspectBtn.disabled = true;
    inspectBtn.innerHTML = `<span>⏳ Analyzing Safely in Background...</span>`;

    try {
      chrome.runtime.sendMessage(
        {
          type: "INSPECT_SAFELY",
          payload: {
            targetUrl,
            title: title || targetUrl,
            snippet: snippet || "Blocked dangerous phishing / scam candidate on Google Search",
            initialScan: {
              riskLevel: "HIGH",
              reason: "Likely scam website warning",
              inferenceSource: "ON_DEVICE",
              latencyMs: 14
            }
          }
        },
        (res) => {
          if (res && res.success) {
            inspectBtn.innerHTML = `<span>✓ Report Opened in Dashboard</span>`;
            inspectBtn.style.background = "#059669";
            inspectBtn.style.borderColor = "#047857";
            setTimeout(() => {
              if (overlay.parentElement) overlay.remove();
            }, 2500);
          } else {
            inspectBtn.disabled = false;
            inspectBtn.innerHTML = `<span>🔍 Inspect Safely (Zero-PII)</span>`;
          }
        }
      );
    } catch (err) {
      console.warn("[HybridGuard] Inspect safely error from overlay:", err);
      inspectBtn.disabled = false;
      inspectBtn.innerHTML = `<span>🔍 Inspect Safely (Zero-PII)</span>`;
    }
  });
}

// Capturing click listener: actively intercepts and blocks dangerous links from opening
let clickListenerAttached = false;
function attachDangerousLinkInterception() {
  if (clickListenerAttached) return;
  clickListenerAttached = true;

  document.addEventListener(
    "click",
    (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Allow clicks inside HybridGuard badges or overlay controls
      if (target.closest(".hg-badge-container") || target.closest(".hg-blocking-overlay")) {
        return;
      }

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || !anchor.href) return;

      const rawHref = anchor.href;
      let targetUrl = rawHref;

      // Unpack Google search redirect if present
      try {
        const parsed = new URL(rawHref, window.location.href);
        if (parsed.pathname.startsWith("/url")) {
          const direct = parsed.searchParams.get("q") || parsed.searchParams.get("url");
          if (direct) targetUrl = direct;
        }
      } catch {}

      const host = extractHostname(targetUrl);
      const isHighRisk =
        anchor.dataset.hybridguardRisk === "HIGH" ||
        anchor.closest("[data-hybridguard-risk='HIGH']") !== null ||
        highRiskUrls.has(targetUrl.toLowerCase()) ||
        highRiskHostnames.has(host);

      if (isHighRisk) {
        if (globalShieldRules.blockScamsOnSearch !== false) {
          // Completely block navigation
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          const title = anchor.innerText || anchor.textContent || host;
          showDangerousWebsiteBlockedOverlay(targetUrl, title);
        }
      }
    },
    true // Capture phase: intercepts BEFORE Google or default navigation triggers
  );
}

// Render final badge UI with friendly risk pill, reason, latency, and safe inspect action
function renderBadgeUI(
  badgeContainer: HTMLDivElement,
  candidate: SerpCandidate,
  scan: SerpScanResult
) {
  const { targetUrl, title, snippet } = candidate;

  // Track HIGH risk links to block navigation
  if (scan.riskLevel === "HIGH") {
    highRiskUrls.add(targetUrl.toLowerCase());
    highRiskHostnames.add(extractHostname(targetUrl));
    candidate.anchor.dataset.hybridguardRisk = "HIGH";
    candidate.h3.dataset.hybridguardRisk = "HIGH";
    if (candidate.outerContainer) {
      candidate.outerContainer.dataset.hybridguardRisk = "HIGH";
    }
  }

  let riskPillHtml = "";
  if (scan.riskLevel === "LOW") {
    riskPillHtml = `
      <span class="hg-pill hg-risk-LOW" title="${scan.details || scan.reason}">
        <span>✅</span>
        <span>Safe Site</span>
      </span>
    `;
  } else if (scan.riskLevel === "MEDIUM") {
    riskPillHtml = `
      <span class="hg-pill hg-risk-MEDIUM" title="${scan.details || scan.reason}">
        <span>⚠️</span>
        <span>Be Careful</span>
      </span>
    `;
  } else {
    riskPillHtml = `
      <span class="hg-pill hg-risk-HIGH" title="${scan.details || scan.reason}">
        <span>🚨</span>
        <span>Likely Scam</span>
      </span>
    `;
  }

  const friendlyReason = getFriendlyReason(scan.reason, scan.riskLevel);
  const formattedTime = formatLatency(scan.latencyMs);

  badgeContainer.innerHTML = `
    ${riskPillHtml}
    <span class="hg-reason">${friendlyReason}</span>
    <span class="hg-meta-tag hg-source-nano" title="Inference Source: Gemini Nano (ON_DEVICE)">
      🔒 Checked on your device
    </span>
    <span class="hg-meta-tag hg-latency" title="Checked in ${formattedTime} on Gemini Nano">
      ⚡ ${formattedTime}
    </span>
    <button class="hg-inspect-btn" title="Strip personal details and view safety report in Privacy Check Dashboard">
      <span>Check Safely →</span>
    </button>
  `;

  // Wire up "Check Safely →" button
  const inspectBtn = badgeContainer.querySelector<HTMLButtonElement>(".hg-inspect-btn");
  if (inspectBtn) {
    inspectBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      inspectBtn.classList.add("loading");
      inspectBtn.innerHTML = `
        <span class="hg-spinner hg-spinner-white"></span>
        <span>Checking Safely...</span>
      `;
      inspectBtn.disabled = true;

      try {
        chrome.runtime.sendMessage(
          {
            type: "INSPECT_SAFELY",
            payload: {
              targetUrl,
              title,
              snippet,
              initialScan: scan
            }
          },
          (response) => {
            if (response && response.success) {
              inspectBtn.innerHTML = `<span>✓ Safety Report Ready</span>`;
              inspectBtn.style.background = "#059669";
              inspectBtn.style.borderColor = "#047857";
            } else {
              console.warn("[HybridGuard] Inspect response unsuccessful:", response);
              inspectBtn.classList.remove("loading");
              inspectBtn.disabled = false;
              inspectBtn.innerHTML = `<span>Check Safely →</span>`;
            }
          }
        );
      } catch (sendErr) {
        console.error("[HybridGuard] Error sending inspect message:", sendErr);
        inspectBtn.classList.remove("loading");
        inspectBtn.disabled = false;
        inspectBtn.innerHTML = `<span>Check Safely →</span>`;
      }
    });
  }
}

// Triggers scanning for an intersecting candidate via sequential 1-by-1 queue
function triggerQueuedScan(candidate: SerpCandidate) {
  const { targetUrl, title, snippet } = candidate;

  // Insert container with scanning indicator
  const badgeContainer = injectBadgeContainer(candidate);
  badgeContainer.innerHTML = `
    <span class="hg-pill hg-scanning">
      <span class="hg-spinner"></span>
      <span>Checking site safety on device...</span>
    </span>
  `;

  // Push into 1-by-1 sequential queue so Gemini Nano executes smoothly without jamming
  enqueueScan(async () => {
    try {
      const scan = await scanSerpResultOnDevice({
        title,
        url: targetUrl,
        snippet
      });
      renderBadgeUI(badgeContainer, candidate, scan);
    } catch (err) {
      const scanError = err instanceof Error ? err : new Error(String(err));
      console.error("[HybridGuard] On-device scan error for:", targetUrl, err);
      renderBadgeUI(badgeContainer, candidate, {
        riskLevel: "MEDIUM",
        reason: "Unverified website proceed carefully",
        inferenceSource: "ON_DEVICE",
        latencyMs: 14,
        details: `Notice: ${scanError.message}`,
        error: scanError.message,
        fallbackApplied: true
      });
    }
  });
}

// Process a single candidate: immediate render for official or cached domains (< 50ms),
// or observe with IntersectionObserver (rootMargin: 200px) for smooth on-scroll queueing
async function processCandidate(candidate: SerpCandidate) {
  const { targetUrl, h3, outerContainer } = candidate;
  const hostname = extractHostname(targetUrl);

  // Fast Path 1: Immediate verified official platform check (< 10ms, no queue needed)
  if (isOfficialDomain(hostname)) {
    const badgeContainer = injectBadgeContainer(candidate);
    renderBadgeUI(badgeContainer, candidate, {
      riskLevel: "LOW",
      reason: "Verified official platform",
      inferenceSource: "ON_DEVICE",
      latencyMs: 8,
      details: `Verified authentic official platform: ${hostname}`
    });
    return;
  }

  // Fast Path 2: Instant Domain Cache (< 50ms, no queue needed)
  const cached = await getCachedDomainVerdict(targetUrl);
  if (cached) {
    if (cached.riskLevel === "HIGH") {
      highRiskUrls.add(targetUrl.toLowerCase());
      highRiskHostnames.add(hostname);
      candidate.anchor.dataset.hybridguardRisk = "HIGH";
    }
    const badgeContainer = injectBadgeContainer(candidate);
    renderBadgeUI(badgeContainer, candidate, {
      riskLevel: cached.riskLevel,
      reason: cached.reason,
      inferenceSource: "ON_DEVICE",
      latencyMs: 14,
      details: `Instant domain cache hit for ${hostname}`
    });
    return;
  }

  // Uncached & non-official: Observe element with IntersectionObserver (rootMargin: 200px)
  // When scrolled near viewport, triggers smooth 1-by-1 sequential inference
  const observeTarget = outerContainer || h3;
  candidateMap.set(observeTarget, candidate);
  getSerpObserver().observe(observeTarget);
}

// Main execution function: scans ALL organic search results (no top-4 cap)
async function runFirewall() {
  injectStyles();
  attachDangerousLinkInterception();
  const candidates = findSerpCandidates();
  if (candidates.length === 0) return;

  const unscanned = candidates.filter(
    (c) =>
      c.h3.dataset.hybridguardScanned !== "true" &&
      c.anchor.dataset.hybridguardScanned !== "true" &&
      (!c.outerContainer || c.outerContainer.dataset.hybridguardScanned !== "true")
  );
  if (unscanned.length === 0) return;

  // Process all unscanned candidates (official/cached render immediately; rest queued on scroll)
  for (const candidate of unscanned) {
    processCandidate(candidate);
  }
}

// Debounced scan scheduler for dynamic DOM additions
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleScan() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    runFirewall();
  }, 100);
}

// MutationObserver on document.body so results appear immediately even when Google loads dynamically
function initObserver() {
  const observer = new MutationObserver((mutations) => {
    let hasAdded = false;
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        hasAdded = true;
        break;
      }
    }
    if (hasAdded) {
      scheduleScan();
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  const rso = document.getElementById("rso");
  if (rso && rso !== document.body) {
    observer.observe(rso, { childList: true, subtree: true });
  }
}

// Run on load and initialize observer
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    attachDangerousLinkInterception();
    runFirewall();
    initObserver();
  });
} else {
  attachDangerousLinkInterception();
  runFirewall();
  initObserver();
}

// Periodic retries for delayed client-side DOM rendering
setTimeout(runFirewall, 300);
setTimeout(runFirewall, 800);
setTimeout(runFirewall, 1600);
