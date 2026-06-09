import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase-server";
import { ProductForm } from "../../ProductForm";
import { ProductImageGallery } from "../../ProductImageGallery";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function EditProductPage({ params }: PageProps) {
  const supabase = getServiceClient();

  const [{ data }, { data: images }] = await Promise.all([
    supabase.from("products").select("*").eq("id", params.id).single(),
    supabase
      .from("product_images")
      .select("id, url, sort_order")
      .eq("product_id", params.id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!data) notFound();
  const product = data as Product;

  // Fetch siblings in same category to calculate 1-based position within section
  const { data: catSiblings } = await supabase
    .from("products")
    .select("id, sort_order")
    .eq("category", product.category)
    .neq("id", params.id)
    .order("sort_order", { ascending: true });

  const currentPosition = (catSiblings ?? []).filter(s => s.sort_order < product.sort_order).length + 1;
  const sectionSize = (catSiblings ?? []).length + 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-ajs-muted text-sm hover:underline">
          ← Products
        </Link>
        <span className="text-ajs-light">/</span>
        <span className="font-mono font-bold text-ajs-dark">{product.sku}</span>
      </div>
      <h1 className="text-xl font-extrabold text-ajs-dark">Edit product</h1>
      <ProductForm product={product} currentPosition={currentPosition} sectionSize={sectionSize} />
      <div className="bg-white rounded-xl border border-ajs-light p-4">
        <ProductImageGallery productId={product.id} images={images ?? []} />
      </div>
    </div>
  );
}
