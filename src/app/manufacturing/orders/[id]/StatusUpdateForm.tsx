"use client";

import { useFormState, useFormStatus } from "react-dom";
import { manufacturingUpdateStatusAction, type StatusUpdateState } from "./actions";

const MFG_STATUSES = [
  { value: "in_build",      label: "In build" },
  { value: "ready_to_ship", label: "Ready to ship" },
  { value: "shipped",       label: "Shipped" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "Saving…" : "Save & notify customer"}
    </button>
  );
}

interface Props {
  quoteId: string;
  currentStatus: string;
  paymentReceived: boolean;
}

export function StatusUpdateForm({ quoteId, currentStatus, paymentReceived }: Props) {
  const [state, action] = useFormState<StatusUpdateState, FormData>(
    manufacturingUpdateStatusAction,
    {},
  );

  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-3">Update status</h2>

      {state.success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-2.5 font-semibold">
          Saved — customer notified.
        </div>
      )}
      {state.error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-2.5">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={quoteId} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-ajs-muted mb-1">Status</label>
            <select
              name="status"
              defaultValue={currentStatus}
              className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
            >
              {MFG_STATUSES.map((s) => (
                <option key={s.value} value={s.value} disabled={s.value === "shipped" && !paymentReceived}>
                  {s.label}{s.value === "shipped" && !paymentReceived ? " (awaiting payment)" : ""}
                </option>
              ))}
            </select>
            {!paymentReceived && (
              <p className="mt-1 text-xs text-amber-600 font-medium">
                Cannot ship — payment not yet confirmed by AJS admin.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-ajs-muted mb-1">
              Tracking ref <span className="text-ajs-light">(shipped only)</span>
            </label>
            <input
              type="text"
              name="tracking_ref"
              placeholder="e.g. DPD 1Z9999999"
              className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
            />
          </div>

          <div>
            <label className="block text-xs text-ajs-muted mb-1">
              Tracking link <span className="text-ajs-light">(optional URL)</span>
            </label>
            <input
              type="url"
              name="tracking_url"
              placeholder="https://track.dpd.co.uk/…"
              className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
            />
          </div>
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
