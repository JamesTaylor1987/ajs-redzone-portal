import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase-server";
import { ProductForm } from "../../ProductForm";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function EditProductPage({ params }: PageProps) {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!data) notFound();

  const product = data as Product;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/products"
          className="text-ajs-muted text-sm hover:underline"
        >
          ← Products
        </Link>
        <span className="text-ajs-light">/</span>
        <span className="font-mono font-bold text-ajs-dark">{product.sku}</span>
      </div>
      <h1 className="text-xl font-extrabold text-ajs-dark">Edit product</h1>
      <ProductForm product={product} />
    </div>
  );
}
