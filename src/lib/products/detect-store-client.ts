/** Client-safe store detection (no scraper imports). */
export function detectStoreFromUrl(url: string): "AMAZON_BR" | "KABUM" | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (/(^|\.)amazon\.com\.br$/.test(hostname)) {
      return "AMAZON_BR";
    }
    if (/(^|\.)kabum\.com\.br$/.test(hostname)) {
      return "KABUM";
    }
    return null;
  } catch {
    return null;
  }
}
