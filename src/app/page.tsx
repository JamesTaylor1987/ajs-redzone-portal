import { getPublicServerClient, getServiceClient } from "@/lib/supabase-server";
import type { Product } from "@/lib/types";
import { PortalApp } from "@/components/PortalApp";
import { DEFAULT_STOCK_COLOURS, type StockColours } from "@/lib/stock-colours";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = getPublicServerClient();
  const serviceClient = getServiceClient();

  const [{ data, error }, { data: settings }, { data: imageRows }] = await Promise.all([
    supabase.from("products").select("*").eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("settings").select("key, value").in("key", ["stock_color_in_stock", "stock_color_low_stock", "stock_color_out_of_stock"]),
    serviceClient.from("product_images").select("product_id, url").order("sort_order", { ascending: true }),
  ]);

  if (error) {
    return (
      <main className="p-8 max-w-xl mx-auto">
        <h1 className="text-xl font-bold text-ajs-danger mb-3">
          Couldn&apos;t load the catalogue
        </h1>
        <p className="text-ajs-muted text-sm">
          The database returned: <code>{error.message}</code>
        </p>
        <p className="text-ajs-muted text-sm mt-3">
          Check that <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set, and that the schema
          + seed SQL has been run.
        </p>
      </main>
    );
  }

  const kvMap = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
  const stockColours: StockColours = {
    inStock:    kvMap["stock_color_in_stock"]     ?? DEFAULT_STOCK_COLOURS.inStock,
    lowStock:   kvMap["stock_color_low_stock"]    ?? DEFAULT_STOCK_COLOURS.lowStock,
    outOfStock: kvMap["stock_color_out_of_stock"] ?? DEFAULT_STOCK_COLOURS.outOfStock,
  };

  const products: Product[] = (data ?? []) as Product[];

  const productImages: Record<string, string[]> = {};
  for (const row of imageRows ?? []) {
    if (!productImages[row.product_id]) productImages[row.product_id] = [];
    productImages[row.product_id].push(row.url);
  }

  return <PortalApp products={products} productImages={productImages} stockColours={stockColours} />;
}
