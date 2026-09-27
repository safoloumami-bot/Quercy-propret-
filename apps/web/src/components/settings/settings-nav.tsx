"use client";

import type { PermissionMatrix } from "@quercy/core";
import { cn } from "@quercy/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SETTINGS_SECTIONS, activeNavItem, filterSections } from "@/lib/navigation";

export function SettingsNav({ permissions }: { permissions: PermissionMatrix }) {
  const pathname = usePathname();
  const active = activeNavItem(pathname);
  return (
    <nav aria-label="Réglages" className="sticky top-8 h-fit w-52 shrink-0 space-y-5">
      {filterSections(SETTINGS_SECTIONS, permissions).map((section) => (
        <div key={section.id}>
          <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">{section.label}</p>
          <ul className="grid gap-0.5">
            {section.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={active?.id === item.id ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 [&_svg]:size-4",
                    active?.id === item.id &&
                      "bg-accent font-medium text-foreground [&_svg]:text-primary",
                  )}
                >
                  <item.icon />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
