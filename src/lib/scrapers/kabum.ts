import * as cheerio from "cheerio";
import { Store } from "@/generated/prisma/enums";
import { fetchHtml } from "@/lib/scrapers/http";
import { parseBrazilianPrice } from "@/lib/scrapers/parse-price";
import {
  ScraperError,
  type ScrapeResult,
  type ScraperStrategy,
} from "@/lib/scrapers/types";

const KABUM_HOST_PATTERN = /(^|\.)kabum\.com\.br$/i;

type JsonLdProduct = {
  "@type"?: string | string[];
  name?: string;
  offers?: {
    price?: string | number;
    availability?: string;
  };
};

type KabumProductPayload = {
  title?: unknown;
  price?: unknown;
  available?: unknown;
  isAvailable?: unknown;
  quantity?: unknown;
  prices?: {
    price?: unknown;
    priceWithDiscount?: unknown;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asProductType(typeValue: string | string[] | undefined): boolean {
  if (!typeValue) {
    return false;
  }

  const types = Array.isArray(typeValue) ? typeValue : [typeValue];
  return types.some((type) => type.toLowerCase().includes("product"));
}

function toPositivePrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value * 100) / 100;
  }

  if (typeof value === "string") {
    return parseBrazilianPrice(value);
  }

  return null;
}

function toTitle(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const title = value.replace(/\s+/g, " ").trim();
  return title.length > 0 ? title : null;
}

function extractFromJsonLd($: cheerio.CheerioAPI): {
  title: string | null;
  price: number | null;
  available: boolean | null;
} {
  let title: string | null = null;
  let price: number | null = null;
  let available: boolean | null = null;

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).html();
    if (!raw) {
      return;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const candidate of candidates) {
        if (!isRecord(candidate)) {
          continue;
        }

        const product = candidate as JsonLdProduct;
        if (!asProductType(product["@type"])) {
          continue;
        }

        title = toTitle(product.name) ?? title;
        price = toPositivePrice(product.offers?.price) ?? price;

        const availability = product.offers?.availability?.toLowerCase() ?? "";
        if (availability.includes("outofstock") || availability.includes("soldout")) {
          available = false;
        } else if (
          availability.includes("instock") ||
          availability.includes("instoreonly")
        ) {
          available = true;
        }
      }
    } catch {
      // Ignore invalid JSON-LD blocks and keep trying other strategies.
    }
  });

  return { title, price, available };
}

function extractFromNextData($: cheerio.CheerioAPI): {
  title: string | null;
  price: number | null;
  available: boolean | null;
} {
  const raw = $("#__NEXT_DATA__").html();
  if (!raw) {
    return { title: null, price: null, available: null };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return { title: null, price: null, available: null };
    }

    const props = parsed.props;
    if (!isRecord(props)) {
      return { title: null, price: null, available: null };
    }

    const pageProps = props.pageProps;
    if (!isRecord(pageProps)) {
      return { title: null, price: null, available: null };
    }

    const productValue = pageProps.product;
    if (!isRecord(productValue)) {
      return { title: null, price: null, available: null };
    }

    const product = productValue as KabumProductPayload;
    const title = toTitle(product.title);
    const price =
      toPositivePrice(product.prices?.priceWithDiscount) ??
      toPositivePrice(product.prices?.price) ??
      toPositivePrice(product.price);

    let available: boolean | null = null;
    if (typeof product.available === "boolean") {
      available = product.available;
    } else if (typeof product.isAvailable === "boolean") {
      available = product.isAvailable;
    } else if (typeof product.quantity === "number") {
      available = product.quantity > 0;
    }

    return { title, price, available };
  } catch {
    return { title: null, price: null, available: null };
  }
}

function extractTitle($: cheerio.CheerioAPI): string | null {
  const candidates = [
    $("h1").first().text(),
    $('meta[property="og:title"]').attr("content"),
    $('meta[name="twitter:title"]').attr("content"),
    $("title").first().text(),
  ];

  for (const candidate of candidates) {
    const title = toTitle(candidate);
    if (title) {
      return title;
    }
  }

  return null;
}

function extractPrice($: cheerio.CheerioAPI): number | null {
  const metaAmount = $('meta[property="product:price:amount"]').attr("content");
  if (metaAmount) {
    const price = parseBrazilianPrice(metaAmount);
    if (price !== null) {
      return price;
    }
  }

  const selectors = [
    "[data-testid='price-value']",
    ".finalPrice",
    ".priceCard",
    ".price-box .price",
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    const price = parseBrazilianPrice(text);
    if (price !== null) {
      return price;
    }
  }

  return null;
}

function extractAvailability($: cheerio.CheerioAPI): boolean {
  const bodyText = $("body").text().toLowerCase();

  if (
    bodyText.includes("produto indisponível") ||
    bodyText.includes("produto esgotado") ||
    bodyText.includes("fora de estoque")
  ) {
    return false;
  }

  return true;
}

export const kabumScraper: ScraperStrategy = {
  store: Store.KABUM,

  matches(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return KABUM_HOST_PATTERN.test(hostname);
    } catch {
      return false;
    }
  },

  async scrape(url: string): Promise<ScrapeResult> {
    const html = await fetchHtml(url, { store: Store.KABUM });
    const $ = cheerio.load(html);

    const nextData = extractFromNextData($);
    const jsonLd = extractFromJsonLd($);

    const title = nextData.title ?? jsonLd.title ?? extractTitle($);
    const price = nextData.price ?? jsonLd.price ?? extractPrice($);
    const available =
      nextData.available ?? jsonLd.available ?? extractAvailability($);

    if (!title || price === null) {
      throw new ScraperError(
        "PARSE",
        "Could not parse Kabum product title or price",
        { store: Store.KABUM, url },
      );
    }

    return {
      title,
      price,
      available,
      store: Store.KABUM,
      url,
    };
  },
};
