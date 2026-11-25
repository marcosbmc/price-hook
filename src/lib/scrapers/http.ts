import type { Store } from "@/generated/prisma/enums";
import { ScraperError } from "@/lib/scrapers/types";

const DEFAULT_TIMEOUT_MS = 15_000;

const DEFAULT_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "sec-ch-ua":
    '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};

export async function fetchHtml(
  url: string,
  options: { store: Store; timeoutMs?: number },
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
      redirect: "follow",
    });

    if (response.status === 403 || response.status === 429) {
      throw new ScraperError(
        "BLOCKED",
        `Store blocked the request with HTTP ${response.status}`,
        {
          statusCode: response.status,
          store: options.store,
          url,
        },
      );
    }

    if (!response.ok) {
      throw new ScraperError(
        "NETWORK",
        `Failed to fetch product page with HTTP ${response.status}`,
        {
          statusCode: response.status,
          store: options.store,
          url,
        },
      );
    }

    return await response.text();
  } catch (error) {
    if (error instanceof ScraperError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new ScraperError("TIMEOUT", `Request timed out after ${timeoutMs}ms`, {
        store: options.store,
        url,
        cause: error,
      });
    }

    throw new ScraperError("NETWORK", "Network error while fetching product page", {
      store: options.store,
      url,
      cause: error,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
