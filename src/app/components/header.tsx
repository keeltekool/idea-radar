"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const RADARS = [
  { key: "main", label: "Main Radar", subtitle: "Personal Intelligence", root: "/", nav: [
    { href: "/", label: "Dashboard" },
    { href: "/memo", label: "Memos" },
    { href: "/profile", label: "Profile" },
    { href: "/newsletter", label: "Newsletter" },
  ]},
  { key: "youtube", label: "YouTube Radar", subtitle: "Tutorial Intelligence", root: "/youtube", nav: [
    { href: "/youtube", label: "Dashboard" },
    { href: "/youtube/memos", label: "Memos" },
  ]},
  { key: "watch", label: "EE Watch", subtitle: "Estonian AI Field", root: "/watch", nav: [
    { href: "/watch", label: "Dashboard" },
    { href: "/watch/memos", label: "Memos" },
    { href: "/watch/brief", label: "Field Brief" },
  ]},
];

function detectRadar(pathname: string) {
  if (pathname.startsWith("/youtube")) return "youtube";
  if (pathname.startsWith("/watch")) return "watch";
  return "main";
}

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const currentKey = detectRadar(pathname);
  const current = RADARS.find((r) => r.key === currentKey)!;

  useEffect(() => {
    setMobileOpen(false);
    setSwitcherOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (href: string) =>
    href === "/" || href === "/watch" || href === "/youtube"
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <header className="bg-ink text-canvas sticky top-0 z-40">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 h-16 md:h-[72px] flex items-center justify-between gap-4">
        <Link href={current.root} className="flex items-baseline gap-3 shrink-0">
          <span className="font-serif italic text-[24px] md:text-[26px] tracking-tight text-canvas">
            {current.key === "main" ? "Idea Radar" : current.key === "youtube" ? "YouTube Radar" : "EE Watch"}
          </span>
          <span className="hidden lg:block text-[10px] uppercase tracking-[0.2em] text-canvas/50 translate-y-[-2px]">
            {current.subtitle}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 h-full" aria-label="Primary">
          {current.nav.map((item) => (
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
          <div ref={switcherRef} className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              className="flex items-center gap-2 px-3.5 py-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors bg-canvas/10 text-canvas hover:bg-olive"
            >
              <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-ochre" />
              Switch Radar
              <svg className={`w-3 h-3 transition-transform ${switcherOpen ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5l3 3 3-3" /></svg>
            </button>
            {switcherOpen && (
              <div className="absolute right-0 top-full mt-1 bg-ink border border-canvas/15 min-w-[180px] z-50 shadow-lg">
                {RADARS.map((r) => (
                  <Link
                    key={r.key}
                    href={r.root}
                    className={`flex items-center justify-between px-4 py-3 text-[13px] font-semibold transition-colors ${
                      r.key === currentKey
                        ? "text-canvas bg-canvas/10"
                        : "text-canvas/60 hover:text-canvas hover:bg-canvas/5"
                    }`}
                  >
                    {r.label}
                    {r.key === currentKey && (
                      <svg className="w-3.5 h-3.5 text-olive" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7l4 4 6-7" /></svg>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="md:hidden flex flex-col justify-center items-center w-10 h-10 -mr-2 gap-[5px]"
        >
          <span className={`block w-5 h-[1.5px] bg-canvas transition-transform duration-200 ${mobileOpen ? "translate-y-[6.5px] rotate-45" : ""}`} />
          <span className={`block w-5 h-[1.5px] bg-canvas transition-opacity duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-[1.5px] bg-canvas transition-transform duration-200 ${mobileOpen ? "-translate-y-[6.5px] -rotate-45" : ""}`} />
        </button>
      </div>

      {mobileOpen && (
        <nav id="mobile-nav" aria-label="Primary" className="md:hidden border-t border-canvas/15 bg-ink">
          {current.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-5 py-3.5 text-[15px] font-semibold transition-colors ${
                isActive(item.href) ? "text-canvas bg-canvas/10" : "text-canvas/70 hover:text-canvas"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="border-t border-canvas/15 px-2 py-2">
            <p className="px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-canvas/40 font-semibold">Switch Radar</p>
            {RADARS.filter((r) => r.key !== currentKey).map((r) => (
              <Link
                key={r.key}
                href={r.root}
                className="flex items-center gap-2 px-3 py-3 text-[15px] font-semibold text-canvas/70 hover:text-canvas"
              >
                <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-ochre" />
                {r.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
