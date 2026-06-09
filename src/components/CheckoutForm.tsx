"use client";

import { useState } from "react";
import type { CartLine, CheckoutDetails, Currency, CreateQuoteResponse } from "@/lib/types";
import { formatMoney, getFxRate } from "@/lib/format";
import { SHIPPING_OPTIONS, calcPallets, calcShippingPence } from "@/lib/shipping";
import { useT } from "./LocaleProvider";

interface CheckoutFormProps {
  lines: CartLine[];
  currency: Currency;
  onBack: () => void;
  onSuccess: (response: CreateQuoteResponse) => void;
}

const EMPTY: CheckoutDetails = {
  contactFirstName: "",
  contactLastName: "",
  contactCompany: "",
  contactEmail: "",
  contactPhone: "",
  siteName: "",
  siteAddressLine1: "",
  siteAddressLine2: "",
  siteAddressCity: "",
  siteAddressPostcode: "",
  siteCountry: "United Kingdom",
  requiredDate: "",
  projectDescription: "",
  installRequested: false,
};

const PREFILL_KEY = "ajs_redzone_prefill_v2";
const AMEND_KEY   = "ajs_redzone_amend_ref_v1";

export function CheckoutForm({ lines, currency, onBack, onSuccess }: CheckoutFormProps) {
  const t = useT();

  const [details, setDetails] = useState<CheckoutDetails>(() => {
    if (typeof window === "undefined") return EMPTY;
    try {
      const saved = localStorage.getItem(PREFILL_KEY);
      if (saved) {
        localStorage.removeItem(PREFILL_KEY);
        return { ...EMPTY, ...(JSON.parse(saved) as Partial<CheckoutDetails>) };
      }
    } catch { /* ignore */ }
    return EMPTY;
  });

  const [originalQuoteRef] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const r = localStorage.getItem(AMEND_KEY);
      if (r) { localStorage.removeItem(AMEND_KEY); return r; }
    } catch { /* ignore */ }
    return null;
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPricePence, 0);
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const pallets = calcPallets(totalQty);
  const shippingPence = calcShippingPence(details.siteCountry, totalQty);
  const isEXW = shippingPence === null;
  const grandTotal = subtotal + (shippingPence ?? 0);

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
    if (!details.contactFirstName.trim() || !details.contactLastName.trim() || !details.contactEmail.trim()) {
      setError(t("errNameEmail"));
      return;
    }
    if (!details.contactCompany.trim()) {
      setError(t("errCompany"));
      return;
    }
    if (!details.contactPhone.trim()) {
      setError(t("errPhone"));
      return;
    }
    if (!details.siteName.trim()) {
      setError(t("errSiteName"));
      return;
    }
    if (!details.projectDescription.trim()) {
      setError(t("errProjectDesc"));
      return;
    }
    if (!details.requiredDate) {
      setError(t("errDate"));
      return;
    }
    if (lines.length === 0) {
      setError(t("errBasketEmpty"));
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
          shippingPallets: pallets,
          shippingGbpPence: shippingPence,
          ...(originalQuoteRef ? { originalQuoteRef } : {}),
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
      {originalQuoteRef && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3 leading-relaxed">
          {t("amendingNotice", { ref: originalQuoteRef })}
        </div>
      )}
      <div className="bg-white rounded-xl border border-ajs-light p-4">
        <h2 className="font-bold text-lg mb-3 text-ajs-dark">{t("sectionYourDetails")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={`${t("fieldFirstName")} *`} required value={details.contactFirstName} onChange={set("contactFirstName")} />
          <Field label={`${t("fieldLastName")} *`} required value={details.contactLastName} onChange={set("contactLastName")} />
          <Field label={`${t("fieldCompany")} *`} required value={details.contactCompany} onChange={set("contactCompany")} className="sm:col-span-2" />
          <Field label={`${t("fieldSiteName")} *`} required value={details.siteName} onChange={set("siteName")} placeholder={t("fieldSiteNamePlaceholder")} className="sm:col-span-2" />
          <Field label={`${t("fieldEmail")} *`} type="email" required value={details.contactEmail} onChange={set("contactEmail")} />
          <Field label={`${t("fieldPhone")} *`} type="tel" required value={details.contactPhone} onChange={set("contactPhone")} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-ajs-light p-4">
        <h2 className="font-bold text-lg mb-3 text-ajs-dark">{t("sectionDeliveryAddress")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("fieldAddressLine1")} value={details.siteAddressLine1} onChange={set("siteAddressLine1")} className="sm:col-span-2" />
          <Field label={t("fieldAddressLine2")} value={details.siteAddressLine2} onChange={set("siteAddressLine2")} className="sm:col-span-2" />
          <Field label={t("fieldTownCity")} value={details.siteAddressCity} onChange={set("siteAddressCity")} />
          <Field label={`${t("fieldPostcode")} *`} required value={details.siteAddressPostcode} onChange={set("siteAddressPostcode")} />
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
              {t("fieldCountry")}
            </label>
            <select
              value={details.siteCountry}
              onChange={set("siteCountry")}
              className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
            >
              {SHIPPING_OPTIONS.map((o) => (
                <option key={o.country} value={o.country}>
                  {o.label}{o.ratePence !== null ? ` — £${(o.ratePence / 100).toFixed(0)}/${t("pallet")}` : t("shippingEXWOption")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-ajs-light p-4">
        <h2 className="font-bold text-lg mb-3 text-ajs-dark">{t("sectionProjectDetails")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={`${t("fieldRequiredDate")} *`} type="date" required value={details.requiredDate} onChange={set("requiredDate")} />
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
              {t("fieldProjectDescription")} *
            </label>
            <textarea
              value={details.projectDescription}
              onChange={set("projectDescription")}
              rows={3}
              className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
              placeholder={t("fieldProjectDescriptionPlaceholder")}
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
              {t("fieldInstallRequest")}
              <span className="text-ajs-muted block text-xs mt-0.5">
                {t("fieldInstallRequestDesc")}
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-ajs-light p-4">
        <h2 className="font-bold text-lg mb-3 text-ajs-dark">{t("sectionOrderSummary")}</h2>
        <ul className="divide-y divide-ajs-light text-sm">
          {lines.map((l) => (
            <li key={l.productId} className="py-2 flex justify-between gap-2">
              <span>
                <span className="font-mono text-xs font-bold text-ajs-dark">{l.sku}</span>{" "}
                {l.name} × {l.qty}
              </span>
              <span className="font-semibold">
                {formatMoney(l.qty * l.unitPricePence, currency)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 pt-3 border-t border-ajs-light space-y-2 text-sm">
          <div className="flex justify-between text-ajs-muted">
            <span>{t("productsSubtotal")}</span>
            <span className="font-semibold text-ajs-dark">{formatMoney(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-ajs-muted">
            <span>
              {t("shipping")}
              <span className="text-xs ml-1">
                ({pallets} {pallets !== 1 ? t("pallets") : t("pallet")}, {details.siteCountry})
              </span>
            </span>
            <span className={`font-semibold ${isEXW ? "text-amber-600" : "text-ajs-dark"}`}>
              {isEXW ? t("shippingEXW") : formatMoney(shippingPence!, currency)}
            </span>
          </div>
          {!isEXW && (
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-ajs-light">
              <span>{t("estimatedTotal")}</span>
              <span>{formatMoney(grandTotal, currency)}</span>
            </div>
          )}
        </div>

        <div className="text-xs text-ajs-muted mt-3 space-y-1 leading-relaxed">
          <p>
            <strong className="text-ajs-text">{t("vatAllPricesExVat")}</strong> {t("vatAppliedBasedOn")}
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>{t("vatBulletUK")}</li>
            <li>{t("vatBulletEU")}</li>
            <li>{t("vatBulletNonEU")}</li>
          </ul>
          <p>{t("shippingEstimateNote")}</p>
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
          {t("backToBasket")}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 rounded-lg font-bold text-white bg-ajs-primary hover:bg-ajs-dark disabled:opacity-50"
        >
          {submitting ? t("submittingLabel") : t("submitQuote")}
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
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
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
        placeholder={placeholder}
        className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
      />
    </div>
  );
}
