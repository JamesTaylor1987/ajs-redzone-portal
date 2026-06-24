import Link from "next/link";
import Image from "next/image";
import { getServiceClient } from "@/lib/supabase-server";
import { DeactivateButton } from "./DeactivateButton";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  panel:         "Control Panels",
  sensor:        "Sensors",
  accessory:     "Accessories",
  software:      "Software",
  peripheral:    "Peripherals",
  visual_factory:"Visual Factory",
};

const CATEGORY_ORDER = ["panel", "sensor", "accessory", "software", "peripheral", "visual_factory"];

export default async function AdminProductsPage() {
  const supabase = getServiceClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, sku, name, category, price_gbp_pence, stock_status, active, image_url, sort_order")
    .order("sort_order", { ascending: true });

  // Group by category, preserving section order
  const grouped = new Map<string, typeof products>([]);
  for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
  for (const p of products ?? []) {
    const key = CATEGORY_ORDER.includes(p.category) ? p.category : p.category;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }
  const sections = [...grouped.entries()].filter(([, rows]) => (rows?.length ?? 0) > 0);

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

      {!products?.length ? (
        <div className="bg-white rounded-xl border border-ajs-light p-8 text-center text-ajs-muted text-sm">
          No products yet.{" "}
          <Link href="/admin/products/new" className="text-ajs-primary underline">
            Add the first one.
          </Link>
        </div>
      ) : (
        sections.map(([category, rows]) => (
          <div key={category} className="bg-white rounded-xl border border-ajs-light overflow-hidden shadow-sm">
            <div className="px-5 py-2.5 border-b border-ajs-light bg-slate-50">
              <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">
                {CATEGORY_LABEL[category] ?? category}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="border-b border-ajs-light text-ajs-dark">
                  <tr>
                    <Th></Th>
                    <Th>#</Th>
                    <Th>SKU</Th>
                    <Th>Name</Th>
                    <Th>Price</Th>
                    <Th>Stock</Th>
                    <Th>Active</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ajs-light">
                  {(rows ?? []).map((p, i) => (
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
                      <td className="px-3 py-2 text-xs font-bold text-ajs-light w-8">{i + 1}</td>
                      <td className="px-4 py-2 font-mono text-xs font-bold text-ajs-dark">{p.sku}</td>
                      <td className="px-4 py-2 font-medium text-ajs-text">{p.name}</td>
                      <td className="px-4 py-2 font-semibold">{gbp(p.price_gbp_pence)}</td>
                      <td className="px-4 py-2 text-ajs-muted">{p.stock_status}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${p.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="text-ajs-primary text-xs font-semibold hover:underline"
                          >
                            Edit
                          </Link>
                          <DeactivateButton id={p.id} name={p.name} active={p.active} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
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
