"use client";

import {
  HOLIDAY_CALENDARS,
  HOLIDAY_POLICIES,
  type HolidayCalendar,
  type HolidayPolicy,
  type RecurrenceRule,
  recurrenceRuleSchema,
} from "@quercy/core";
import { Input } from "@quercy/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@quercy/ui/components/select";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { FormField } from "@/components/form-field";
import { useTRPC } from "@/lib/trpc";

export interface RuleDraft {
  rule: RecurrenceRule | null;
  effectiveFrom: string;
  startTime: string;
  durationMinutes: string;
  plannedAgentId: string;
  holidayPolicy: HolidayPolicy;
  holidayCalendar: HolidayCalendar;
}

const KINDS = [
  { value: "weekly", label: "Chaque semaine (ou toutes les N semaines)" },
  { value: "monthly_weeks", label: "Semaine(s) du mois (1er lundi, semaines 1 et 3…)" },
  { value: "monthly_days", label: "Jour(s) fixe(s) du mois (le 5, le 20…)" },
  { value: "interval_days", label: "Tous les N jours" },
  { value: "dates", label: "Dates précises (ponctuel)" },
] as const;

const DAYS = ["L", "Ma", "Me", "J", "V", "S", "D"];
const DAY_LABELS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const WEEKS = [
  { value: 1, label: "1re" },
  { value: 2, label: "2e" },
  { value: 3, label: "3e" },
  { value: 4, label: "4e" },
  { value: 5, label: "5e" },
  { value: -1, label: "Dernière" },
] as const;

function defaultRule(
  kind: RecurrenceRule["kind"],
  previous: RecurrenceRule | null,
): RecurrenceRule {
  const weekdays =
    previous && "weekdays" in previous && previous.weekdays.length ? previous.weekdays : [1];
  switch (kind) {
    case "weekly":
      return { kind, weekdays, everyWeeks: 1 };
    case "monthly_weeks":
      return { kind, weekdays, weeks: [1], everyMonths: 1 };
    case "monthly_days":
      return { kind, days: [1], everyMonths: 1 };
    case "interval_days":
      return { kind, days: 7 };
    case "dates":
      return { kind, dates: [] };
  }
}

function Toggle({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className={`h-8 min-w-9 rounded-md border px-2 text-sm transition-colors ${
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

const toggle = <T,>(list: readonly T[], value: T) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/** Éditeur d'une règle de récurrence, avec l'aperçu des prochains passages. */
export function RuleEditor({
  draft,
  onChange,
  agents,
  dateLabel = "À partir du",
}: {
  draft: RuleDraft;
  onChange: (draft: RuleDraft) => void;
  agents: { id: string; name: string }[];
  dateLabel?: string;
}) {
  const trpc = useTRPC();
  const rule = draft.rule;
  const set = (patch: Partial<RuleDraft>) => onChange({ ...draft, ...patch });
  const setRule = (next: RecurrenceRule) => set({ rule: next });
  const valid = rule ? recurrenceRuleSchema.safeParse(rule).success : false;
  const preview = useQuery({
    ...trpc.recurrence.preview.queryOptions({
      rule: rule ?? { kind: "dates", dates: ["2000-01-01"] },
      effectiveFrom: draft.effectiveFrom,
      holidayPolicy: draft.holidayPolicy,
      holidayCalendar: draft.holidayCalendar,
      count: 8,
    }),
    enabled: valid && /^\d{4}-\d{2}-\d{2}$/.test(draft.effectiveFrom),
  });

  return (
    <div className="space-y-4">
      <FormField id="rule-kind" label="Fréquence">
        <Select
          value={rule?.kind ?? ""}
          onValueChange={(kind) => setRule(defaultRule(kind as RecurrenceRule["kind"], rule))}
        >
          <SelectTrigger id="rule-kind">
            <SelectValue placeholder="Choisir une fréquence" />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {rule && "weekdays" in rule ? (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Jour(s)</legend>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => (
              <Toggle
                key={d}
                label={DAY_LABELS[i]!}
                pressed={rule.weekdays.includes(i + 1)}
                onClick={() => {
                  const weekdays = toggle(rule.weekdays, i + 1).sort();
                  if (weekdays.length) setRule({ ...rule, weekdays });
                }}
              >
                {d}
              </Toggle>
            ))}
          </div>
        </fieldset>
      ) : null}

      {rule?.kind === "weekly" ? (
        <FormField id="rule-weeks" label="Toutes les … semaines">
          <Input
            id="rule-weeks"
            type="number"
            min={1}
            max={8}
            value={rule.everyWeeks}
            onChange={(e) =>
              setRule({
                ...rule,
                everyWeeks: Math.min(8, Math.max(1, Number(e.target.value) || 1)),
              })
            }
          />
        </FormField>
      ) : null}

      {rule?.kind === "monthly_weeks" ? (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Semaine(s) du mois</legend>
          <div className="flex flex-wrap gap-1.5">
            {WEEKS.map((w) => (
              <Toggle
                key={w.value}
                label={`${w.label} semaine`}
                pressed={(rule.weeks as number[]).includes(w.value)}
                onClick={() => {
                  const weeks = toggle(rule.weeks as number[], w.value) as typeof rule.weeks;
                  if (weeks.length) setRule({ ...rule, weeks });
                }}
              >
                {w.label}
              </Toggle>
            ))}
          </div>
        </fieldset>
      ) : null}

      {rule?.kind === "monthly_days" ? (
        <FormField
          id="rule-days"
          label="Jours du mois"
          hint="Séparés par des virgules ; « dernier » pour le dernier jour du mois."
        >
          <Input
            id="rule-days"
            defaultValue={rule.days.map((d) => (d === -1 ? "dernier" : d)).join(", ")}
            onChange={(e) => {
              const days = e.target.value
                .split(/[,;\s]+/)
                .map((p) => (/^dern/i.test(p) ? -1 : Number(p)))
                .filter((n) => n === -1 || (Number.isInteger(n) && n >= 1 && n <= 31));
              if (days.length) setRule({ ...rule, days: [...new Set(days)] });
            }}
          />
        </FormField>
      ) : null}

      {rule?.kind === "interval_days" ? (
        <FormField id="rule-interval" label="Tous les … jours">
          <Input
            id="rule-interval"
            type="number"
            min={1}
            max={365}
            value={rule.days}
            onChange={(e) =>
              setRule({ ...rule, days: Math.min(365, Math.max(1, Number(e.target.value) || 1)) })
            }
          />
        </FormField>
      ) : null}

      {rule?.kind === "dates" ? (
        <FormField id="rule-dates" label="Dates" hint="AAAA-MM-JJ, séparées par des virgules.">
          <Input
            id="rule-dates"
            defaultValue={rule.dates.join(", ")}
            onChange={(e) =>
              setRule({
                ...rule,
                dates: e.target.value.split(/[,;\s]+/).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
              })
            }
          />
        </FormField>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <FormField id="rule-from" label={dateLabel}>
          <Input
            id="rule-from"
            type="date"
            value={draft.effectiveFrom}
            onChange={(e) => set({ effectiveFrom: e.target.value })}
          />
        </FormField>
        <FormField id="rule-time" label="Heure">
          <Input
            id="rule-time"
            type="time"
            value={draft.startTime}
            onChange={(e) => set({ startTime: e.target.value })}
          />
        </FormField>
        <FormField id="rule-duration" label="Durée (min)">
          <Input
            id="rule-duration"
            type="number"
            min={5}
            value={draft.durationMinutes}
            onChange={(e) => set({ durationMinutes: e.target.value })}
          />
        </FormField>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <FormField id="rule-agent" label="Intervenant prévu">
          <Select
            value={draft.plannedAgentId || "none"}
            onValueChange={(v) => set({ plannedAgentId: v === "none" ? "" : v })}
          >
            <SelectTrigger id="rule-agent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Non affecté</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="rule-holiday" label="Jour férié">
          <Select
            value={draft.holidayPolicy}
            onValueChange={(v) => set({ holidayPolicy: v as HolidayPolicy })}
          >
            <SelectTrigger id="rule-holiday">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOLIDAY_POLICIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="rule-calendar" label="Calendrier">
          <Select
            value={draft.holidayCalendar}
            onValueChange={(v) => set({ holidayCalendar: v as HolidayCalendar })}
          >
            <SelectTrigger id="rule-calendar">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOLIDAY_CALENDARS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm" aria-live="polite">
        {!valid ? (
          <span className="text-muted-foreground">Complétez la règle pour voir les dates.</span>
        ) : preview.data ? (
          <>
            <p className="font-medium">{preview.data.description}</p>
            <p className="mt-1 text-muted-foreground">
              Prochains passages :{" "}
              {preview.data.dates.length
                ? preview.data.dates
                    .map(
                      (d) =>
                        new Date(`${d.date}T12:00:00Z`).toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        }) + (d.movedForHoliday ? " (férié reporté)" : ""),
                    )
                    .join(" · ")
                : "aucun dans l'année"}
            </p>
          </>
        ) : (
          <span className="text-muted-foreground">Calcul des dates…</span>
        )}
      </div>
    </div>
  );
}
