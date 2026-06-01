import { getPublicServerClient } from "@/lib/supabase-server";
import type { Product } from "@/lib/types";
import { PortalApp } from "@/components/PortalApp";

// Always read fresh from DB while we're iterating; we'll add ISR later.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = getPublicServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

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

  const products: Product[] = (data ?? []) as Product[];

  return <PortalApp products={products} />;
}
