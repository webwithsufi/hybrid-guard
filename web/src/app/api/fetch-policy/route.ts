import { NextRequest, NextResponse } from "next/server";

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function findPrivacyPolicyLink(html: string, baseUrl: string): string | null {
  // 1. Search for anchor tag with privacy policy text
  const match = html.match(
    /<a\b[^>]*href=["']([^"']*)["'][^>]*>[\s\S]*?(?:privacy\s*policy|privacy\s*notice|privacy|datenschutz|politica)[\s\S]*?<\/a>/i
  );
  if (match && match[1]) {
    try {
      return new URL(match[1], baseUrl).href;
    } catch {
      // ignore
    }
  }

  // 2. Search for href containing privacy in the link itself
  const hrefMatch = html.match(/href=["']([^"']*(?:privacy|legal\/privacy|privacy-policy)[^"']*)["']/i);
  if (hrefMatch && hrefMatch[1]) {
    try {
      return new URL(hrefMatch[1], baseUrl).href;
    } catch {
      // ignore
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let rawUrl = (body.url || "").trim();

    if (!rawUrl) {
      return NextResponse.json({ error: "Please provide a valid website URL" }, { status: 400 });
    }

    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = "https://" + rawUrl;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: "Invalid website URL format" }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const domain = hostname.replace(/^www\./i, "");

    const BROWSER_UA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

    let pageHtml = "";
    let policyUrl = `${parsedUrl.origin}/privacy`;
    let isFallback = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(parsedUrl.href, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none"
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[fetch-policy] Non-200 response (${response.status}) for ${parsedUrl.href}`);
        isFallback = true;
      } else {
        pageHtml = await response.text();
      }
    } catch (fetchErr) {
      console.warn(`[fetch-policy] Fetch error or timeout for ${parsedUrl.href}:`, fetchErr);
      isFallback = true;
    }

    // Try finding and fetching policy page if main page loaded
    if (!isFallback && pageHtml) {
      const discoveredPolicyLink = findPrivacyPolicyLink(pageHtml, parsedUrl.href);
      if (discoveredPolicyLink) {
        policyUrl = discoveredPolicyLink;
        try {
          const policyCtrl = new AbortController();
          const policyTimeout = setTimeout(() => policyCtrl.abort(), 4500);

          const policyResp = await fetch(policyUrl, {
            method: "GET",
            signal: policyCtrl.signal,
            headers: {
              "User-Agent": BROWSER_UA,
              Accept: "text/html,text/plain;q=0.9"
            }
          });
          clearTimeout(policyTimeout);

          if (policyResp.ok) {
            const policyHtml = await policyResp.text();
            if (policyHtml && policyHtml.length > 200) {
              pageHtml = policyHtml;
            }
          }
        } catch (policyErr) {
          console.warn(`[fetch-policy] Policy page fetch timeout for ${policyUrl}`);
        }
      }
    }

    const rawCleanText = pageHtml ? stripHtml(pageHtml).slice(0, 4500) : "";

    return NextResponse.json({
      success: true,
      fallback: isFallback || rawCleanText.length < 50,
      domain,
      hostname,
      targetUrl: parsedUrl.href,
      policyUrl,
      rawCleanText
    });
  } catch (err: any) {
    console.error("[fetch-policy] Unhandled error:", err);
    return NextResponse.json(
      {
        success: true,
        fallback: true,
        domain: "unknown",
        hostname: "unknown",
        targetUrl: "",
        policyUrl: "",
        rawCleanText: ""
      },
      { status: 200 }
    );
  }
}
