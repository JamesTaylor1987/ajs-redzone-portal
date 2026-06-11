"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveAdminNotesAction, type AdminNotesState } from "./actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-ajs-primary hover:bg-ajs-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? "Saving…" : "Save notes"}
    </button>
  );
}

interface Props {
  quoteId: string;
  currentNotes: string | null;
}

export function AdminNotesForm({ quoteId, currentNotes }: Props) {
  const [state, action] = useFormState<AdminNotesState, FormData>(saveAdminNotesAction, {});

  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-3">Internal notes</h2>

      {state.success && (
        <div className="mb-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-2.5 font-semibold">
          Saved.
        </div>
      )}
      {state.error && (
        <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-2.5">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={quoteId} />
        <textarea
          name="admin_notes"
          rows={4}
          defaultValue={currentNotes ?? ""}
          placeholder="Internal notes — not visible to the customer…"
          className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40 resize-y"
        />
        <SaveButton />
      </form>
    </div>
  );
}
