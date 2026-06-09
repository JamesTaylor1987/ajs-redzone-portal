"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "./login/actions";

interface Props {
  email: string;
  isAdmin: boolean;
}

type NavItem =
  | { href: string; label: string }
  | { label: string; children: { href: string; label: string }[] };

const NAV: NavItem[] = [
  {
    label: "Submissions",
    children: [
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/installation-quotes", label: "Install Quotes" },
      { href: "/admin/pipeline", label: "Pipeline" },
    ],
  },
  { href: "/admin/crm", label: "CRM" },
  { href: "/admin/products", label: "Products" },
  {
    label: "Users",
    children: [
      { href: "/admin/users", label: "AJS Users" },
      { href: "/admin/redzone-pms", label: "Redzone Users" },
    ],
  },
  { href: "/admin/settings", label: "Settings" },
];

function DropdownGroup({
  label,
  children,
  active,
}: {
  label: string;
  children: { href: string; label: string }[];
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 text-sm font-medium transition-colors ${
          active ? "text-white" : "text-white/80 hover:text-white"
        }`}
      >
        {label}
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-ajs-light py-1.5 min-w-[160px] z-50">
          {children.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-ajs-text hover:bg-slate-50 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminNav({ email }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  function isGroupActive(children: { href: string }[]) {
    return children.some((c) => pathname.startsWith(c.href));
  }

  return (
    <nav className="brand-gradient text-white shadow">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://cdn.prod.website-files.com/6977ae7685a0199da7148962/699860f91ee461dc0f2bde24_redzone-favicon.svg"
            alt=""
            aria-hidden="true"
            className="h-6 w-6"
          />
          <span className="font-extrabold text-lg tracking-tight">RZ Admin</span>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-5">
            {NAV.map((item) => {
              if ("children" in item) {
                return (
                  <DropdownGroup
                    key={item.label}
                    label={item.label}
                    children={item.children}
                    active={isGroupActive(item.children)}
                  />
                );
              }
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    active ? "text-white" : "text-white/80 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 text-sm">
            <span className="text-white/60 text-xs">{email}</span>
            <Link
              href="/manufacturing"
              className="px-3 py-1 rounded border border-white/30 hover:bg-white/10 text-sm font-medium transition-colors"
            >
              Manufacturing ↗
            </Link>
            <Link
              href="/"
              className="px-3 py-1 rounded border border-white/30 hover:bg-white/10 text-sm font-medium transition-colors"
            >
              ← Site
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="px-3 py-1 rounded border border-white/30 hover:bg-white/10 text-sm font-medium transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
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
      {mobileOpen && (
        <div className="md:hidden border-t border-white/20 px-4 py-3 space-y-0.5">
          {NAV.map((item) => {
            if ("children" in item) {
              return (
                <div key={item.label}>
                  <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                    {item.label}
                  </p>
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMobileOpen(false)}
                      className="block px-5 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
              >
                {item.label}
              </Link>
            );
          })}

          <div className="border-t border-white/20 pt-2 mt-2 space-y-1">
            <Link
              href="/manufacturing"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
            >
              Manufacturing ↗
            </Link>
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
            >
              ← Site
            </Link>
            <div className="px-3 py-1 text-xs text-white/50">{email}</div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
