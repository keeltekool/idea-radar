"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/memo", label: "Memos" },
  { href: "/profile", label: "Profile" },
  { href: "/newsletter", label: "Newsletter" },
];

// EE Watch is a sibling product inside the same shell — visually set apart.
const WATCH_ITEM = { href: "/watch", label: "EE Watch" };

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile panel on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const linkClass = (href: string, mobile = false) =>
    mobile
      ? `block px-5 py-3 text-[15px] font-semibold transition-colors ${
          isActive(href) ? "text-ink bg-cream" : "text-body hover:text-ink"
        }`
      : `h-full flex items-center text-[13px] font-semibold uppercase tracking-[0.04em] border-b-2 transition-colors ${
          isActive(href)
            ? "text-ink border-ink"
            : "text-slate border-transparent hover:text-ink"
        }`;

  return (
    <header className="bg-canvas/95 backdrop-blur-sm border-b border-stone-border sticky top-0 z-40">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 h-16 md:h-20 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-baseline gap-2 shrink-0">
          <span className="font-serif italic text-[22px] md:text-2xl tracking-tight text-ink">
            Idea Radar
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 h-full" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          ))}
          <span aria-hidden className="h-5 w-px bg-stone-border" />
          <Link
            href={WATCH_ITEM.href}
            className={`h-full flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.04em] border-b-2 transition-colors ${
              isActive(WATCH_ITEM.href)
                ? "text-olive-deep border-olive"
                : "text-olive border-transparent hover:text-olive-deep"
            }`}
          >
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-olive" />
            {WATCH_ITEM.label}
          </Link>
        </nav>

        <div className="hidden md:block text-[10px] uppercase tracking-widest text-slate">
          Personal Intelligence
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="md:hidden flex flex-col justify-center items-center w-10 h-10 -mr-2 gap-[5px]"
        >
          <span
            className={`block w-5 h-[1.5px] bg-ink transition-transform duration-200 ${
              open ? "translate-y-[6.5px] rotate-45" : ""
            }`}
          />
          <span
            className={`block w-5 h-[1.5px] bg-ink transition-opacity duration-200 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-5 h-[1.5px] bg-ink transition-transform duration-200 ${
              open ? "-translate-y-[6.5px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile panel */}
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="md:hidden border-t border-stone-border bg-canvas fade-up"
        >
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href, true)}>
              {item.label}
            </Link>
          ))}
          <Link
            href={WATCH_ITEM.href}
            className={`flex items-center gap-2 px-5 py-3 text-[15px] font-semibold border-t border-stone-border transition-colors ${
              isActive(WATCH_ITEM.href) ? "text-olive-deep bg-olive-wash" : "text-olive"
            }`}
          >
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-olive" />
            {WATCH_ITEM.label}
          </Link>
        </nav>
      )}
    </header>
  );
}
