import { Suspense } from "react";
import { connection } from "next/server";
import { listProducts } from "@/app/actions/products";
import { ProductForm } from "@/components/product-form";
import { ProductList } from "@/components/product-list";

async function MonitoredProducts() {
  await connection();
  const products = await listProducts();
  return <ProductList products={products} />;
}

function ProductsFallback() {
  return (
    <section className="rounded-2xl border border-border bg-surface/40 px-5 py-10 text-center">
      <p className="text-sm text-muted">Loading products...</p>
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          PriceHook
        </p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Monitor prices. Get Discord alerts when deals hit your target.
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
          Track Amazon BR and Kabum products, keep a price history, and fire webhook
          alerts without exposing your cron secret in the browser.
        </p>
      </header>

      <ProductForm />
      <Suspense fallback={<ProductsFallback />}>
        <MonitoredProducts />
      </Suspense>
    </main>
  );
}
