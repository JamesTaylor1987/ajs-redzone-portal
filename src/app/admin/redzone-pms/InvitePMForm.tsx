"use client";

import { useFormState, useFormStatus } from "react-dom";
import { invitePMAction, type PMActionState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors disabled:opacity-50"
    >
      {pending ? "Inviting…" : "Send invite"}
    </button>
  );
}

export function InvitePMForm() {
  const [state, action] = useFormState<PMActionState, FormData>(invitePMAction, {});

  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-3">Invite Redzone user</h2>

      {state.success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-2.5 font-semibold">
          Invite sent — they will receive an email to set their password.
        </div>
      )}
      {state.error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-2.5">
          {state.error}
        </div>
      )}

      <form action={action} className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-ajs-muted mb-1">Name</label>
          <input
            type="text"
            name="name"
            required
            placeholder="Adam Smith"
            className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-ajs-muted mb-1">Email</label>
          <input
            type="email"
            name="email"
            required
            placeholder="adam@redzone.com"
            className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-ajs-muted mb-1">Phone (optional)</label>
          <input
            type="tel"
            name="phone"
            placeholder="+44 7700 000000"
            className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          />
        </div>
        <div>
          <label className="block text-xs text-ajs-muted mb-1">Type</label>
          <select
            name="type"
            defaultValue="pm"
            className="border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          >
            <option value="pm">Project Manager</option>
            <option value="admin">Manager</option>
          </select>
        </div>
        <SubmitButton />
      </form>

      <div className="mt-4 text-xs text-ajs-muted space-y-0.5">
        <p><strong>Project Manager</strong> — sees only quotes assigned to them</p>
        <p><strong>Manager</strong> — sees all quotes that have a Redzone PM assigned</p>
      </div>
    </div>
  );
}
