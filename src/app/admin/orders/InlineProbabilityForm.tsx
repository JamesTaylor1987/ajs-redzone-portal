"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateWinProbabilityAction } from "./[id]/actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-2 py-0.5 rounded text-xs font-bold text-white bg-ajs-primary hover:bg-ajs-dark disabled:opacity-50 transition-colors"
    >
      {pending ? "…" : "Save"}
    </button>
  );
}

interface Props {
  quoteId: string;
  currentProbability: number | null;
  updatedAt: string | null;
}

export function InlineProbabilityForm({ quoteId, currentProbability, updatedAt }: Props) {
  const [state, action] = useFormState(updateWinProbabilityAction, {});

  return (
    <div className="space-y-1 min-w-[120px]">
      <form action={action} className="flex items-center gap-1">
        <input type="hidden" name="id" value={quoteId} />
        <input
          type="number"
          name="probability"
          min="0"
          max="100"
          defaultValue={currentProbability ?? ""}
          placeholder="0–100"
          className="w-16 border border-ajs-light rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ajs-primary/40"
        />
        <span className="text-xs text-ajs-muted">%</span>
        <SaveButton />
      </form>
      {state.success && (
        <p className="text-xs text-emerald-600 font-semibold">Saved</p>
      )}
      {updatedAt && !state.success && (
        <p className="text-xs text-ajs-muted">
          Set {new Date(updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </p>
      )}
    </div>
  );
}
