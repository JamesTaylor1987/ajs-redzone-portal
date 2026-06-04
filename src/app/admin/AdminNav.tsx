"use client";

import { useState } from "react";
import Link from "next/link";
import { logoutAction } from "./login/actions";

interface Props {
  email: string;
  isAdmin: boolean;
}

const NAV_LINKS = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/installation-quotes", label: "Install Quotes" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/redzone-pms", label: "Redzone PMs" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav({ email, isAdmin }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="brand-gradient text-white shadow">
      {/* Top bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://cdn.prod.website-files.com/6977ae7685a0199da7148962/699860f91ee461dc0f2bde24_redzone-favicon.svg" alt="" aria-hidden="true" className="h-6 w-6" />
          <span className="font-extrabold text-lg tracking-tight">RZ Admin</span>
          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-5">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop right-side actions */}
          <div className="hidden md:flex items-center gap-2 text-sm">
            <span className="text-white/60 text-xs">{email}</span>
            <Link href="/manufacturing" className="px-3 py-1 rounded border border-white/30 hover:bg-white/10 text-sm font-medium transition-colors">
              Manufacturing ↗
            </Link>
            <Link href="/" className="px-3 py-1 rounded border border-white/30 hover:bg-white/10 text-sm font-medium transition-colors">
              ← Site
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="px-3 py-1 rounded border border-white/30 hover:bg-white/10 text-sm font-medium transition-colors">
                Sign out
              </button>
            </form>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded hover:bg-white/10 transition-colors"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/20 px-4 py-3 space-y-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <div className="border-t border-white/20 pt-2 mt-2 space-y-1">
            <Link href="/manufacturing" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">
              Manufacturing ↗
            </Link>
            <Link href="/" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">
              ← Site
            </Link>
            <div className="px-3 py-1 text-xs text-white/50">{email}</div>
            <form action={logoutAction}>
              <button type="submit" className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
