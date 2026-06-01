import Link from "next/link";
import Image from "next/image";
import { getServiceClient } from "@/lib/supabase-server";
import { deleteProductAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const supabase = getServiceClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, sku, name, category, price_gbp_pence, stock_status, active, image_url, sort_order")
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-ajs-dark">Products</h1>
        <Link
          href="/admin/products/new"
          className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors"
        >
          + Add product
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden shadow-sm">
        {!products?.length ? (
          <div className="p-8 text-center text-ajs-muted text-sm">
            No products yet.{" "}
            <Link href="/admin/products/new" className="text-ajs-primary underline">
              Add the first one.
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-ajs-light bg-slate-50 text-ajs-dark">
              <tr>
                <Th></Th>
                <Th>SKU</Th>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Price</Th>
                <Th>Stock</Th>
                <Th>Active</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ajs-light">
              {products.map((p) => (
                <tr
                  key={p.id}
                  className={`hover:bg-slate-50 transition-colors ${!p.active ? "opacity-50" : ""}`}
                >
                  <td className="pl-4 py-2 w-12">
                    {p.image_url ? (
                      <Image
                        src={p.image_url}
                        alt=""
                        width={40}
                        height={40}
                        className="rounded border border-ajs-light object-contain bg-white"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded border border-ajs-light bg-slate-100 flex items-center justify-center text-[9px] font-mono text-ajs-muted">
                        {p.sku.slice(0, 4)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-ajs-muted">
                    {p.sku}
                  </td>
                  <td className="px-4 py-2 font-medium text-ajs-text">{p.name}</td>
                  <td className="px-4 py-2 capitalize text-ajs-muted">{p.category}</td>
                  <td className="px-4 py-2 font-semibold">{gbp(p.price_gbp_pence)}</td>
                  <td className="px-4 py-2 text-ajs-muted">{p.stock_status}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${p.active ? "bg-emerald-500" : "bg-slate-300"}`}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="text-ajs-primary text-xs font-semibold hover:underline"
                      >
                        Edit
                      </Link>
                      <form action={deleteProductAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="text-rose-500 text-xs font-semibold hover:underline"
                          onClick={(e) => {
                            if (
                              !confirm(
                                `Deactivate "${p.name}"? It won't appear in the catalogue.`,
                              )
                            ) {
                              e.preventDefault();
                            }
                          }}
                        >
                          Deactivate
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide">
      {children}
    </th>
  );
}

function gbp(pence: number | null) {
  if (pence == null) return "—";
  return (
    "£" +
    (pence / 100).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
