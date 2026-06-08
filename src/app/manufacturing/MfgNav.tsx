"use client";

import { useState } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/admin/login/actions";

interface Props {
  isAdmin: boolean;
}

export function MfgNav({ isAdmin }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-ajs-dark text-white shadow">
      {/* Top bar */}
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://cdn.prod.website-files.com/6977ae7685a0199da7148962/699860f91ee461dc0f2bde24_redzone-favicon.svg" alt="" aria-hidden="true" className="h-5 w-5" />
          <span className="font-extrabold text-sm tracking-wide">Manufacturing</span>
          {/* Desktop nav */}
          <nav className="hidden sm:flex gap-4 text-sm">
            <Link href="/manufacturing/orders" className="text-white/80 hover:text-white transition-colors">
              Work orders
            </Link>
            <Link href="/manufacturing/pipeline" className="text-white/80 hover:text-white transition-colors">
              Pipeline
            </Link>
            <Link href="/manufacturing/products" className="text-white/80 hover:text-white transition-colors">
              Products
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Desktop right actions */}
          <div className="hidden sm:flex items-center gap-4 text-xs text-white/60">
            {isAdmin && (
              <Link href="/admin/orders" className="hover:text-white transition-colors">Admin ↗</Link>
            )}
            <Link href="/" className="hover:text-white transition-colors">← Site</Link>
            <form action={logoutAction}>
              <button type="submit" className="hover:text-white transition-colors">Sign out</button>
            </form>
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 rounded hover:bg-white/10 transition-colors"
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
        <div className="sm:hidden border-t border-white/20 px-4 py-3 space-y-1 max-w-5xl mx-auto">
          <Link href="/manufacturing/orders" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">
            Work orders
          </Link>
          <Link href="/manufacturing/pipeline" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">
            Pipeline
          </Link>
          <Link href="/manufacturing/products" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">
            Products
          </Link>
          <div className="border-t border-white/20 pt-2 mt-2 space-y-1">
            {isAdmin && (
              <Link href="/admin/orders" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">
                Admin ↗
              </Link>
            )}
            <Link href="/" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">
              ← Site
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
