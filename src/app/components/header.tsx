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

const WATCH_ITEM = { href: "/watch", label: "EE Watch" };

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="bg-ink text-canvas sticky top-0 z-40">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 h-16 md:h-[72px] flex items-center justify-between gap-4">
        <Link href="/" className="flex items-baseline gap-3 shrink-0">
          <span className="font-serif italic text-[24px] md:text-[26px] tracking-tight text-canvas">
            Idea Radar
          </span>
          <span className="hidden lg:block text-[10px] uppercase tracking-[0.2em] text-canvas/50 translate-y-[-2px]">
            Personal Intelligence
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 h-full" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`h-full flex items-center text-[13px] font-semibold uppercase tracking-[0.06em] border-b-2 transition-colors ${
                isActive(item.href)
                  ? "text-canvas border-ochre"
                  : "text-canvas/60 border-transparent hover:text-canvas"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <span aria-hidden className="h-5 w-px bg-canvas/25" />
          <Link
            href={WATCH_ITEM.href}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors ${
              isActive(WATCH_ITEM.href)
                ? "bg-olive text-canvas"
                : "bg-canvas/10 text-canvas hover:bg-olive"
            }`}
          >
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-ochre" />
            {WATCH_ITEM.label}
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="md:hidden flex flex-col justify-center items-center w-10 h-10 -mr-2 gap-[5px]"
        >
          <span
            className={`block w-5 h-[1.5px] bg-canvas transition-transform duration-200 ${
              open ? "translate-y-[6.5px] rotate-45" : ""
            }`}
          />
          <span
            className={`block w-5 h-[1.5px] bg-canvas transition-opacity duration-200 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-5 h-[1.5px] bg-canvas transition-transform duration-200 ${
              open ? "-translate-y-[6.5px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="md:hidden border-t border-canvas/15 bg-ink fade-up"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-5 py-3.5 text-[15px] font-semibold transition-colors ${
                isActive(item.href)
                  ? "text-canvas bg-canvas/10"
                  : "text-canvas/70 hover:text-canvas"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={WATCH_ITEM.href}
            className={`flex items-center gap-2 px-5 py-3.5 text-[15px] font-semibold border-t border-canvas/15 ${
              isActive(WATCH_ITEM.href)
                ? "bg-olive text-canvas"
                : "text-canvas bg-canvas/5"
            }`}
          >
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-ochre" />
            {WATCH_ITEM.label}
          </Link>
        </nav>
      )}
    </header>
  );
}
