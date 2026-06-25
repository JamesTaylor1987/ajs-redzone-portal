"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { addFollowupAction, deleteFollowupAction } from "../actions";

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors disabled:opacity-50"
    >
      {pending ? "Adding…" : "Add follow-up"}
    </button>
  );
}

interface Followup {
  id: string;
  note: string;
  created_at: string;
}

interface Props {
  leadId: string;
  followups: Followup[];
}

export function FollowupsSection({ leadId, followups }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [, action] = useFormState(
    async (_prev: { ok: boolean }, formData: FormData) => {
      await addFollowupAction(formData);
      formRef.current?.reset();
      return { ok: true };
    },
    { ok: false },
  );

  return (
    <div className="space-y-3">
      {/* Add new */}
      <form ref={formRef} action={action} className="space-y-2">
        <input type="hidden" name="lead_id" value={leadId} />
        <textarea
          name="note"
          required
          rows={3}
          placeholder="Log a call, email, meeting or update…"
          className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary resize-none"
        />
        <AddButton />
      </form>

      {/* Log */}
      {followups.length === 0 ? (
        <p className="text-xs text-ajs-muted py-2">No follow-ups logged yet.</p>
      ) : (
        <div className="space-y-2 pt-1">
          {followups.map((f) => (
            <div key={f.id} className="flex gap-3 group">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-ajs-primary mt-1.5 shrink-0" />
                <div className="w-px flex-1 bg-ajs-light mt-1" />
              </div>
              <div className="pb-3 flex-1 min-w-0">
                <p className="text-xs text-ajs-muted mb-0.5">
                  {new Date(f.created_at).toLocaleString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
                <p className="text-sm text-ajs-text whitespace-pre-wrap">{f.note}</p>
                <form action={deleteFollowupAction} className="mt-1">
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="lead_id" value={leadId} />
                  <button type="submit" className="text-[11px] text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
