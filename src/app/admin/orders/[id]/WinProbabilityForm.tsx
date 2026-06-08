"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateWinProbabilityAction, type WinProbabilityState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

interface Props {
  quoteId: string;
  currentProbability: number | null;
}

export function WinProbabilityForm({ quoteId, currentProbability }: Props) {
  const [state, action] = useFormState<WinProbabilityState, FormData>(
    updateWinProbabilityAction,
    {},
  );

  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-3">
        Win probability
      </h2>
      {state.success && (
        <div className="mb-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-2 font-semibold">
          Saved.
        </div>
      )}
      {state.error && (
        <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-2">
          {state.error}
        </div>
      )}
      <form action={action} className="flex items-end gap-3">
        <input type="hidden" name="id" value={quoteId} />
        <div>
          <label className="block text-xs text-ajs-muted mb-1">
            Likelihood of winning (0–100%)
          </label>
          <input
            type="number"
            name="probability"
            min="0"
            max="100"
            defaultValue={currentProbability ?? ""}
            placeholder="e.g. 60"
            className="w-32 border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          />
        </div>
        <SubmitButton />
      </form>
      <p className="text-xs text-ajs-muted mt-2">
        Used to calculate forecast demand in the product pipeline.
      </p>
    </div>
  );
}
