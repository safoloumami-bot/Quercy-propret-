"use client";

import { cn } from "@quercy/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/metiers", label: "Corps de métier" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="flex items-center gap-1">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={pathname === l.href ? "page" : undefined}
          className={cn(
            "rounded-md px-2.5 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
            pathname === l.href && "bg-accent text-foreground",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
