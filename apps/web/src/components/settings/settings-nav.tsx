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
    <nav
      aria-label="Réglages"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:sticky md:top-8 md:mx-0 md:block md:h-fit md:w-52 md:shrink-0 md:space-y-5 md:overflow-visible md:px-0 md:pb-0"
    >
      {filterSections(SETTINGS_SECTIONS, permissions).map((section) => (
        <div key={section.id} className="contents md:block">
          <p className="mb-1 px-2 text-xs font-medium text-muted-foreground max-md:hidden">
            {section.label}
          </p>
          <ul className="contents md:grid md:gap-0.5">
            {section.items.map((item) => (
              <li key={item.id} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active?.id === item.id ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center gap-2.5 rounded-md px-2 text-sm whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 max-md:border max-md:border-border [&_svg]:size-4",
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
