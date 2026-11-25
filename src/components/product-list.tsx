import { ProductCard } from "@/components/product-card";
import type { ProductView } from "@/lib/products/serialize";

type ProductListProps = {
  products: ProductView[];
};

export function ProductList({ products }: ProductListProps) {
  if (products.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-10 text-center">
        <h2 className="text-base font-semibold text-zinc-100">No products yet</h2>
        <p className="mt-2 text-sm text-muted">
          Add your first Amazon BR or Kabum product to start monitoring.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Monitored products</h2>
          <p className="mt-1 text-sm text-muted">
            {products.length} product{products.length === 1 ? "" : "s"} registered
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
