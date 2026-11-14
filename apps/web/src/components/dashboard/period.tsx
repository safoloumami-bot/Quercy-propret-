"use client";

import {
  PERIOD_LABELS,
  PERIOD_PRESETS,
  type PeriodInput,
  type PeriodPreset,
  periodSchema,
} from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { Input } from "@quercy/ui/components/input";
import { Label } from "@quercy/ui/components/label";
import { Popover, PopoverAnchor, PopoverContent } from "@quercy/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { CalendarRangeIcon } from "lucide-react";
import * as React from "react";

const STORAGE_KEY = "quercy:period";
const DEFAULT: PeriodInput = { preset: "month" };

/** Période choisie (mémorisée dans le navigateur, commune au tableau de bord et aux rapports). */
export function usePeriod(initial?: PeriodInput) {
  const [period, setPeriod] = React.useState<PeriodInput>(initial ?? DEFAULT);
  React.useEffect(() => {
    if (initial) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? periodSchema.safeParse(JSON.parse(raw)) : null;
      if (parsed?.success) setPeriod(parsed.data);
    } catch {
      // Stockage indisponible : période par défaut.
    }
  }, [initial]);
  const update = React.useCallback(
    (next: PeriodInput) => {
      setPeriod(next);
      if (initial) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignoré.
      }
    },
    [initial],
  );
  return [period, update] as const;
}

const PRESETS = PERIOD_PRESETS.filter((p) => p !== "custom");

/** Sélecteur de période : préréglages et intervalle personnalisé. */
export function PeriodPicker({
  value,
  onChange,
}: {
  value: PeriodInput;
  onChange: (p: PeriodInput) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = React.useState(value.from ?? today.slice(0, 8) + "01");
  const [to, setTo] = React.useState(value.to ?? today);
  const invalid = !from || !to || from > to;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="flex items-center gap-1.5">
          <Select
            value={value.preset}
            onValueChange={(preset) =>
              preset === "custom" ? setOpen(true) : onChange({ preset: preset as PeriodPreset })
            }
          >
            <SelectTrigger className="h-8 w-48" aria-label="Période">
              <CalendarRangeIcon className="size-4 text-muted-foreground" aria-hidden />
              <SelectValue>
                {value.preset === "custom" && value.from && value.to
                  ? `${new Date(value.from).toLocaleDateString("fr-FR")} → ${new Date(value.to).toLocaleDateString("fr-FR")}`
                  : PERIOD_LABELS[value.preset]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </SelectItem>
              ))}
              <SelectItem value="custom">Personnalisée…</SelectItem>
            </SelectContent>
          </Select>
          {value.preset === "custom" ? (
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
              Modifier les dates
            </Button>
          ) : null}
        </div>
      </PopoverAnchor>
      <PopoverContent align="end" className="w-72 space-y-3">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (invalid) return;
            onChange({ preset: "custom", from, to });
            setOpen(false);
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="period-from">Du</Label>
              <Input
                id="period-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="period-to">Au</Label>
              <Input
                id="period-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          {invalid ? (
            <p className="text-xs text-destructive">La date de fin doit suivre la date de début.</p>
          ) : null}
          <Button type="submit" size="sm" className="w-full" disabled={invalid}>
            Appliquer
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
