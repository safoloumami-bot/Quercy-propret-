import { describe, expect, it } from "vitest";

import { recurrenceRuleSchema } from "../recurrence";
import {
  isPublicHoliday,
  occurrences,
  parseDay,
  seriesSlotKey,
  todayIn,
} from "../recurrence-engine";

const rule = (r: unknown) => recurrenceRuleSchema.parse(r);
const dates = (o: { date: string }[]) => o.map((x) => x.date);
const v1 = (r: unknown, from = "2026-10-01") => [
  { version: 1, effectiveFrom: from, rule: rule(r) },
];

describe("moteur de récurrence", () => {
  it("chaque lundi", () => {
    const out = occurrences({
      versions: v1({ kind: "weekly", weekdays: [1] }),
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(dates(out)).toEqual(["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
  });

  it("un mardi sur deux, compté depuis le jour d'effet", () => {
    const out = occurrences({
      versions: v1({ kind: "weekly", weekdays: [2], everyWeeks: 2 }, "2026-10-06"),
      from: "2026-10-01",
      to: "2026-11-30",
    });
    expect(dates(out)).toEqual(["2026-10-06", "2026-10-20", "2026-11-03", "2026-11-17"]);
  });

  it("le 1er lundi du mois (cages d'escalier)", () => {
    const out = occurrences({
      versions: v1({ kind: "monthly_weeks", weekdays: [1], weeks: [1] }),
      from: "2026-10-01",
      to: "2027-01-31",
    });
    expect(dates(out)).toEqual(["2026-10-05", "2026-11-02", "2026-12-07", "2027-01-04"]);
  });

  it("semaines 1 et 3, et le dernier vendredi", () => {
    const firstAndThird = occurrences({
      versions: v1({ kind: "monthly_weeks", weekdays: [1], weeks: [1, 3] }),
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(dates(firstAndThird)).toEqual(["2026-10-05", "2026-10-19"]);
    const lastFriday = occurrences({
      versions: v1({ kind: "monthly_weeks", weekdays: [5], weeks: [-1] }),
      from: "2026-10-01",
      to: "2026-11-30",
    });
    expect(dates(lastFriday)).toEqual(["2026-10-30", "2026-11-27"]);
  });

  it("le 31 du mois tombe le dernier jour des mois plus courts", () => {
    const out = occurrences({
      versions: v1({ kind: "monthly_days", days: [31] }, "2027-01-01"),
      from: "2027-01-01",
      to: "2027-04-30",
    });
    expect(dates(out)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
  });

  it("tous les 7 jours, même en commençant au milieu de la série", () => {
    const out = occurrences({
      versions: v1({ kind: "interval_days", days: 7 }, "2026-10-06"),
      from: "2026-10-15",
      to: "2026-10-31",
    });
    expect(dates(out)).toEqual(["2026-10-20", "2026-10-27"]);
  });

  it("dates précises (ponctuel)", () => {
    const out = occurrences({
      versions: v1({ kind: "dates", dates: ["2026-10-14", "2027-02-01"] }),
      from: "2026-10-01",
      to: "2026-12-31",
    });
    expect(dates(out)).toEqual(["2026-10-14"]);
  });
});

describe("versions de règle", () => {
  it("le rendez-vous du dimanche passe au mardi le mois suivant, sans toucher au passé", () => {
    const out = occurrences({
      versions: [
        { version: 1, effectiveFrom: "2026-10-01", rule: rule({ kind: "weekly", weekdays: [7] }) },
        { version: 2, effectiveFrom: "2026-11-01", rule: rule({ kind: "weekly", weekdays: [2] }) },
      ],
      from: "2026-10-01",
      to: "2026-11-30",
    });
    expect(out.map((o) => `${o.date}/v${o.version}`)).toEqual([
      "2026-10-04/v1",
      "2026-10-11/v1",
      "2026-10-18/v1",
      "2026-10-25/v1",
      "2026-11-03/v2",
      "2026-11-10/v2",
      "2026-11-17/v2",
      "2026-11-24/v2",
    ]);
  });

  it("une version terminée ne produit plus rien après sa fin", () => {
    const out = occurrences({
      versions: [
        {
          version: 1,
          effectiveFrom: "2026-10-01",
          effectiveTo: "2026-10-15",
          rule: rule({ kind: "weekly", weekdays: [1] }),
        },
      ],
      from: "2026-10-01",
      to: "2026-12-31",
    });
    expect(dates(out)).toEqual(["2026-10-05", "2026-10-12"]);
  });
});

describe("jours fériés et fermetures", () => {
  const lastFriday = v1({ kind: "monthly_weeks", weekdays: [5], weeks: [-1] }, "2026-12-01");
  const december = { from: "2026-12-01", to: "2026-12-31" };

  it("Noël un vendredi : maintenir, ignorer, avancer, reporter", () => {
    expect(dates(occurrences({ versions: lastFriday, ...december }))).toEqual(["2026-12-25"]);
    expect(
      dates(occurrences({ versions: lastFriday, ...december, holidayPolicy: "skip" })),
    ).toEqual([]);
    expect(
      dates(occurrences({ versions: lastFriday, ...december, holidayPolicy: "before" })),
    ).toEqual(["2026-12-24"]);
    const after = occurrences({ versions: lastFriday, ...december, holidayPolicy: "after" });
    expect(after).toEqual([
      { date: "2026-12-26", slotDate: "2026-12-25", version: 1, movedForHoliday: true },
    ]);
    // En Alsace-Moselle, le 26 est aussi férié et le 27 est un dimanche : lundi 28.
    expect(
      dates(
        occurrences({
          versions: lastFriday,
          ...december,
          holidayPolicy: "after",
          calendar: "fr-alsace-moselle",
        }),
      ),
    ).toEqual(["2026-12-28"]);
  });

  it("lundi de Pâques ignoré", () => {
    expect(isPublicHoliday(parseDay("2027-03-29"))).toBe(true);
    const out = occurrences({
      versions: v1({ kind: "weekly", weekdays: [1] }, "2027-03-01"),
      from: "2027-03-22",
      to: "2027-04-05",
      holidayPolicy: "skip",
    });
    expect(dates(out)).toEqual(["2027-03-22", "2027-04-05"]);
  });

  it("fermeture du site : aucun passage sur la période", () => {
    const out = occurrences({
      versions: v1({ kind: "weekly", weekdays: [1] }),
      from: "2026-10-01",
      to: "2026-10-31",
      closures: [{ startDate: "2026-10-12", endDate: "2026-10-20" }],
    });
    expect(dates(out)).toEqual(["2026-10-05", "2026-10-26"]);
  });
});

describe("fuseau et clés", () => {
  it("le jour courant est celui de Paris, pas celui du serveur", () => {
    const lateEvening = new Date("2026-10-05T22:30:00.000Z");
    expect(lateEvening.toISOString().slice(0, 10)).toBe("2026-10-05");
    expect(todayIn("Europe/Paris", lateEvening)).toBe("2026-10-06");
  });

  it("clé de créneau stable, même pour un passage reporté", () => {
    expect(seriesSlotKey("s1", "2026-12-25")).toBe("serie:s1:2026-12-25");
  });
});
