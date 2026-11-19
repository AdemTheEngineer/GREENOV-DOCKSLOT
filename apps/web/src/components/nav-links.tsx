"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm transition ${active ? "bg-white/15 font-semibold" : "text-slate-200 hover:bg-white/10"}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
