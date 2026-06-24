"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { invitePMAction, generateRZResetLinkAction, type PMActionState } from "./actions";

function SubmitButton({ label, pending: pendingLabel }: { label: string; pending?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors disabled:opacity-50"
    >
      {pending ? (pendingLabel ?? "…") : label}
    </button>
  );
}

function CopyableLinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {});
  }, [link]);

  return (
    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
      <p className="text-xs font-semibold text-emerald-700 mb-1.5">
        {copied ? "Link copied to clipboard!" : "Copy this link and send it to the user:"}
      </p>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          readOnly
          value={link}
          onClick={() => inputRef.current?.select()}
          className="flex-1 text-xs font-mono bg-white border border-emerald-200 rounded px-2 py-1.5 text-ajs-text truncate focus:outline-none focus:ring-1 focus:ring-emerald-400"
        />
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(link).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 3000);
            });
          }}
          className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors whitespace-nowrap"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-[11px] text-emerald-600 mt-1.5">One-time link — expires in 24 hours.</p>
    </div>
  );
}

export function ResetLinkButton({ email }: { email: string }) {
  const [state, action] = useFormState<PMActionState, FormData>(generateRZResetLinkAction, {});
  return (
    <div>
      <form action={action} className="inline">
        <input type="hidden" name="email" value={email} />
        <SubmitButton label="Get reset link" pending="Generating…" />
      </form>
      {state.error && <span className="text-xs text-rose-600 ml-2">{state.error}</span>}
      {state.link && <CopyableLinkBox link={state.link} />}
    </div>
  );
}

export function InvitePMForm() {
  const [state, action] = useFormState<PMActionState, FormData>(invitePMAction, {});

  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-3">Invite Redzone user</h2>

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
        <SubmitButton label="Create invite link" pending="Generating…" />
      </form>

      {state.link && <CopyableLinkBox link={state.link} />}

      <div className="mt-4 text-xs text-ajs-muted space-y-0.5">
        <p><strong>Project Manager</strong> — sees only quotes assigned to them</p>
        <p><strong>Manager</strong> — sees all quotes that have a Redzone PM assigned</p>
      </div>
    </div>
  );
}
