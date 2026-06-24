"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateFinanceAction, type FinanceState } from "./actions";

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

interface Props {
  quoteId: string;
  invoiced: boolean;
  paymentReceived: boolean;
}

export function FinanceForm({ quoteId, invoiced, paymentReceived }: Props) {
  const [state, action] = useFormState<FinanceState, FormData>(updateFinanceAction, {});
  const [isInvoiced, setIsInvoiced] = useState(invoiced);
  const [isPaid, setIsPaid] = useState(paymentReceived);

  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-4">Finance</h2>

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

        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                name="invoiced"
                checked={isInvoiced}
                onChange={(e) => {
                  setIsInvoiced(e.target.checked);
                  if (!e.target.checked) setIsPaid(false);
                }}
                className="sr-only peer"
              />
              <div className="w-5 h-5 rounded border-2 border-ajs-light peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-colors flex items-center justify-center">
                {isInvoiced && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
            </div>
            <span className={`text-sm font-semibold ${isInvoiced ? "text-emerald-700" : "text-ajs-muted"}`}>
              Invoice sent
            </span>
          </label>

          <label className={`flex items-center gap-3 select-none ${isInvoiced ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}>
            <div className="relative">
              <input
                type="checkbox"
                name="payment_received"
                checked={isPaid}
                disabled={!isInvoiced}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 rounded border-2 border-ajs-light peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-colors flex items-center justify-center">
                {isPaid && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
            </div>
            <span className={`text-sm font-semibold ${isPaid ? "text-emerald-700" : "text-ajs-muted"}`}>
              Payment received
            </span>
          </label>
        </div>

        {!isPaid && isInvoiced && (
          <p className="text-xs text-amber-600 font-medium">
            Workshop cannot mark this order as shipped until payment is received.
          </p>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}
