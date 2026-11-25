import { resolveScraperByUrl } from "@/lib/scrapers/registry";
import { ScraperError } from "@/lib/scrapers/types";

async function main(): Promise<void> {
  const url = process.argv[2];

  if (!url) {
    console.error("Usage: npx tsx src/scripts/test-scraper.ts <product-url>");
    process.exitCode = 1;
    return;
  }

  try {
    const scraper = resolveScraperByUrl(url);
    console.log(`Store: ${scraper.store}`);
    console.log("Scraping...");

    const result = await scraper.scrape(url);

    console.log(
      JSON.stringify(
        {
          store: result.store,
          title: result.title,
          price: result.price,
          available: result.available,
          url: result.url,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (error instanceof ScraperError) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            code: error.code,
            message: error.message,
            statusCode: error.statusCode ?? null,
            store: error.store ?? null,
            url: error.url ?? url,
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }

    console.error("Unexpected error while scraping", error);
    process.exitCode = 1;
  }
}

void main();
