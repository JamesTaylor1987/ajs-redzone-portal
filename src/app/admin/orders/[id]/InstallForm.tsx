"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateInstallAction, type InstallState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

const STAGES = [
  { value: "",           label: "— None" },
  { value: "accepted",   label: "Accepted" },
  { value: "installing", label: "Installing" },
  { value: "complete",   label: "Complete" },
];

interface Props {
  quoteId: string;
  installRequestedByCustomer: boolean;
  installQuoteSent: boolean;
  installStage: string | null;
}

export function InstallForm({ quoteId, installRequestedByCustomer, installQuoteSent, installStage }: Props) {
  const [state, action] = useFormState<InstallState, FormData>(updateInstallAction, {});
  const [quoteSent, setQuoteSent] = useState(installQuoteSent);

  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-4">Installation</h2>

      {state.success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-2.5 font-semibold">
          Saved.
        </div>
      )}
      {state.error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-2.5">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={quoteId} />

        <div className="space-y-3">
          {/* Requested — read-only, reflects customer checkout selection */}
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${installRequestedByCustomer ? "border-emerald-500 bg-emerald-500" : "border-ajs-light bg-white"}`}>
              {installRequestedByCustomer && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                </svg>
              )}
            </div>
            <span className={`text-sm font-semibold ${installRequestedByCustomer ? "text-emerald-700" : "text-ajs-muted"}`}>
              Requested by customer
            </span>
          </div>

          {/* Quote sent — tick box */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                name="install_quote_sent"
                checked={quoteSent}
                onChange={(e) => setQuoteSent(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 rounded border-2 border-ajs-light peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-colors flex items-center justify-center">
                {quoteSent && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
            </div>
            <span className={`text-sm font-semibold ${quoteSent ? "text-emerald-700" : "text-ajs-muted"}`}>
              Install quote sent
            </span>
          </label>
        </div>

        {/* Stage — overwrites each other */}
        <div>
          <label className="block text-xs font-semibold text-ajs-dark mb-1">Stage</label>
          <select
            name="install_stage"
            defaultValue={installStage ?? ""}
            className="w-full sm:w-48 border border-ajs-light rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          >
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
