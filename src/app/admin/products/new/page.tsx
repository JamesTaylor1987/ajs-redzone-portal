import Link from "next/link";
import { ProductForm } from "../ProductForm";

export default function NewProductPage() {
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
        <span className="font-bold text-ajs-dark">New product</span>
      </div>
      <h1 className="text-xl font-extrabold text-ajs-dark">Add product</h1>
      <ProductForm />
    </div>
  );
}
