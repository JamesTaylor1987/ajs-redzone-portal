"use client";

import { useState } from "react";
import Image from "next/image";
import { upsertProductAction } from "./actions";
import type { Product } from "@/lib/types";

interface Props {
  product?: Product;
}

export function ProductForm({ product }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(
    product?.image_url ?? null,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const result = await upsertProductAction(formData);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
    // On success the action redirects.
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {product && <input type="hidden" name="id" value={product.id} />}

      <Section title="Core details">
        <Field label="SKU *" name="sku" required defaultValue={product?.sku} />
        <Field
          label="Name *"
          name="name"
          required
          defaultValue={product?.name}
          className="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={product?.description ?? ""}
            className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40 resize-none"
          />
        </div>
      </Section>

      <Section title="Classification">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
            Category *
          </label>
          <select
            name="category"
            required
            defaultValue={product?.category ?? "panel"}
            className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          >
            <option value="panel">Panel</option>
            <option value="sensor">Sensor</option>
            <option value="accessory">Accessory</option>
            <option value="software">Software</option>
            <option value="peripheral">Peripheral</option>
            <option value="visual_factory">Visual Factory</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
            PLC
          </label>
          <select
            name="plc"
            defaultValue={product?.plc ?? ""}
            className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          >
            <option value="">— Not applicable —</option>
            <option value="Siemens">Siemens</option>
            <option value="Allen Bradley">Allen Bradley</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
            Material
          </label>
          <select
            name="material"
            defaultValue={product?.material ?? ""}
            className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          >
            <option value="">— Not applicable —</option>
            <option value="Mild Steel">Mild Steel</option>
            <option value="Stainless Steel">Stainless Steel</option>
          </select>
        </div>
        <Field
          label="I/O count"
          name="io_count"
          type="number"
          defaultValue={product?.io_count?.toString() ?? ""}
        />
      </Section>

      <Section title="Pricing & availability">
        <Field
          label="Price (GBP, ex-VAT) *"
          name="price_gbp"
          type="number"
          required
          step="0.01"
          min="0"
          defaultValue={
            product ? (product.price_gbp_pence / 100).toFixed(2) : ""
          }
        />
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
            Stock status
          </label>
          <select
            name="stock_status"
            defaultValue={product?.stock_status ?? "In Stock"}
            className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          >
            <option>In Stock</option>
            <option>Limited Stock</option>
            <option>On Order</option>
          </select>
        </div>
        <Field
          label="Lead time"
          name="lead_time"
          defaultValue={product?.lead_time ?? "4–6 weeks"}
        />
        <Field
          label="Sort order"
          name="sort_order"
          type="number"
          defaultValue={product?.sort_order?.toString() ?? "0"}
        />
      </Section>

      <Section title="Image">
        <div className="sm:col-span-2">
          {preview && (
            <div className="mb-3">
              <Image
                src={preview}
                alt="Product preview"
                width={160}
                height={160}
                className="rounded-lg border border-ajs-light object-contain bg-white"
              />
            </div>
          )}
          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleImageChange}
            className="text-sm text-ajs-muted file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-ajs-light file:text-ajs-dark hover:file:bg-ajs-primary/10"
          />
          <p className="text-xs text-ajs-muted mt-1">
            JPG, PNG or WebP. Max 5 MB. Leave blank to keep existing image.
          </p>
        </div>
      </Section>

      <div className="bg-white rounded-xl border border-ajs-light p-5">
        <label className="flex items-center gap-2 text-sm text-ajs-text cursor-pointer">
          <input
            type="checkbox"
            name="active"
            defaultChecked={product ? product.active : true}
            className="accent-ajs-primary"
          />
          <span>
            <strong>Active</strong> — visible to customers in the catalogue
          </span>
        </label>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 rounded-lg font-bold text-white bg-ajs-primary hover:bg-ajs-dark disabled:opacity-50 transition-colors"
        >
          {submitting ? "Saving…" : product ? "Save changes" : "Add product"}
        </button>
        <a
          href="/admin/products"
          className="px-6 py-3 rounded-lg font-bold border border-ajs-light text-ajs-muted hover:bg-ajs-light transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-4">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  step,
  min,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  step?: string;
  min?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
        {label}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        step={step}
        min={min}
        className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
      />
    </div>
  );
}
