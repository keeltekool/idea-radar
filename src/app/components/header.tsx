"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/newsletter", label: "Newsletter" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-canvas border-b border-stone-border sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-10 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-serif italic text-2xl tracking-tight text-ink">
            Idea Radar
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-10 h-full">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`h-full flex items-center text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors ${
                  isActive
                    ? "text-ink border-b-2 border-ink"
                    : "text-slate hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="text-[10px] uppercase tracking-widest text-slate">
          Personal Intelligence
        </div>
      </div>
    </header>
  );
}
