"use client";

import { useState } from "react";
import type { CartLine, CheckoutDetails, Currency, CreateQuoteResponse } from "@/lib/types";
import { formatMoney, getFxRate } from "@/lib/format";

interface CheckoutFormProps {
  lines: CartLine[];
  currency: Currency;
  onBack: () => void;
  onSuccess: (response: CreateQuoteResponse) => void;
}

const EMPTY: CheckoutDetails = {
  contactName: "",
  contactCompany: "",
  contactEmail: "",
  contactPhone: "",
  siteAddressLine1: "",
  siteAddressLine2: "",
  siteAddressCity: "",
  siteAddressPostcode: "",
  siteCountry: "United Kingdom",
  requiredDate: "",
  projectDescription: "",
  installRequested: false,
};

export function CheckoutForm({ lines, currency, onBack, onSuccess }: CheckoutFormProps) {
  const [details, setDetails] = useState<CheckoutDetails>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPricePence, 0);

  const set =
    <K extends keyof CheckoutDetails>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value: CheckoutDetails[K] =
        (e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value) as CheckoutDetails[K];
      setDetails((d) => ({ ...d, [key]: value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!details.contactName.trim() || !details.contactEmail.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (lines.length === 0) {
      setError("Basket is empty.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          fxRateUsed: currency === "EUR" ? getFxRate("EUR") : null,
          lines,
          details,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error (${res.status})`);
      }
      const data: CreateQuoteResponse = await res.json();
      onSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white rounded-xl border border-ajs-light p-4">
        <h2 className="font-bold text-lg mb-3 text-ajs-dark">Your details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full name *" required value={details.contactName} onChange={set("contactName")} />
          <Field label="Company" value={details.contactCompany} onChange={set("contactCompany")} />
          <Field label="Email *" type="email" required value={details.contactEmail} onChange={set("contactEmail")} />
          <Field label="Phone" type="tel" value={details.contactPhone} onChange={set("contactPhone")} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-ajs-light p-4">
        <h2 className="font-bold text-lg mb-3 text-ajs-dark">Delivery / site address</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Address line 1" value={details.siteAddressLine1} onChange={set("siteAddressLine1")} className="sm:col-span-2" />
          <Field label="Address line 2" value={details.siteAddressLine2} onChange={set("siteAddressLine2")} className="sm:col-span-2" />
          <Field label="Town / City" value={details.siteAddressCity} onChange={set("siteAddressCity")} />
          <Field label="Postcode" value={details.siteAddressPostcode} onChange={set("siteAddressPostcode")} />
          <Field label="Country" value={details.siteCountry} onChange={set("siteCountry")} className="sm:col-span-2" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-ajs-light p-4">
        <h2 className="font-bold text-lg mb-3 text-ajs-dark">Project details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Required delivery date" type="date" value={details.requiredDate} onChange={set("requiredDate")} />
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
              Project / order description
            </label>
            <textarea
              value={details.projectDescription}
              onChange={set("projectDescription")}
              rows={3}
              className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
              placeholder="Brief description of the site or use case…"
            />
          </div>
          <label className="sm:col-span-2 flex items-start gap-2 text-sm text-ajs-text">
            <input
              type="checkbox"
              checked={details.installRequested}
              onChange={set("installRequested")}
              className="mt-0.5 accent-ajs-primary"
            />
            <span>
              Request an installation quote alongside this order.
              <span className="text-ajs-muted block text-xs mt-0.5">
                Standard installation covers M12 connections and 230V systems. We&apos;ll come back with a quote separately.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-ajs-light p-4">
        <h2 className="font-bold text-lg mb-3 text-ajs-dark">Order summary</h2>
        <ul className="divide-y divide-ajs-light text-sm">
          {lines.map((l) => (
            <li key={l.productId} className="py-2 flex justify-between gap-2">
              <span>
                <span className="font-mono text-xs text-ajs-muted">{l.sku}</span>{" "}
                {l.name} × {l.qty}
              </span>
              <span className="font-semibold">
                {formatMoney(l.qty * l.unitPricePence, currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between font-bold text-lg pt-3 mt-2 border-t border-ajs-light">
          <span>Total</span>
          <span>{formatMoney(subtotal, currency)}</span>
        </div>
        <div className="text-xs text-ajs-muted mt-2 space-y-1 leading-relaxed">
          <p>
            <strong className="text-ajs-text">All prices ex-VAT.</strong> VAT is applied on the
            invoice based on your country and VAT registration status:
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>UK customers — 20% VAT</li>
            <li>EU VAT-registered businesses — zero-rated under reverse charge (VAT number required)</li>
            <li>Non-EU customers — zero-rated export</li>
          </ul>
          <p>Hardware invoiced 100% prior to shipment. DAP delivery terms.</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3 rounded-lg border border-ajs-light text-ajs-muted hover:bg-ajs-light"
        >
          ← Back to basket
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 rounded-lg font-bold text-white bg-ajs-primary hover:bg-ajs-dark disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit quote request"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  required,
  className = "",
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
      />
    </div>
  );
}
