"use client";

import {
  DEFAULT_TRADE_PRESETS,
  GENERAL_TRADE,
  GENERAL_TRADE_KEY,
  type TradePreset,
} from "@quercy/core";
import { cn } from "@quercy/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
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

import { useTRPC } from "@/lib/trpc";

/** Icônes des préréglages d'origine ; les métiers ajoutés par l'équipe ont une icône neutre. */
export const TRADE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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

const FALLBACK = DEFAULT_TRADE_PRESETS.filter((p) => p.active);

/**
 * Préréglages proposés (ceux d'origine et ceux de l'équipe). Les préréglages d'origine
 * s'affichent tout de suite, la liste à jour les remplace dès qu'elle arrive.
 */
export function useTradePresets(): TradePreset[] {
  const trpc = useTRPC();
  const { data } = useQuery({
    ...trpc.workspace.trades.queryOptions(),
    staleTime: 5 * 60_000,
  });
  return data ?? FALLBACK;
}

/**
 * Choix du corps de métier, en grandes cartes. `other` ajoute une carte « Autre activité »
 * (valeur null) pour les entreprises hors de ces métiers.
 */
export function TradePicker({
  presets,
  value,
  onChange,
  other = false,
  disabled = false,
}: {
  presets: TradePreset[];
  /** undefined : rien de choisi ; null : « Autre activité ». */
  value: string | null | undefined;
  onChange: (trade: string | null) => void;
  other?: boolean;
  disabled?: boolean;
}) {
  const general = presets.find((p) => p.key === GENERAL_TRADE_KEY) ?? GENERAL_TRADE;
  const trades = presets.filter((p) => p.key !== GENERAL_TRADE_KEY);
  const options: (TradePreset | null)[] = other ? [...trades, null] : trades;
  return (
    <div role="radiogroup" aria-label="Métier" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((preset) => {
        const key = preset?.key ?? null;
        const Icon = key ? (TRADE_ICONS[key] ?? BriefcaseIcon) : BriefcaseIcon;
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
            <span className="text-sm font-medium">{(preset ?? general).label}</span>
            <span className="text-xs text-muted-foreground">{(preset ?? general).hint}</span>
            {selected ? (
              <CheckIcon className="absolute top-3 right-3 size-4 text-primary" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
