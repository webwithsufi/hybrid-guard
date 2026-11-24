// HybridGuard Active Firewall & Live Cookie/Privacy Advisor
// Runs at document_start to block unauthorized device sensor & clipboard access

console.log("[HybridGuard] Active Privacy Firewall & Device Sensor Shield initialized at document_start");

// Guard: Skip execution on Google Search, Web Dashboard, and test SERP
const currentHref = window.location.href.toLowerCase();
if (
  currentHref.includes("google.com/search") ||
  currentHref.includes("localhost:3000") ||
  currentHref.includes("test-serp.html")
) {
  // Excluded domain
} else {
  // 1. Immediately inject the Page-World Active Firewall before any site scripts execute
  injectPageWorldFirewall();

  // 2. Setup listeners and UI advisors
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdvisors);
  } else {
    initAdvisors();
  }
}

interface SiteShieldSettings {
  blockCameraMic: boolean;
  blockLocation: boolean;
  blockClipboard: boolean;
  warnCookies: boolean;
}

interface GlobalShieldRules {
  blockCameraMic: boolean;
  blockLocation: boolean;
  blockClipboard: boolean;
  warnCookies: boolean;
  blockScamsOnSearch: boolean;
}

const DEFAULT_GLOBAL_RULES: GlobalShieldRules = {
  blockCameraMic: true,
  blockLocation: true,
  blockClipboard: true,
  warnCookies: true,
  blockScamsOnSearch: true
};

let activeSiteSettings: SiteShieldSettings = {
  blockCameraMic: true,
  blockLocation: true,
  blockClipboard: true,
  warnCookies: true
};

async function initSiteSettings() {
  try {
    const domain = window.location.hostname.toLowerCase();
    const siteKey = `hg_site_settings_${domain}`;
    const globalKey = "hg_global_shield_rules";
    const data = await chrome.storage.local.get([globalKey, siteKey]);

    const globalRules: GlobalShieldRules = data[globalKey] || DEFAULT_GLOBAL_RULES;
    const siteOverrides: Partial<SiteShieldSettings> = data[siteKey] || {};

    activeSiteSettings = {
      blockCameraMic: siteOverrides.blockCameraMic !== undefined ? siteOverrides.blockCameraMic : globalRules.blockCameraMic,
      blockLocation: siteOverrides.blockLocation !== undefined ? siteOverrides.blockLocation : globalRules.blockLocation,
      blockClipboard: siteOverrides.blockClipboard !== undefined ? siteOverrides.blockClipboard : globalRules.blockClipboard,
      warnCookies: siteOverrides.warnCookies !== undefined ? siteOverrides.warnCookies : globalRules.warnCookies
    };

    window.dispatchEvent(new CustomEvent("hg_sync_site_settings", { detail: activeSiteSettings }));
  } catch (err) {
    // ignore
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SITE_SETTINGS_UPDATED" && msg.payload) {
    activeSiteSettings = { ...activeSiteSettings, ...msg.payload };
    window.dispatchEvent(new CustomEvent("hg_sync_site_settings", { detail: activeSiteSettings }));
  }
  if (msg.type === "GLOBAL_RULES_UPDATED") {
    initSiteSettings();
  }
});

if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      const domain = window.location.hostname.toLowerCase();
      if (changes.hg_global_shield_rules || changes[`hg_site_settings_${domain}`]) {
        initSiteSettings();
      }
    }
  });
}

function initAdvisors() {
  initSiteSettings();
  injectStyles();
  listenForBlockedEvents();
  observeCookieBanners();
}

// 1. Page-World Active Firewall: Intercepts & actively blocks device sensors by default
function injectPageWorldFirewall() {
  try {
    const script = document.createElement("script");
    script.textContent = `
      (function() {
        if (window.__hg_active_firewall_installed) return;
        window.__hg_active_firewall_installed = true;
        window.__hg_allowed_once = new Set();
        window.__hg_site_settings = {
          blockCameraMic: true,
          blockLocation: true,
          blockClipboard: true,
          warnCookies: true
        };

        window.addEventListener("hg_sync_site_settings", function(e) {
          if (e.detail) {
            window.__hg_site_settings = Object.assign(window.__hg_site_settings || {}, e.detail);
            console.log("[HybridGuard] Live site firewall settings updated:", window.__hg_site_settings);
          }
        });

        window.addEventListener("hg_allow_once_action", function(e) {
          if (e.detail && e.detail.type) {
            window.__hg_allowed_once.add(e.detail.type);
            console.log("[HybridGuard] Permission temporarily allowed once for:", e.detail.type);
          }
        });

        function dispatchBlockedEvent(type, label) {
          window.dispatchEvent(new CustomEvent("hg_active_blocked_event", {
            detail: { type: type, label: label, domain: window.location.hostname }
          }));
        }

        // 1. Actively Block navigator.mediaDevices.getUserMedia (Camera & Microphone)
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
          navigator.mediaDevices.getUserMedia = function(constraints) {
            if (window.__hg_site_settings && window.__hg_site_settings.blockCameraMic === false) {
              return originalGetUserMedia(constraints);
            }

            const hasVideo = constraints && (constraints.video === true || typeof constraints.video === "object");
            const hasAudio = constraints && (constraints.audio === true || typeof constraints.audio === "object");
            const permType = (hasVideo && hasAudio) ? "camera_mic" : hasVideo ? "camera" : "microphone";
            const label = (hasVideo && hasAudio) ? "Camera & Microphone" : hasVideo ? "Camera" : "Microphone";

            if (window.__hg_allowed_once.has("camera") || window.__hg_allowed_once.has("microphone") || window.__hg_allowed_once.has("camera_mic")) {
              return originalGetUserMedia(constraints);
            }

            dispatchBlockedEvent(permType, label);
            return Promise.reject(new DOMException("Access blocked by HybridGuard Active Privacy Shield", "NotAllowedError"));
          };
        }

        // 2. Actively Block navigator.geolocation (GPS Location)
        if (navigator.geolocation) {
          const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
          navigator.geolocation.getCurrentPosition = function(successCallback, errorCallback, options) {
            if (window.__hg_site_settings && window.__hg_site_settings.blockLocation === false) {
              return originalGetCurrentPosition(successCallback, errorCallback, options);
            }

            if (window.__hg_allowed_once.has("location")) {
              return originalGetCurrentPosition(successCallback, errorCallback, options);
            }
            dispatchBlockedEvent("location", "GPS Location");
            if (typeof errorCallback === "function") {
              setTimeout(function() {
                errorCallback({
                  code: 1,
                  message: "Location access blocked by HybridGuard Active Privacy Shield",
                  PERMISSION_DENIED: 1,
                  POSITION_UNAVAILABLE: 2,
                  TIMEOUT: 3
                });
              }, 10);
            }
          };

          if (navigator.geolocation.watchPosition) {
            const originalWatchPosition = navigator.geolocation.watchPosition.bind(navigator.geolocation);
            navigator.geolocation.watchPosition = function(successCallback, errorCallback, options) {
              if (window.__hg_site_settings && window.__hg_site_settings.blockLocation === false) {
                return originalWatchPosition(successCallback, errorCallback, options);
              }

              if (window.__hg_allowed_once.has("location")) {
                return originalWatchPosition(successCallback, errorCallback, options);
              }
              dispatchBlockedEvent("location", "GPS Location");
              if (typeof errorCallback === "function") {
                setTimeout(function() {
                  errorCallback({
                    code: 1,
                    message: "Location tracking blocked by HybridGuard Active Privacy Shield",
                    PERMISSION_DENIED: 1,
                    POSITION_UNAVAILABLE: 2,
                    TIMEOUT: 3
                  });
                }, 10);
              }
              return -1;
            };
          }
        }

        // 3. Actively Block navigator.clipboard.read & readText (Clipboard Snooping)
        if (navigator.clipboard) {
          if (navigator.clipboard.readText) {
            const originalReadText = navigator.clipboard.readText.bind(navigator.clipboard);
            navigator.clipboard.readText = function() {
              if (window.__hg_site_settings && window.__hg_site_settings.blockClipboard === false) {
                return originalReadText();
              }

              if (window.__hg_allowed_once.has("clipboard")) {
                return originalReadText();
              }
              dispatchBlockedEvent("clipboard", "Clipboard Snooping");
              return Promise.reject(new DOMException("Clipboard snooping blocked by HybridGuard Active Privacy Shield", "NotAllowedError"));
            };
          }

          if (navigator.clipboard.read) {
            const originalRead = navigator.clipboard.read.bind(navigator.clipboard);
            navigator.clipboard.read = function() {
              if (window.__hg_site_settings && window.__hg_site_settings.blockClipboard === false) {
                return originalRead();
              }

              if (window.__hg_allowed_once.has("clipboard")) {
                return originalRead();
              }
              dispatchBlockedEvent("clipboard", "Clipboard Snooping");
              return Promise.reject(new DOMException("Clipboard snooping blocked by HybridGuard Active Privacy Shield", "NotAllowedError"));
            };
          }
        }

        // 4. Actively Block Notification.requestPermission (Notification Spam)
        if (window.Notification && window.Notification.requestPermission) {
          const originalRequestPermission = window.Notification.requestPermission.bind(window.Notification);
          window.Notification.requestPermission = function(callback) {
            if (window.__hg_allowed_once.has("notification")) {
              return originalRequestPermission(callback);
            }
            dispatchBlockedEvent("notification", "Push Notifications");
            if (typeof callback === "function") {
              callback("denied");
            }
            return Promise.resolve("denied");
          };
        }
      })();
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch (err) {
    console.warn("[HybridGuard] Could not inject active page firewall:", err);
  }
}

// Injected CSS for high-contrast shield toasts and floating advisors
function injectStyles() {
  if (document.getElementById("hg-firewall-styles")) return;
  const style = document.createElement("style");
  style.id = "hg-firewall-styles";
  style.textContent = `
    /* High-contrast Active Shield Toast */
    .hg-shield-toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .hg-shield-toast {
      pointer-events: auto;
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid #ef4444;
      border-radius: 14px;
      box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(239, 68, 68, 0.2);
      padding: 12px 16px;
      width: 360px;
      max-width: calc(100vw - 40px);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      line-height: normal;
      box-sizing: border-box;
      animation: hg-toast-slide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hg-toast-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .hg-toast-title {
      font-weight: 700;
      font-size: 12.5px;
      color: #fca5a5;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .hg-toast-close {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 14px;
      padding: 2px 4px;
      border-radius: 4px;
    }
    .hg-toast-close:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }
    .hg-toast-body {
      color: #cbd5e1;
      font-size: 11.5px;
      line-height: 1.4;
      margin-bottom: 10px;
    }
    .hg-toast-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hg-toast-btn-block {
      flex: 1;
      padding: 6px 10px;
      background: rgba(239, 68, 68, 0.18);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
    }
    .hg-toast-btn-block:hover {
      background: rgba(239, 68, 68, 0.28);
    }
    .hg-toast-btn-allow {
      padding: 6px 12px;
      background: #334155;
      color: #f1f5f9;
      border: 1px solid #475569;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }
    .hg-toast-btn-allow:hover {
      background: #475569;
    }

    /* Clean Light-Mode Floating Cookie Advisor Card */
    .hg-advisor-card {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      max-width: 410px;
      width: calc(100vw - 48px);
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.06);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      padding: 16px 18px;
      box-sizing: border-box;
      line-height: normal;
      animation: hg-advisor-slide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hg-advisor-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .hg-advisor-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .hg-dark-pattern-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3.5px 9px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 700;
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
      margin-bottom: 6px;
    }
    .hg-advisor-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3.5px 9px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: -0.01em;
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
      margin-bottom: 8px;
    }
    .hg-advisor-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
    }
    .hg-advisor-close:hover {
      color: #0f172a;
      background: #f1f5f9;
    }
    .hg-advisor-body {
      font-size: 12px;
      color: #475569;
      line-height: 1.45;
      margin-bottom: 12px;
    }
    .hg-advisor-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .hg-advisor-reject-btn {
      flex: 1.1;
      min-width: 140px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8.5px 12px;
      background: #059669;
      color: #ffffff !important;
      border: 1px solid #047857;
      border-radius: 10px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(5, 150, 105, 0.2);
      transition: all 0.15s ease;
      text-decoration: none !important;
    }
    .hg-advisor-reject-btn:hover {
      background: #047857;
      transform: translateY(-0.5px);
    }
    .hg-advisor-reject-btn:active {
      transform: translateY(0);
    }
    .hg-advisor-policy-btn {
      flex: 0.9;
      min-width: 130px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8.5px 12px;
      background: #4f46e5;
      color: #ffffff !important;
      border: 1px solid #4338ca;
      border-radius: 10px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(79, 70, 229, 0.2);
      transition: all 0.15s ease;
      text-decoration: none !important;
    }
    .hg-advisor-policy-btn:hover {
      background: #4338ca;
      transform: translateY(-0.5px);
    }
    .hg-advisor-policy-btn:disabled,
    .hg-advisor-reject-btn:disabled {
      opacity: 0.8;
      cursor: wait;
    }
    @keyframes hg-toast-slide {
      from { transform: translateX(40px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes hg-advisor-slide {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

// Ensure toast container exists
function getToastContainer(): HTMLElement {
  let container = document.getElementById("hg-shield-toast-root");
  if (!container) {
    container = document.createElement("div");
    container.id = "hg-shield-toast-root";
    container.className = "hg-shield-toast-container";
    document.body.appendChild(container);
  }
  return container;
}

// Show sleek high-contrast shield toast when an active block occurs
function showActiveBlockedToast(type: string, label: string, domain: string) {
  const container = getToastContainer();
  const toastId = `hg-toast-${type}`;

  // Prevent duplicate toast if already on screen
  if (document.getElementById(toastId)) return;

  const toast = document.createElement("div");
  toast.id = toastId;
  toast.className = "hg-shield-toast";

  let detailMsg = `This website attempted to access your ${label.toLowerCase()} in the background. HybridGuard actively blocked this request to protect your privacy.`;

  toast.innerHTML = `
    <div class="hg-toast-header">
      <div class="hg-toast-title">
        <span>🛡️</span>
        <span>Blocked ${label} Access</span>
      </div>
      <button class="hg-toast-close" title="Dismiss">✕</button>
    </div>
    <div class="hg-toast-body">
      ${detailMsg}
    </div>
    <div class="hg-toast-actions">
      <button class="hg-toast-btn-block">
        ✓ Blocked Permanently (Default)
      </button>
      <button class="hg-toast-btn-allow">
        Allow Once
      </button>
    </div>
  `;

  container.appendChild(toast);

  // Close / Dismiss
  toast.querySelector(".hg-toast-close")?.addEventListener("click", () => toast.remove());
  toast.querySelector(".hg-toast-btn-block")?.addEventListener("click", () => toast.remove());

  // Allow Once action
  toast.querySelector(".hg-toast-btn-allow")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("hg_allow_once_action", { detail: { type: type } }));
    toast.innerHTML = `
      <div style="color: #86efac; font-weight: 600; padding: 4px 0; font-size: 11.5px;">
        ✓ ${label} temporarily allowed for this session
      </div>
    `;
    setTimeout(() => toast.remove(), 2000);
  });

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 10000);
}

// Track active blocked events and report to background service worker
const blockedHistory = new Set<string>();

function listenForBlockedEvents() {
  window.addEventListener("hg_active_blocked_event", ((e: CustomEvent) => {
    const { type, label, domain } = e.detail || {};
    if (!type) return;

    blockedHistory.add(type);

    // 1. Report to background service worker to persist in chrome.storage.local & Firestore
    chrome.runtime.sendMessage({
      type: "RECORD_BLOCKED_PERMISSION",
      payload: {
        domain: domain || window.location.hostname,
        permissionType: type
      }
    });

    // 2. Display sleek high-contrast shield toast
    showActiveBlockedToast(type, label || type, domain || window.location.hostname);
  }) as EventListener);
}

// 2. Cookie Consent Advisor (Dynamic Detection, Auto-Reject & Plain-English Why)
let advisorCardRendered = false;
let detectedBannerText = "";
let detectedBannerElement: HTMLElement | null = null;

function observeCookieBanners() {
  // Staggered initial scans
  setTimeout(detectAndAdviseCookies, 400);
  setTimeout(detectAndAdviseCookies, 1200);
  setTimeout(detectAndAdviseCookies, 2500);
  setTimeout(detectAndAdviseCookies, 4500);

  // Dynamic MutationObserver to catch client-side modals (e.g. land-book.com, OneTrust, Cookiebot)
  const observer = new MutationObserver(() => {
    if (!advisorCardRendered) {
      detectAndAdviseCookies();
    }
  });

  const rootNode = document.body || document.documentElement;
  if (rootNode) {
    observer.observe(rootNode, { childList: true, subtree: true });
  }

  // Also hook DOMContentLoaded if body wasn't ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (document.body && !advisorCardRendered) {
        observer.observe(document.body, { childList: true, subtree: true });
        detectAndAdviseCookies();
      }
    });
  }
}

function detectAndAdviseCookies() {
  if (advisorCardRendered) return;
  if (activeSiteSettings.warnCookies === false) return;

  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      `[id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i],
       [id*="onetrust" i], [class*="onetrust" i], [aria-label*="cookie" i], [aria-label*="consent" i],
       [role="dialog"], [role="alertdialog"], [class*="modal" i], [class*="banner" i], [class*="popup" i]`
    )
  );

  let targetBanner: HTMLElement | null = null;
  for (const el of candidates) {
    // Skip HybridGuard's own UI elements
    if (el.id?.startsWith("hg-") || el.className?.toString().includes("hg-")) continue;

    const rect = el.getBoundingClientRect();
    if (rect.height < 25 || rect.width < 90) continue;

    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

    const text = (el.innerText || el.textContent || "").toLowerCase();
    if (
      text.includes("we use cookies") ||
      text.includes("uses cookies") ||
      text.includes("cookie policy") ||
      text.includes("accept all") ||
      text.includes("cookie preferences") ||
      text.includes("privacy choices") ||
      text.includes("consent") ||
      (text.includes("cookies") && (text.includes("accept") || text.includes("reject") || text.includes("manage")))
    ) {
      targetBanner = el;
      detectedBannerText = text.slice(0, 350);
      break;
    }
  }

  // Fallback: search for buttons with "accept all" or "reject all" and find their container
  if (!targetBanner) {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>("button, a, [role='button']"));
    for (const btn of buttons) {
      if (btn.closest("#hg-floating-advisor-card") || btn.closest("#hg-shield-toast-root")) continue;
      const btnText = (btn.innerText || btn.textContent || "").trim().toLowerCase();
      if (
        btnText === "accept all" ||
        btnText === "accept all cookies" ||
        btnText === "accept cookies" ||
        btnText === "reject all" ||
        btnText === "decline all" ||
        btnText === "agree & continue"
      ) {
        const parent = btn.closest<HTMLElement>("div, section, footer, [role='dialog'], [role='region'], aside");
        if (parent && parent.getBoundingClientRect().height > 25) {
          targetBanner = parent;
          detectedBannerText = (parent.innerText || parent.textContent || "").slice(0, 350);
          break;
        }
      }
    }
  }

  if (targetBanner && !advisorCardRendered) {
    advisorCardRendered = true;
    detectedBannerElement = targetBanner;
    showCookieAdvisorCard(detectedBannerText, targetBanner);
  }
}

// Dark-Pattern & Manipulative Cookie UI Detector
function detectDarkPatternsInBanner(banner: HTMLElement): { isDarkPattern: boolean; patternReason: string } {
  const text = (banner.innerText || banner.textContent || "").toLowerCase();

  const buttons = Array.from(banner.querySelectorAll<HTMLElement>("button, a, input[type='button'], [role='button']"));
  const acceptBtn = buttons.find((b) => {
    if (b.closest("#hg-floating-advisor-card") || b.closest("#hg-shield-toast-root")) return false;
    const t = (b.innerText || b.textContent || "").trim().toLowerCase();
    return t.includes("accept all") || t.includes("accept cookies") || t.includes("allow all") || t === "accept" || t === "agree & continue";
  });

  const directRejectBtn = findRejectButtonOnPage(banner);

  // Pattern 1: Asymmetric choice: Prominent "Accept All" with no direct "Reject All" (hidden behind settings)
  if (acceptBtn && !directRejectBtn) {
    return {
      isDarkPattern: true,
      patternReason: "Manipulative Asymmetry: 'Accept All' is highlighted while 'Reject All' is hidden behind submenus."
    };
  }

  // Pattern 2: Visual de-emphasis
  if (acceptBtn && directRejectBtn) {
    try {
      const acceptStyle = window.getComputedStyle(acceptBtn);
      const rejectStyle = window.getComputedStyle(directRejectBtn);
      const acceptFontSize = parseFloat(acceptStyle.fontSize) || 14;
      const rejectFontSize = parseFloat(rejectStyle.fontSize) || 14;

      if (rejectFontSize < acceptFontSize * 0.75) {
        return {
          isDarkPattern: true,
          patternReason: "Visual Obstruction: 'Reject' choice is displayed in smaller, de-emphasized typography."
        };
      }
    } catch {
      // ignore
    }
  }

  // Pattern 3: Guilt-tripping or manipulative framing
  const guiltPhrases = [
    "i don't care about privacy",
    "support us by accepting",
    "decline at your own risk",
    "without accepting"
  ];
  for (const phrase of guiltPhrases) {
    if (text.includes(phrase)) {
      return {
        isDarkPattern: true,
        patternReason: `Deceptive Framing: Banner uses guilt-tripping language to discourage rejecting trackers.`
      };
    }
  }

  return { isDarkPattern: false, patternReason: "" };
}

function findRejectButtonOnPage(targetBanner?: HTMLElement | null): HTMLElement | null {
  const exactPatterns = [
    /^reject(\s+all|\s+cookies|\s+all\s+cookies)?$/i,
    /^decline(\s+all|\s+cookies)?$/i,
    /^essential(\s+only)?$/i,
    /^(only\s+necessary|necessary\s+only)$/i,
    /^deny$/i,
    /^refuse$/i,
    /^disagree$/i,
    /^reject\s+non-essential$/i
  ];

  const searchRoots = targetBanner ? [targetBanner, document.body || document.documentElement] : [document.body || document.documentElement];

  for (const root of searchRoots) {
    const clickable = Array.from(
      root.querySelectorAll<HTMLElement>("button, a, input[type='button'], input[type='submit'], [role='button'], div, span")
    );

    // 1. First pass: exact matches
    for (const el of clickable) {
      if (el.closest("#hg-floating-advisor-card") || el.closest("#hg-shield-toast-root")) continue;
      const text = (el.innerText || el.textContent || "").trim();
      if (text.length > 0 && text.length < 35) {
        for (const pat of exactPatterns) {
          if (pat.test(text)) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 10 && rect.height > 10) {
              return el;
            }
          }
        }
      }
    }

    // 2. Second pass: partial matches (e.g. "Reject optional cookies")
    for (const el of clickable) {
      if (el.closest("#hg-floating-advisor-card") || el.closest("#hg-shield-toast-root")) continue;
      const text = (el.innerText || el.textContent || "").toLowerCase().trim();
      if (
        text.includes("reject all") ||
        text.includes("decline all") ||
        text.includes("essential only") ||
        text.includes("only necessary") ||
        (text.includes("reject") && !text.includes("accept"))
      ) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 10 && rect.height > 10) {
          return el;
        }
      }
    }
  }

  return null;
}

function generateCookieAdvice(rawText: string): { badge: string; why: string; isRejectRecommended: boolean } {
  const lower = (rawText || "").toLowerCase();
  const hasAdsOrBrokers =
    lower.includes("third-party") ||
    lower.includes("partners") ||
    lower.includes("advertising") ||
    lower.includes("marketing") ||
    lower.includes("trackers") ||
    lower.includes("analytics");

  if (hasAdsOrBrokers) {
    return {
      badge: `🛑 Recommended: Reject All`,
      why: "Accept All allows third-party ad trackers to follow your activity across websites. Rejecting keeps your browsing private while the site still works normally.",
      isRejectRecommended: true
    };
  }

  return {
    badge: `⚠️ Choose Essential Only`,
    why: "This site requests local storage & cookies. Choosing 'Essential Only' prevents cross-site profiling and stops advertising networks from tracking you.",
    isRejectRecommended: true
  };
}

function showCookieAdvisorCard(bannerText: string, bannerEl?: HTMLElement | null) {
  if (document.getElementById("hg-floating-advisor-card")) return;

  const card = document.createElement("div");
  card.id = "hg-floating-advisor-card";
  card.className = "hg-advisor-card";

  const { badge, why } = generateCookieAdvice(bannerText);
  const darkPattern = bannerEl ? detectDarkPatternsInBanner(bannerEl) : { isDarkPattern: false, patternReason: "" };

  card.innerHTML = `
    <div class="hg-advisor-header">
      <div class="hg-advisor-title">
        <span>🍪</span>
        <span>Cookie &amp; Privacy Advisor</span>
      </div>
      <button class="hg-advisor-close" title="Dismiss advice">✕</button>
    </div>
    ${
      darkPattern.isDarkPattern
        ? `<div class="hg-dark-pattern-badge" title="${darkPattern.patternReason}">
            ⚠️ Dark Pattern Alert: "Reject All" Obstructed
           </div>`
        : ""
    }
    <div class="hg-advisor-badge">
      ${badge}
    </div>
    <div class="hg-advisor-body">
      ${why}
    </div>
    <div class="hg-advisor-actions">
      <button class="hg-advisor-reject-btn" id="hg-advisor-auto-reject">
        <span>🛡️ Auto-Reject Cookies</span>
      </button>
      <button class="hg-advisor-policy-btn" id="hg-advisor-policy-trigger">
        <span>Open Full Report →</span>
      </button>
    </div>
  `;

  document.body.appendChild(card);

  // Close / Dismiss
  card.querySelector(".hg-advisor-close")?.addEventListener("click", () => card.remove());

  // 1-Click "Auto-Reject Cookies"
  const autoRejectBtn = card.querySelector<HTMLButtonElement>("#hg-advisor-auto-reject");
  autoRejectBtn?.addEventListener("click", () => {
    const rejectBtn = findRejectButtonOnPage(bannerEl || detectedBannerElement);
    if (rejectBtn) {
      try {
        rejectBtn.click();
        autoRejectBtn.innerHTML = `<span>✅ Cookies Rejected!</span>`;
        autoRejectBtn.style.background = "#059669";
        autoRejectBtn.style.borderColor = "#047857";
        setTimeout(() => {
          if (card.parentElement) card.remove();
        }, 2200);
      } catch (clickErr) {
        console.warn("[HybridGuard] Could not click reject button automatically:", clickErr);
        autoRejectBtn.innerHTML = `<span>⚠️ Clicked Reject</span>`;
      }
    } else {
      // Check if there is a settings / preferences button
      const manageBtn = Array.from(document.querySelectorAll<HTMLElement>("button, a, [role='button']")).find((el) => {
        const t = (el.innerText || el.textContent || "").toLowerCase().trim();
        return t.includes("preferences") || t.includes("customize") || t.includes("manage") || t.includes("settings");
      });

      if (manageBtn) {
        manageBtn.click();
        autoRejectBtn.innerHTML = `<span>⚙️ Opened Preferences</span>`;
        autoRejectBtn.style.background = "#d97706";
      } else {
        autoRejectBtn.innerHTML = `<span>⚠️ Select Reject in Banner</span>`;
        autoRejectBtn.style.background = "#64748b";
      }
    }
  });

  // "Open Full Report →" Button
  const policyBtn = card.querySelector<HTMLButtonElement>("#hg-advisor-policy-trigger");
  policyBtn?.addEventListener("click", () => {
    policyBtn.disabled = true;
    policyBtn.innerHTML = `<span>⏳ Preparing Report in 1s...</span>`;
    triggerPrivacyPolicyAudit();
  });
}

function findPrivacyPolicyUrl(): string {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
  for (const a of anchors) {
    const href = a.href.toLowerCase();
    const text = (a.innerText || a.textContent || "").toLowerCase();
    if (
      href.includes("privacy") ||
      href.includes("datenschutz") ||
      href.includes("politica") ||
      text.includes("privacy policy") ||
      text.includes("privacy notice")
    ) {
      return a.href;
    }
  }
  return `${window.location.origin}/privacy`;
}

function triggerPrivacyPolicyAudit() {
  const policyUrl = findPrivacyPolicyUrl();

  const advice = generateCookieAdvice(detectedBannerText);

  chrome.runtime.sendMessage(
    {
      type: "ANALYZE_PRIVACY_POLICY",
      payload: {
        pageUrl: window.location.href,
        policyUrl,
        title: document.title,
        detectedCookies: {
          hasBanner: Boolean(detectedBannerText),
          bannerText: detectedBannerText,
          advice: `${advice.badge} — ${advice.why}`
        },
        detectedPermissions: Array.from(blockedHistory)
      }
    },
    (res) => {
      const card = document.getElementById("hg-floating-advisor-card");
      if (res && res.success) {
        if (card) {
          const btn = card.querySelector<HTMLButtonElement>("#hg-advisor-policy-trigger");
          if (btn) {
            btn.innerHTML = `<span>✓ Report Opened in Dashboard</span>`;
            btn.style.background = "#059669";
          }
          setTimeout(() => card.remove(), 2500);
        }
      } else {
        if (card) {
          const btn = card.querySelector<HTMLButtonElement>("#hg-advisor-policy-trigger");
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span>Full Privacy Report →</span>`;
          }
        }
      }
    }
  );
}

// Popup message listener
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "CHECK_PAGE_PRIVACY") {
    const advice = generateCookieAdvice(detectedBannerText);
    sendResponse({
      active: true,
      pageUrl: window.location.href,
      policyUrl: findPrivacyPolicyUrl(),
      title: document.title,
      hasCookieBanner: Boolean(detectedBannerText),
      cookieAdvice: `${advice.badge} — ${advice.why}`,
      detectedPermissions: Array.from(blockedHistory)
    });
    return true;
  }
});
