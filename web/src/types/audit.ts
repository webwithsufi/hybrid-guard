export type PrivacyGrade = "A+" | "A" | "B" | "C" | "D" | "F";

export interface PrivacyPolicyBreakdown {
  grade: PrivacyGrade;
  gradeReason: string;
  summary: string;
  dataPills?: string[];
  dataCollected: string[];
  sellsOrSharesData: {
    doesSellOrShare: boolean;
    explanation: string;
  };
  cookiesAndPermissionsAdvice: {
    cookieAdvice: string;
    permissionAdvice: string;
    recommendedAction: string;
  };
}

export interface StructuredRiskBreakdown {
  threatCategory: string;
  severityScore: number; // 0 - 100
  attackVector: string;
  dataExposureRisk: string;
  heuristicsMatched: string[];
  mitigationSteps: string[];
  summary: string;
}

export interface CloudEscalationResult {
  grade: PrivacyGrade;
  gradeReason: string;
  summary: string;
  dataPills?: string[];
  dataCollected: string[];
  sellsOrSharesData: {
    doesSellOrShare: boolean;
    explanation: string;
  };
  cookiesAndPermissionsAdvice: {
    cookieAdvice: string;
    permissionAdvice: string;
    recommendedAction: string;
  };
  riskBreakdown: StructuredRiskBreakdown;
  gdprCcpaNotice?: string;
  inferenceSource: "IN_CLOUD";
  cloudLatencyMs: number;
}

export interface DomainAudit {
  id: string;
  domain: string;
  targetUrl: string;
  policyUrl?: string;
  rawUrl?: string;
  title: string;
  snippet?: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
  inferenceSource: "ON_DEVICE" | "IN_CLOUD";
  onDeviceLatencyMs?: number;
  piiScrubLatencyMs?: number;
  totalLocalLatencyMs?: number;
  scannedAt: string;
  rawSnippet: string;
  scrubbedContent: string;
  piiRemoved: string[];
  piiCount: number;
  zeroPiiVerified: boolean;
  status: string;
  blockedPermissions?: string[];
  detectedCookies?: {
    hasBanner: boolean;
    bannerText?: string;
    advice?: string;
  } | null;
  detectedPermissions?: string[];
  cloudAnalysis?: CloudEscalationResult | null;
}
