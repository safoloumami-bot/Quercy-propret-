/**
 * Nettoyage : calendrier des passages d'un contrat, jours fériés et ventilation des heures
 * (dimanche, nuit, férié) pour la paie. Dates « jour » en minuit UTC, comme les champs date.
 */

import { addDays } from "./sales";

/** Minuit UTC du jour civil de `d`. */
export function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** « AAAA-MM-JJ » d'une date (UTC). */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Lundi (minuit UTC) de la semaine contenant `d`. */
export function weekStart(d: Date): Date {
  const day = utcDay(d);
  return addDays(day, -((day.getUTCDay() + 6) % 7));
}

/**
 * Jours de passage d'un contrat entre `from` et `to` inclus : jours de la semaine choisis
 * (« 0 » dimanche … « 6 » samedi), dans la période du contrat.
 */
export function contractOccurrences(
  contract: { weekdays: readonly string[]; startDate?: Date | null; endDate?: Date | null },
  from: Date,
  to: Date,
): Date[] {
  const days = new Set(contract.weekdays.map(Number));
  if (days.size === 0) return [];
  let start = utcDay(from);
  if (contract.startDate && utcDay(contract.startDate) > start) start = utcDay(contract.startDate);
  let end = utcDay(to);
  if (contract.endDate && utcDay(contract.endDate) < end) end = utcDay(contract.endDate);
  const result: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) if (days.has(d.getUTCDay())) result.push(d);
  return result;
}

/** Dimanche de Pâques (algorithme de Meeus/Jones/Butcher). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const holidayCache = new Map<number, Set<string>>();

/** Jours fériés légaux en France métropolitaine (« AAAA-MM-JJ »). */
export function frenchHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const easter = easterSunday(year);
  const fixed = ["01-01", "05-01", "05-08", "07-14", "08-15", "11-01", "11-11", "12-25"].map(
    (md) => `${year}-${md}`,
  );
  const days = new Set([
    ...fixed,
    dayKey(addDays(easter, 1)), // lundi de Pâques
    dayKey(addDays(easter, 39)), // Ascension
    dayKey(addDays(easter, 50)), // lundi de Pentecôte
  ]);
  holidayCache.set(year, days);
  return days;
}

export function isFrenchHoliday(d: Date): boolean {
  return frenchHolidays(d.getUTCFullYear()).has(dayKey(d));
}

/** Heure « HH:MM » en minutes depuis minuit (null si invalide). */
export function parseClock(value: string | null | undefined): number | null {
  const m = /^(\d{1,2})[:hH](\d{2})?$/.exec((value ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

export interface HoursSplit {
  total: number;
  /** Minutes de nuit (21 h – 6 h). */
  night: number;
  /** Minutes travaillées un dimanche. */
  sunday: number;
  /** Minutes travaillées un jour férié. */
  holiday: number;
}

/**
 * Ventile une plage de travail (jour, heure de début, durée) en minutes de nuit, de dimanche
 * et de jour férié, minute par minute (une plage peut passer minuit).
 */
export function splitWorkedMinutes(
  day: Date,
  startTime: string | null,
  minutes: number,
): HoursSplit {
  const start = parseClock(startTime) ?? 8 * 60;
  const split: HoursSplit = { total: 0, night: 0, sunday: 0, holiday: 0 };
  const base = utcDay(day);
  for (let i = 0; i < Math.max(0, Math.round(minutes)); i++) {
    const at = start + i;
    const date = addDays(base, Math.floor(at / 1440));
    const clock = at % 1440;
    split.total++;
    if (clock < 6 * 60 || clock >= 21 * 60) split.night++;
    if (date.getUTCDay() === 0) split.sunday++;
    if (isFrenchHoliday(date)) split.holiday++;
  }
  return split;
}
