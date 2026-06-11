"use client";

import { useState } from "react";
import { acceptQuoteAction, type AcceptState } from "./actions";
import { useT } from "@/components/LocaleProvider";

interface Prefill {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

interface Props {
  quoteRef: string;
  token: string;
  prefill: Prefill;
}

export function AccountInfoForm({ quoteRef, token, prefill }: Props) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [invoiceAddressDifferent, setInvoiceAddressDifferent] = useState(false);
  const [vatRegistered, setVatRegistered] = useState<boolean | null>(null);

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const result: AcceptState = await acceptQuoteAction(null, formData);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
    // On success the server action redirects — no client handling needed.
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="quoteRef" value={quoteRef} />
      <input type="hidden" name="token" value={token} />

      {/* ── Company details ───────────────────────────────────────────── */}
      <Section title="Registered Company Details">
        <Field label="Registered company name *" name="registeredCompanyName" required />
        <div className="sm:col-span-2">
          <TextArea label="Registered company address *" name="registeredCompanyAddress" required rows={3} />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-ajs-text cursor-pointer">
            <input
              type="checkbox"
              name="invoiceAddressDifferent"
              checked={invoiceAddressDifferent}
              onChange={(e) => setInvoiceAddressDifferent(e.target.checked)}
              className="accent-ajs-primary"
            />
            Invoice address is different from registered address
          </label>
        </div>

        {invoiceAddressDifferent && (
          <div className="sm:col-span-2">
            <TextArea label="Invoice address *" name="invoiceAddress" required rows={3} />
          </div>
        )}

        <Field label="Company registration number *" name="companyRegistrationNumber" required />
        <Field label="Country of registration *" name="countryOfRegistration" required defaultValue="United Kingdom" />
      </Section>

      {/* ── Account contact ───────────────────────────────────────────── */}
      <Section title="Account Contact">
        <Field label="Account contact name *" name="accountContactName" required defaultValue={prefill.contactName} />
        <Field label="Account contact telephone *" name="accountContactTelephone" type="tel" required defaultValue={prefill.contactPhone} />
        <Field label="Account contact email *" name="accountContactEmail" type="email" required defaultValue={prefill.contactEmail} className="sm:col-span-2" />
      </Section>

      {/* ── Invoicing ────────────────────────────────────────────────── */}
      <Section title="Invoicing">
        <Field label="Email address for invoices *" name="invoiceEmail" type="email" required defaultValue={prefill.contactEmail} />
        <Field label="Email address for statements *" name="statementEmail" type="email" required defaultValue={prefill.contactEmail} />
        <div className="sm:col-span-2">
          <YesNo
            label="Do invoices require a PO number? *"
            name="requiresPONumber"
          />
        </div>
      </Section>

      {/* ── VAT / Tax ────────────────────────────────────────────────── */}
      <Section title="VAT &amp; Tax">
        <div className="sm:col-span-2">
          <YesNo
            label="VAT registered (UK or EU)? *"
            name="vatRegistered"
            onChange={(val) => setVatRegistered(val === "yes")}
          />
        </div>
        {vatRegistered === true && (
          <Field label="VAT number *" name="vatNumber" required />
        )}
        {vatRegistered === false && (
          <Field
            label="Local tax registration number"
            name="localTaxNumber"
            hint="Non-EU customers only — leave blank if not applicable"
          />
        )}
      </Section>

      {/* ── GDPR & Acceptance ────────────────────────────────────────── */}
      <Section title="GDPR Consent &amp; Acceptance">
        <div className="sm:col-span-2 bg-slate-50 rounded-lg border border-ajs-light p-4 text-sm text-ajs-text leading-relaxed">
          I confirm that AJS Spalding Ltd may hold and process the personal data provided above in
          accordance with UK GDPR, for the purposes of fulfilling this order and managing our
          business relationship. I understand I may request removal of my data at any time by
          contacting{" "}
          <a href="mailto:rz@ajsspalding.co.uk" className="text-ajs-primary underline">
            rz@ajsspalding.co.uk
          </a>
          .
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="gdprConsent"
              required
              className="mt-0.5 accent-ajs-primary"
            />
            <span className="text-sm font-semibold text-ajs-text">
              I agree to the above GDPR statement *
            </span>
          </label>
        </div>

        <Field label="Your full name *" name="signatoryName" required defaultValue={prefill.contactName} />
        <Field label="Your position / title *" name="signatoryPosition" required />
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
            Date
          </label>
          <input
            type="text"
            value={today}
            readOnly
            className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm bg-slate-50 text-ajs-muted"
          />
        </div>
      </Section>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="border-t border-ajs-light pt-5">
        <p className="text-xs text-ajs-muted mb-4 leading-relaxed">
          {t("acceptBindingNote")}
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-white bg-ajs-primary hover:bg-ajs-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? t("acceptPlacingOrder") : t("acceptConfirmBtn")}
        </button>
      </div>
    </form>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5">
      <h2
        className="font-bold text-sm text-ajs-dark mb-4"
        dangerouslySetInnerHTML={{ __html: title }}
      />
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
  hint,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
        {label}
      </label>
      {hint && <p className="text-xs text-ajs-muted mb-1">{hint}</p>}
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
      />
    </div>
  );
}

function TextArea({
  label,
  name,
  required,
  rows = 3,
}: {
  label: string;
  name: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
        {label}
      </label>
      <textarea
        name={name}
        required={required}
        rows={rows}
        className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40 resize-none"
      />
    </div>
  );
}

function YesNo({
  label,
  name,
  onChange,
}: {
  label: string;
  name: string;
  onChange?: (val: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-2">{label}</p>
      <div className="flex gap-4">
        {["yes", "no"].map((val) => (
          <label key={val} className="flex items-center gap-2 text-sm text-ajs-text cursor-pointer">
            <input
              type="radio"
              name={name}
              value={val}
              required
              onChange={() => onChange?.(val)}
              className="accent-ajs-primary"
            />
            {val === "yes" ? "Yes" : "No"}
          </label>
        ))}
      </div>
    </div>
  );
}
