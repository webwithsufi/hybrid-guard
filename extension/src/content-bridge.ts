// HybridGuard Extension <-> Web Dashboard Communication Bridge
// Connects http://localhost:3000 dashboard to chrome.storage.local

const DEFAULT_GLOBAL_RULES = {
  blockCameraMic: true,
  blockLocation: true,
  blockClipboard: true,
  warnCookies: true,
  blockScamsOnSearch: true
};

console.log("[HybridGuard Bridge] Content bridge active on HybridGuard Web Dashboard");

function syncRulesToWindow() {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    chrome.storage.local.get("hg_global_shield_rules", (res) => {
      const rules = res.hg_global_shield_rules || DEFAULT_GLOBAL_RULES;
      window.postMessage(
        {
          type: "HYBRIDGUARD_SYNC_GLOBAL_RULES",
          rules,
          extensionActive: true
        },
        "*"
      );
    });
  }
}

// Initial sync on startup
syncRulesToWindow();

// Also retry sync once DOM is ready to ensure React listeners are mounted
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(syncRulesToWindow, 300);
  });
} else {
  setTimeout(syncRulesToWindow, 300);
}

// Listen for messages from the Web Dashboard
window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data) return;

  // 1. Dashboard requests the current rules
  if (event.data.type === "HYBRIDGUARD_REQUEST_GLOBAL_RULES") {
    syncRulesToWindow();
    return;
  }

  // 2. Dashboard updates the global shield rules
  if (event.data.type === "HYBRIDGUARD_UPDATE_GLOBAL_RULES" && event.data.rules) {
    const rules = event.data.rules;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set({ hg_global_shield_rules: rules }, () => {
        console.log("[HybridGuard Bridge] Saved global rules to chrome.storage.local:", rules);

        // Notify background service worker or other open tabs
        if (chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: "GLOBAL_RULES_UPDATED",
            payload: rules
          }).catch(() => {});
        }

        // Echo back confirmation
        window.postMessage(
          {
            type: "HYBRIDGUARD_SYNC_GLOBAL_RULES",
            rules,
            extensionActive: true
          },
          "*"
        );
      });
    }
  }
});
