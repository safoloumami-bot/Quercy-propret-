import { dayKey, easterSunday, frenchHolidays, utcDay } from "./cleaning";
import { addDays } from "./sales";
import type { HolidayPolicy, RecurrenceRule } from "./recurrence";

/**
 * Moteur de récurrence. Il travaille sur des **jours calendaires** (« AAAA-MM-JJ »,
 * représentés par un Date à minuit UTC) : aucun calcul de jour métier ne dépend du fuseau du
 * serveur. Le jour courant de l'entreprise s'obtient avec `todayIn(fuseau)`.
 */

const DAY_MS = 86_400_000;

/** « AAAA-MM-JJ » → jour (minuit UTC). */
export function parseDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/** Jour calendaire courant dans un fuseau (Europe/Paris par défaut), jamais celui du serveur. */
export function todayIn(timezone = "Europe/Paris", now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Jour de la semaine ISO : 1 = lundi … 7 = dimanche. */
export function isoWeekday(day: Date): number {
  return ((day.getUTCDay() + 6) % 7) + 1;
}

/** Calendriers de jours fériés. Alsace-Moselle : + Vendredi saint et 26 décembre. */
export const HOLIDAY_CALENDARS = [
  { value: "fr", label: "France métropolitaine" },
  { value: "fr-alsace-moselle", label: "Alsace-Moselle" },
] as const;
export type HolidayCalendar = (typeof HOLIDAY_CALENDARS)[number]["value"];

export function isPublicHoliday(day: Date, calendar: HolidayCalendar = "fr"): boolean {
  const key = dayKey(day);
  const year = day.getUTCFullYear();
  if (frenchHolidays(year).has(key)) return true;
  if (calendar === "fr-alsace-moselle") {
    return key === `${year}-12-26` || key === dayKey(addDays(easterSunday(year), -2));
  }
  return false;
}

function monthLength(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** N-ième (1 à 5, ou -1 = dernier) jour `weekday` (ISO) d'un mois ; null s'il n'existe pas. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date | null {
  if (nth === -1) {
    const last = new Date(Date.UTC(year, month, monthLength(year, month)));
    return addDays(last, -((isoWeekday(last) - weekday + 7) % 7));
  }
  const first = new Date(Date.UTC(year, month, 1));
  const day = addDays(first, ((weekday - isoWeekday(first) + 7) % 7) + (nth - 1) * 7);
  return day.getUTCMonth() === month ? day : null;
}

const mondayOf = (day: Date) => addDays(day, -(isoWeekday(day) - 1));

/** Dates brutes d'une règle entre `from` et `to` inclus, comptées depuis son jour d'effet. */
export function ruleDates(rule: RecurrenceRule, anchor: Date, from: Date, to: Date): Date[] {
  const start = from > anchor ? from : anchor;
  if (start > to) return [];
  const out: Date[] = [];
  switch (rule.kind) {
    case "weekly": {
      const days = new Set(rule.weekdays);
      const anchorMonday = mondayOf(anchor).getTime();
      for (let d = start; d <= to; d = addDays(d, 1)) {
        const week = Math.round((mondayOf(d).getTime() - anchorMonday) / (7 * DAY_MS));
        if (days.has(isoWeekday(d)) && week % rule.everyWeeks === 0) out.push(d);
      }
      break;
    }
    case "monthly_weeks":
    case "monthly_days": {
      const anchorIndex = anchor.getUTCFullYear() * 12 + anchor.getUTCMonth();
      const lastIndex = to.getUTCFullYear() * 12 + to.getUTCMonth();
      for (let index = anchorIndex; index <= lastIndex; index += rule.everyMonths) {
        const year = Math.floor(index / 12);
        const month = index % 12;
        const candidates: (Date | null)[] =
          rule.kind === "monthly_weeks"
            ? rule.weekdays.flatMap((w) =>
                rule.weeks.map((n) => nthWeekdayOfMonth(year, month, w, n)),
              )
            : rule.days.map((day) => {
                const length = monthLength(year, month);
                // « Le 31 » en février : le dernier jour du mois.
                return new Date(Date.UTC(year, month, day === -1 ? length : Math.min(day, length)));
              });
        for (const d of candidates) if (d && d >= start && d <= to) out.push(d);
      }
      break;
    }
    case "interval_days": {
      const skip = Math.max(
        0,
        Math.ceil((start.getTime() - anchor.getTime()) / DAY_MS / rule.days),
      );
      for (let d = addDays(anchor, skip * rule.days); d <= to; d = addDays(d, rule.days)) {
        if (d >= start) out.push(d);
      }
      break;
    }
    case "dates":
      for (const key of rule.dates) {
        const d = parseDay(key);
        if (d >= start && d <= to) out.push(d);
      }
      break;
  }
  return [...new Map(out.map((d) => [d.getTime(), d])).values()].sort(
    (a, b) => a.getTime() - b.getTime(),
  );
}

export interface RuleVersionInput {
  version: number;
  /** Jour d'effet et jour de fin (inclus), « AAAA-MM-JJ » ou Date (minuit UTC). */
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
  rule: RecurrenceRule;
}

export interface Occurrence {
  /** Jour du passage (après report éventuel pour jour férié). */
  date: string;
  /** Jour prévu par la règle : sert de clé de créneau, stable même si le passage est reporté. */
  slotDate: string;
  version: number;
  /** Reporté parce que le jour prévu est férié. */
  movedForHoliday: boolean;
}

export interface OccurrenceOptions {
  versions: RuleVersionInput[];
  from: Date | string;
  to: Date | string;
  holidayPolicy?: HolidayPolicy;
  calendar?: HolidayCalendar;
  /** Fermetures du site (inclusives) : aucun passage. */
  closures?: { startDate: Date | string; endDate: Date | string }[];
}

const asDay = (d: Date | string) => (typeof d === "string" ? parseDay(d) : utcDay(d));

/** Jour ouvré le plus proche (ni dimanche ni férié) avant ou après `day`. */
function shiftToWorkingDay(day: Date, direction: -1 | 1, calendar: HolidayCalendar): Date {
  let d = addDays(day, direction);
  for (let i = 0; i < 10 && (isoWeekday(d) === 7 || isPublicHoliday(d, calendar)); i++)
    d = addDays(d, direction);
  return d;
}

/**
 * Passages d'une série entre `from` et `to` : chaque version s'applique de son jour d'effet
 * jusqu'à la veille de la suivante (ou son jour de fin). Les jours fériés suivent la règle
 * de la série ; les fermetures du site retirent les passages.
 */
export function occurrences(options: OccurrenceOptions): Occurrence[] {
  const from = asDay(options.from);
  const to = asDay(options.to);
  const policy = options.holidayPolicy ?? "keep";
  const calendar = options.calendar ?? "fr";
  const closures = (options.closures ?? []).map((c) => ({
    start: asDay(c.startDate),
    end: asDay(c.endDate),
  }));
  const versions = [...options.versions].sort(
    (a, b) => asDay(a.effectiveFrom).getTime() - asDay(b.effectiveFrom).getTime(),
  );
  const result = new Map<string, Occurrence>();
  versions.forEach((v, i) => {
    const anchor = asDay(v.effectiveFrom);
    const next = versions[i + 1];
    const ends = [to];
    if (v.effectiveTo) ends.push(asDay(v.effectiveTo));
    if (next) ends.push(addDays(asDay(next.effectiveFrom), -1));
    const end = new Date(Math.min(...ends.map((d) => d.getTime())));
    for (const raw of ruleDates(v.rule, anchor, from, end)) {
      let day = raw;
      let moved = false;
      if (isPublicHoliday(raw, calendar)) {
        if (policy === "skip") continue;
        if (policy === "before" || policy === "after") {
          day = shiftToWorkingDay(raw, policy === "before" ? -1 : 1, calendar);
          moved = true;
        }
      }
      if (closures.some((c) => day >= c.start && day <= c.end)) continue;
      const date = dayKey(day);
      if (!result.has(date))
        result.set(date, {
          date,
          slotDate: dayKey(raw),
          version: v.version,
          movedForHoliday: moved,
        });
    }
  });
  return [...result.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Clé de créneau d'une série : une intervention par série et par jour prévu par la règle. */
export function seriesSlotKey(seriesId: string, slotDate: string): string {
  return `serie:${seriesId}:${slotDate}`;
}

/** Clé de créneau d'un contrat d'entretien « simple » (jours de la semaine). */
export function contractSlotKey(contractId: string, day: Date): string {
  return `contrat:${contractId}:${dayKey(day)}`;
}
