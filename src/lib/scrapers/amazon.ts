import * as cheerio from "cheerio";
import { Store } from "@/generated/prisma/enums";
import { fetchHtml } from "@/lib/scrapers/http";
import { parseBrazilianPrice } from "@/lib/scrapers/parse-price";
import {
  ScraperError,
  type ScrapeResult,
  type ScraperStrategy,
} from "@/lib/scrapers/types";

const AMAZON_HOST_PATTERN = /(^|\.)amazon\.com\.br$/i;

function extractTitle($: cheerio.CheerioAPI): string | null {
  const candidates = [
    $("#productTitle").first().text(),
    $("#title").first().text(),
    $('meta[property="og:title"]').attr("content"),
    $("title").first().text(),
  ];

  for (const candidate of candidates) {
    const title = candidate?.replace(/\s+/g, " ").trim();
    if (title) {
      return title;
    }
  }

  return null;
}

function extractPrice($: cheerio.CheerioAPI): number | null {
  const selectors = [
    "#corePrice_feature_div .a-price .a-offscreen",
    "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
    "#apex_desktop .a-price .a-offscreen",
    ".a-price .a-offscreen",
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    "#price_inside_buybox",
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    const price = parseBrazilianPrice(text);
    if (price !== null) {
      return price;
    }
  }

  const whole = $(".a-price-whole").first().text();
  const fraction = $(".a-price-fraction").first().text();
  if (whole) {
    const combined = `R$ ${whole}${fraction ? `,${fraction}` : ""}`;
    const price = parseBrazilianPrice(combined);
    if (price !== null) {
      return price;
    }
  }

  return null;
}

function extractAvailability($: cheerio.CheerioAPI): boolean {
  const availabilityText = $("#availability").text().toLowerCase();
  const buyBoxText = $("#buybox").text().toLowerCase();
  const combined = `${availabilityText} ${buyBoxText}`;

  if (
    combined.includes("indisponível") ||
    combined.includes("unavailable") ||
    combined.includes("não temos") ||
    combined.includes("currently unavailable")
  ) {
    return false;
  }

  if (
    combined.includes("em estoque") ||
    combined.includes("in stock") ||
    $("#add-to-cart-button").length > 0
  ) {
    return true;
  }

  return $("#availability").length === 0;
}

export const amazonBrScraper: ScraperStrategy = {
  store: Store.AMAZON_BR,

  matches(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return AMAZON_HOST_PATTERN.test(hostname);
    } catch {
      return false;
    }
  },

  async scrape(url: string): Promise<ScrapeResult> {
    const html = await fetchHtml(url, { store: Store.AMAZON_BR });

    if (
      /awsWafCookieDomainList|captcha|robot check|validateCaptcha/i.test(html)
    ) {
      throw new ScraperError(
        "BLOCKED",
        "Amazon BR returned an anti-bot challenge page",
        { store: Store.AMAZON_BR, url, statusCode: 403 },
      );
    }

    const $ = cheerio.load(html);

    const title = extractTitle($);
    const price = extractPrice($);

    if (!title || price === null) {
      throw new ScraperError(
        "PARSE",
        "Could not parse Amazon BR product title or price",
        { store: Store.AMAZON_BR, url },
      );
    }

    return {
      title,
      price,
      available: extractAvailability($),
      store: Store.AMAZON_BR,
      url,
    };
  },
};
