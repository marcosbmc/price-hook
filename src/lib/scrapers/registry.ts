import { amazonBrScraper } from "@/lib/scrapers/amazon";
import { kabumScraper } from "@/lib/scrapers/kabum";
import {
  ScraperError,
  type ScraperStrategy,
} from "@/lib/scrapers/types";
import type { Store } from "@/generated/prisma/enums";

const scrapers: readonly ScraperStrategy[] = [amazonBrScraper, kabumScraper];

export function detectStore(url: string): Store | null {
  const scraper = scrapers.find((candidate) => candidate.matches(url));
  return scraper?.store ?? null;
}

export function resolveScraperByUrl(url: string): ScraperStrategy {
  const scraper = scrapers.find((candidate) => candidate.matches(url));

  if (!scraper) {
    throw new ScraperError(
      "UNSUPPORTED",
      "Unsupported store. Currently supported: Amazon BR and Kabum",
      { url },
    );
  }

  return scraper;
}

export function resolveScraperByStore(store: Store): ScraperStrategy {
  const scraper = scrapers.find((candidate) => candidate.store === store);

  if (!scraper) {
    throw new ScraperError(
      "UNSUPPORTED",
      `No scraper registered for store: ${store}`,
      { store },
    );
  }

  return scraper;
}

export function listSupportedScrapers(): readonly ScraperStrategy[] {
  return scrapers;
}
