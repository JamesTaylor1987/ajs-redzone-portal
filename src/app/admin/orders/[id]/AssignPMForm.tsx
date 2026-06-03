"use client";

import { useFormState, useFormStatus } from "react-dom";
import { assignPMAction, type AssignPMState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

interface PM {
  id: string;
  name: string;
  email: string;
}

interface Props {
  quoteId: string;
  currentPMId: string | null;
  pms: PM[];
}

export function AssignPMForm({ quoteId, currentPMId, pms }: Props) {
  const [state, action] = useFormState<AssignPMState, FormData>(assignPMAction, {});

  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-3">Redzone PM</h2>

      {state.success && (
        <div className="mb-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-2 font-semibold">
          PM assignment saved.
        </div>
      )}
      {state.error && (
        <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-2">
          {state.error}
        </div>
      )}

      <form action={action} className="flex flex-col sm:flex-row gap-3 items-end">
        <input type="hidden" name="id" value={quoteId} />
        <div className="flex-1">
          <label className="block text-xs text-ajs-muted mb-1">Assigned PM</label>
          <select
            name="rz_pm_id"
            defaultValue={currentPMId ?? ""}
            className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          >
            <option value="">— Unassigned —</option>
            {pms.map((pm) => (
              <option key={pm.id} value={pm.id}>{pm.name} ({pm.email})</option>
            ))}
          </select>
        </div>
        <SubmitButton />
      </form>
      <p className="text-xs text-ajs-muted mt-2">The assigned PM will be CC&apos;d on all status update emails for this order.</p>
    </div>
  );
}
