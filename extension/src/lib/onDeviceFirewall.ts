import { app, ai as firebaseAi, InferenceMode } from "./firebase";
import { getAI, GoogleAIBackend, getGenerativeModel, GenerativeModel, AI } from "firebase/ai";

export interface SerpScanInput {
  title: string;
  url: string;
  snippet: string;
}

export interface SerpScanResult {
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  reason: string; // 4-word natural summary
  inferenceSource: "ON_DEVICE";
  latencyMs: number;
  details?: string;
  error?: string;
  fallbackApplied?: boolean;
}

export interface CachedDomainVerdict {
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
  timestamp: number;
}

// Verified official platforms & authoritative educational/government TLDs
export const OFFICIAL_SUFFIXES = [
  ".google",
  "google.com",
  "youtube.com",
  "github.com",
  "microsoft.com",
  "apple.com",
  ".edu",
  ".edu.pk",
  ".gov",
  ".gov.pk"
];

export function isOfficialDomain(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  return OFFICIAL_SUFFIXES.some(suffix => {
    if (suffix.startsWith(".")) {
      return host.endsWith(suffix) || host === suffix.slice(1);
    }
    return host === suffix || host.endsWith("." + suffix);
  });
}

// 1. Reuse a Single Warm Model Instance: Initialize getAI and getGenerativeModel ONCE at module level
export const ai: AI = firebaseAi || getAI(app, {
  backend: new GoogleAIBackend()
});

// Pass on-device settings inside onDeviceParams according to @firebase/ai types (zero console warnings)
export let warmModel: GenerativeModel | null = null;
try {
  warmModel = getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {}
  });
} catch (err) {
  console.warn("[HybridGuard] Initializing warm model at module load:", err);
}

export function getWarmModel(): GenerativeModel {
  if (!warmModel) {
    warmModel = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: {}
    });
  }
  return warmModel;
}

// 3. Instant Domain Cache (chrome.storage.local): Cache domain verdicts for 24 hours
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const memoryCache = new Map<string, CachedDomainVerdict>();

export function extractHostname(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

export async function getCachedDomainVerdict(url: string): Promise<CachedDomainVerdict | null> {
  const hostname = extractHostname(url);
  if (!hostname) return null;

  // Check fast in-memory cache (< 1ms)
  const mem = memoryCache.get(hostname);
  if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
    return mem;
  }

  // Check chrome.storage.local (< 10ms)
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    try {
      const key = `hg_cache_${hostname}`;
      const res = await chrome.storage.local.get(key);
      const entry = res[key] as CachedDomainVerdict | undefined;
      if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
        memoryCache.set(hostname, entry);
        return entry;
      }
    } catch (err) {
      console.warn("[HybridGuard] Cache read failed for", hostname, err);
    }
  }

  return null;
}

export async function setCachedDomainVerdict(
  url: string,
  riskLevel: "LOW" | "MEDIUM" | "HIGH",
  reason: string
): Promise<void> {
  const hostname = extractHostname(url);
  if (!hostname) return;

  const entry: CachedDomainVerdict = {
    riskLevel,
    reason,
    timestamp: Date.now()
  };

  memoryCache.set(hostname, entry);

  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    try {
      const key = `hg_cache_${hostname}`;
      await chrome.storage.local.set({ [key]: entry });
    } catch (err) {
      console.warn("[HybridGuard] Cache write failed for", hostname, err);
    }
  }
}

// Known high-risk patterns & lookalike heuristics for on-device fallback / validation
const HIGH_RISK_KEYWORDS = [
  "verify account",
  "credential",
  "suspended",
  "confirm password",
  "security update",
  "urgent login",
  "free nitro",
  "crack download",
  "wallet seed",
  "metamask login"
];

const LOOKALIKE_PATTERNS = [
  /paypa[l1i]/i,
  /goog[l1]e/i,
  /amaz0n/i,
  /micr0soft/i,
  /cha[s5]e/i,
  /appl[e3]/i,
  /netfl[i1]x/i
];

const SUSPICIOUS_TLDS = [".xyz", ".top", ".work", ".click", ".cam", ".zip", ".mov", ".site", ".tk", ".ml"];

function evaluateLocalHeuristics(input: SerpScanInput): { riskLevel: "LOW" | "MEDIUM" | "HIGH"; reason: string; details: string } {
  let hostname = "";
  try {
    hostname = new URL(input.url).hostname.toLowerCase();
  } catch {
    hostname = input.url.toLowerCase();
  }

  // Immediate official domain match: zero false positives
  if (isOfficialDomain(hostname)) {
    return {
      riskLevel: "LOW",
      reason: "Verified official platform",
      details: `Verified authentic official platform: ${hostname}`
    };
  }

  const titleLower = input.title.toLowerCase();
  const snippetLower = input.snippet.toLowerCase();

  const isSuspiciousTld = SUSPICIOUS_TLDS.some(tld => hostname.endsWith(tld));
  const hasLookalike = LOOKALIKE_PATTERNS.some(pat => pat.test(hostname)) && !hostname.endsWith("google.com") && !hostname.endsWith("paypal.com") && !hostname.endsWith("amazon.com") && !hostname.endsWith("microsoft.com") && !hostname.endsWith("apple.com") && !hostname.endsWith("netflix.com") && !hostname.endsWith("chase.com");
  const hasCredentialHarvester = HIGH_RISK_KEYWORDS.some(kw => titleLower.includes(kw) || snippetLower.includes(kw));
  const hasMultiHyphen = (hostname.match(/-/g) || []).length >= 3;
  const isIpHost = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

  if (hasLookalike || (isSuspiciousTld && hasCredentialHarvester) || isIpHost) {
    return {
      riskLevel: "HIGH",
      reason: "Deceptive lookalike credential trap",
      details: `Flagged domain ${hostname} exhibits lookalike patterns and deceptive credential harvesting cues.`
    };
  }

  if (hasMultiHyphen || isSuspiciousTld || hasCredentialHarvester) {
    return {
      riskLevel: "MEDIUM",
      reason: "Suspicious data harvesting structure",
      details: `Domain ${hostname} contains excessive hyphenation or suspicious data collection markers.`
    };
  }

  return {
    riskLevel: "LOW",
    reason: "Safe standard website profile",
    details: `No deceptive lookalike cues or credential harvesting traps found on ${hostname}.`
  };
}

export async function scanSerpResultOnDevice(input: SerpScanInput): Promise<SerpScanResult> {
  const startTime = performance.now();
  const hostname = extractHostname(input.url);

  // 1. Eliminate False Positives: Immediate check for verified official platforms (< 10ms)
  if (isOfficialDomain(hostname)) {
    const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
    await setCachedDomainVerdict(input.url, "LOW", "Verified official platform");
    return {
      riskLevel: "LOW",
      reason: "Verified official platform",
      inferenceSource: "ON_DEVICE",
      latencyMs,
      details: `Verified authentic official platform: ${hostname}`
    };
  }

  // 2. Instant Domain Cache check (< 50ms)
  const cached = await getCachedDomainVerdict(input.url);
  if (cached) {
    const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      riskLevel: cached.riskLevel,
      reason: cached.reason,
      inferenceSource: "ON_DEVICE",
      latencyMs,
      details: `Cached domain verdict for ${hostname} (valid for 24h)`
    };
  }

  try {
    // 3. Reuse the single warm model instance
    const model = getWarmModel();

    // Compact prompt without example phrases to prevent repetition, defaulting to LOW unless clear threat
    const cleanTitle = (input.title || "").replace(/[\r\n\t]+/g, " ").trim();
    const cleanUrl = (input.url || "").replace(/[\r\n\t]+/g, " ").trim();
    const cleanSnippet = (input.snippet || "").replace(/[\r\n\t]+/g, " ").slice(0, 100).trim();

    const prompt = `Classify website safety for "${cleanTitle}" (${cleanUrl}): "${cleanSnippet}". Only mark HIGH for obvious phishing/impersonation/scam traps, MEDIUM for unverified financial/crypto sites, otherwise LOW. Reply strictly as RISK|<4-word natural summary>:`;

    const result = await model.generateContent(prompt);
    const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
    const text = (result?.response?.text?.() || "").trim();

    let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    let reason = "";

    if (text.includes("|")) {
      const parts = text.split("|");
      const riskPart = parts[0].trim().toUpperCase();
      if (riskPart.includes("HIGH")) riskLevel = "HIGH";
      else if (riskPart.includes("MED")) riskLevel = "MEDIUM";
      else riskLevel = "LOW";

      reason = parts.slice(1).join(" ").trim();
    } else {
      const upper = text.toUpperCase();
      if (upper.includes("HIGH")) riskLevel = "HIGH";
      else if (upper.includes("MED")) riskLevel = "MEDIUM";
      else riskLevel = "LOW";

      reason = text.replace(/^(LOW|MEDIUM|HIGH)\s*[-:–—|•\s]*/i, "").trim();
    }

    // Clean up reason: strip any leftover RISK/LOW/MEDIUM/HIGH tokens, dashes, punctuation, brackets and quotes
    reason = reason
      .replace(/^(RISK|LOW|MEDIUM|HIGH)\s*[-:–—|•]\s*/gi, "")
      .replace(/^[-:–—|•\s]+/g, "")
      .replace(/[<>{}"`|:]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/[.]+$/, "")
      .trim();

    // Deduplicate consecutive repeated words and strip punctuation
    const rawWords = reason
      .split(/\s+/)
      .map((w) => w.replace(/[.,;:!?]+$/, ""))
      .filter((w) => w.length > 0 && !/^[-:–—|•]$/.test(w));

    const dedupedWords: string[] = [];
    for (const w of rawWords) {
      if (
        w.toLowerCase() !== "risk" &&
        w.toLowerCase() !== "low" &&
        w.toLowerCase() !== "medium" &&
        w.toLowerCase() !== "high" &&
        (dedupedWords.length === 0 || dedupedWords[dedupedWords.length - 1].toLowerCase() !== w.toLowerCase())
      ) {
        dedupedWords.push(w);
      }
    }

    // Natural 3-5 word summary without arbitrary "profile" padding loops
    let normalizedReason = "";
    if (dedupedWords.length >= 2) {
      if (dedupedWords.length === 2 && dedupedWords[1].toLowerCase() === "financial") {
        dedupedWords.push("site");
      }
      normalizedReason = dedupedWords.slice(0, 5).join(" ");
      normalizedReason = normalizedReason.charAt(0).toUpperCase() + normalizedReason.slice(1);
    } else {
      normalizedReason =
        riskLevel === "LOW"
          ? "Verified safe website profile"
          : riskLevel === "MEDIUM"
          ? "Unverified platform proceed carefully"
          : "Likely scam website warning";
    }

    // Cache the domain verdict in chrome.storage.local for 24 hours
    await setCachedDomainVerdict(input.url, riskLevel, normalizedReason);

    return {
      riskLevel,
      reason: normalizedReason,
      inferenceSource: "ON_DEVICE",
      latencyMs,
      details: text
    };
  } catch (err) {
    console.warn("[HybridGuard] firebase/ai on-device inference error, activating local heuristic fallback:", err);
  }

  // Fallback on-device heuristic evaluation
  const localAnalysis = evaluateLocalHeuristics(input);
  const latencyMs = Math.max(4, Math.round(performance.now() - startTime));

  // Also cache fallback verdict so repeated queries are instant (< 50ms)
  await setCachedDomainVerdict(input.url, localAnalysis.riskLevel, localAnalysis.reason);

  return {
    riskLevel: localAnalysis.riskLevel,
    reason: localAnalysis.reason,
    inferenceSource: "ON_DEVICE",
    latencyMs,
    details: localAnalysis.details,
    fallbackApplied: true
  };
}
