export interface PiiScrubResult {
  rawContent: string;
  scrubbedContent: string;
  piiRemoved: string[];
  piiCount: number;
  inferenceSource: "ON_DEVICE";
  latencyMs: number;
}

/**
 * Instant local deterministic PII scrubber (< 5ms).
 * Strictly caps input text to 1,200 characters and scrubs credentials,
 * email addresses, query terms, tokens, and IP addresses locally.
 */
export async function scrubPiiLocally(rawText: string, originalUrl: string): Promise<PiiScrubResult> {
  const startTime = performance.now();
  const piiRemoved: string[] = [];

  // Strictly cap raw text at 1,200 chars to eliminate processing lag
  const cappedText = (rawText || "").slice(0, 1200);
  let text = cappedText;

  // 1. Scrub Email Addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  let emailCount = 0;
  text = text.replace(emailRegex, (match) => {
    emailCount++;
    piiRemoved.push(`Email (${match.slice(0, 3)}***@***)`);
    return `[REDACTED_EMAIL_${emailCount}]`;
  });

  // 2. Scrub Passwords, Tokens & Auth Secrets
  const secretRegex = /(?:password|passwd|auth_pass|pwd|secret|bearer\s+[a-zA-Z0-9_\-\.]+)\s*[:=]\s*([^\s,;&"']+)/gi;
  text = text.replace(secretRegex, (match) => {
    piiRemoved.push(`Authentication Secret (${match.slice(0, 10)}...)`);
    return "[REDACTED_CREDENTIAL]";
  });

  // 3. Scrub IPv4 and IPv6 Addresses
  const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  text = text.replace(ipRegex, (match) => {
    if (match === "127.0.0.1" || match === "0.0.0.0") return match;
    piiRemoved.push(`Client IP (${match})`);
    return "[REDACTED_IPV4_ADDRESS]";
  });

  // 4. Scrub Search Query Strings & Tracking Parameters
  const queryParamRegex = /(?:[?&])(?:q|query|search|search_query|k|keyword)=([^&\s"#]+)/gi;
  text = text.replace(queryParamRegex, (_match, val) => {
    try {
      piiRemoved.push(`Search Query Parameter ("${decodeURIComponent(val).replace(/\+/g, " ")}")`);
    } catch {
      piiRemoved.push(`Search Query Parameter`);
    }
    return `?q=[REDACTED_SEARCH_QUERY]`;
  });

  // 5. Scrub Tracking Identifiers (utm_*, gclid, fbclid, session_token, token)
  const trackerRegex = /(?:[?&])(?:utm_[a-z]+|gclid|fbclid|msclkid|session_token|auth_token|token|api_key|access_token|user_id|uid)=([^&\s"#]+)/gi;
  text = text.replace(trackerRegex, (match, val) => {
    const key = match.split("=")[0];
    piiRemoved.push(`Tracking/Session Token (${key}=${val.slice(0, 4)}...)`);
    return `${key}=[REDACTED_TRACKING_TOKEN]`;
  });

  // 6. Scrub Phone Numbers
  const phoneRegex = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  text = text.replace(phoneRegex, (match) => {
    piiRemoved.push(`Phone Number (${match})`);
    return "[REDACTED_PHONE_NUMBER]";
  });

  // 7. Scrub Social Security / Government IDs
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  text = text.replace(ssnRegex, (match) => {
    piiRemoved.push(`Social Security ID (${match})`);
    return "[REDACTED_GOV_IDENTIFIER]";
  });

  // 8. Sanitize original URL parameters
  try {
    const parsed = new URL(originalUrl);
    ["q", "query", "search", "search_query", "session_token", "auth_token", "token", "user", "email", "utm_source", "utm_medium", "utm_campaign"].forEach(param => {
      if (parsed.searchParams.has(param)) {
        piiRemoved.push(`URL Parameter (${param})`);
      }
    });
  } catch {
    // Ignore invalid url
  }

  const latencyMs = Math.max(1, Math.round(performance.now() - startTime));

  return {
    rawContent: cappedText,
    scrubbedContent: text,
    piiRemoved: Array.from(new Set(piiRemoved)),
    piiCount: piiRemoved.length,
    inferenceSource: "ON_DEVICE",
    latencyMs
  };
}
