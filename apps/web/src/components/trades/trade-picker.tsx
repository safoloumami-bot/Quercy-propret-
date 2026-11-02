"use client";

import { TRADES, TRADE_KEYS, type TradeKey } from "@quercy/core";
import { cn } from "@quercy/ui/lib/utils";
import {
  BrickWallIcon,
  BriefcaseIcon,
  CheckIcon,
  HammerIcon,
  HouseIcon,
  PaintRollerIcon,
  SprayCanIcon,
  ToolCaseIcon,
  TreesIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";
import type * as React from "react";

export const TRADE_ICONS: Record<TradeKey, React.ComponentType<{ className?: string }>> = {
  cleaning: SprayCanIcon,
  plumbing: WrenchIcon,
  electrical: ZapIcon,
  masonry: BrickWallIcon,
  painting: PaintRollerIcon,
  carpentry: HammerIcon,
  roofing: HouseIcon,
  landscaping: TreesIcon,
  multiservice: ToolCaseIcon,
};

/**
 * Choix du corps de métier, en grandes cartes. `other` ajoute une carte « Autre activité »
 * (valeur null) pour les entreprises hors de ces métiers.
 */
export function TradePicker({
  value,
  onChange,
  other = false,
  disabled = false,
}: {
  /** undefined : rien de choisi ; null : « Autre activité ». */
  value: TradeKey | null | undefined;
  onChange: (trade: TradeKey | null) => void;
  other?: boolean;
  disabled?: boolean;
}) {
  const options: (TradeKey | null)[] = other ? [...TRADE_KEYS, null] : [...TRADE_KEYS];
  return (
    <div role="radiogroup" aria-label="Métier" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((key) => {
        const Icon = key ? TRADE_ICONS[key] : BriefcaseIcon;
        const selected = value === key;
        return (
          <button
            key={key ?? "other"}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={cn(
              "relative flex min-h-[84px] flex-col items-start gap-1.5 rounded-lg border border-border p-3 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-60",
              selected && "border-primary bg-primary/5",
            )}
          >
            <Icon className={cn("size-5", selected ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm font-medium">
              {key ? TRADES[key].label : "Autre activité"}
            </span>
            <span className="text-xs text-muted-foreground">
              {key ? TRADES[key].hint : "Commerce, services, conseil…"}
            </span>
            {selected ? (
              <CheckIcon className="absolute top-3 right-3 size-4 text-primary" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
