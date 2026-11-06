import { describe, expect, it } from "vitest";

import {
  findConflicts,
  contractOccurrences,
  dayKey,
  frenchHolidays,
  inspectionOutcome,
  parseClock,
  splitWorkedMinutes,
  weekStart,
} from "../index";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe("nettoyage : calendrier des contrats", () => {
  it("donne les jours de passage choisis, dans la période du contrat", () => {
    // Lundi, mercredi, vendredi ; contrat commencé le mercredi 30 septembre 2026.
    const days = contractOccurrences(
      { weekdays: ["1", "3", "5"], startDate: d("2026-09-30"), endDate: d("2026-10-09") },
      d("2026-09-28"),
      d("2026-10-31"),
    );
    expect(days.map(dayKey)).toEqual([
      "2026-09-30",
      "2026-10-02",
      "2026-10-05",
      "2026-10-07",
      "2026-10-09",
    ]);
    expect(contractOccurrences({ weekdays: [] }, d("2026-09-28"), d("2026-10-31"))).toEqual([]);
  });

  it("trouve le lundi de la semaine", () => {
    expect(dayKey(weekStart(d("2026-10-04")))).toBe("2026-09-28");
    expect(dayKey(weekStart(d("2026-09-28")))).toBe("2026-09-28");
  });
});

describe("nettoyage : heures pour la paie", () => {
  it("connaît les jours fériés, Pâques compris", () => {
    const h = frenchHolidays(2026);
    expect(h.has("2026-04-06")).toBe(true); // lundi de Pâques
    expect(h.has("2026-05-14")).toBe(true); // Ascension
    expect(h.has("2026-05-25")).toBe(true); // Pentecôte
    expect(h.has("2026-07-14")).toBe(true);
    expect(h.has("2026-07-15")).toBe(false);
  });

  it("ventile nuit, dimanche et férié, y compris après minuit", () => {
    expect(parseClock("5h30")).toBe(330);
    expect(parseClock("25:00")).toBeNull();
    // Samedi 3 octobre 2026, 20 h → 23 h : 2 h de nuit, rien le dimanche.
    expect(splitWorkedMinutes(d("2026-10-03"), "20:00", 180)).toEqual({
      total: 180,
      night: 120,
      sunday: 0,
      holiday: 0,
    });
    // Samedi 23 h → dimanche 1 h : 1 h le dimanche, tout de nuit.
    expect(splitWorkedMinutes(d("2026-10-03"), "23:00", 120)).toEqual({
      total: 120,
      night: 120,
      sunday: 60,
      holiday: 0,
    });
    // 14 juillet (mardi) 6 h → 8 h : férié.
    expect(splitWorkedMinutes(d("2026-07-14"), "06:00", 120).holiday).toBe(120);
  });
});

describe("contrôle qualité", () => {
  it("note sur 100 et résultat", () => {
    expect(inspectionOutcome([true, true, true, true, true])).toEqual({
      score: 100,
      result: "compliant",
    });
    expect(inspectionOutcome([true, true, true, false, false])).toEqual({
      score: 60,
      result: "to_improve",
    });
    expect(inspectionOutcome([true, false, false, false, false]).result).toBe("non_compliant");
  });
});

describe("chevauchements du planning", () => {
  it("signale un même agent sur deux passages qui se recouvrent, sans faux positif", () => {
    const slot = (
      id: string,
      agentId: string | null,
      startTime: string | null,
      durationMinutes = 60,
    ) => ({
      id,
      agentId,
      day: "2026-10-12",
      startTime,
      durationMinutes,
    });
    expect(
      findConflicts([
        slot("a", "mus", "11:30", 90),
        slot("b", "mus", "12:30", 30),
        slot("c", "mus", "13:00", 30),
        slot("d", "ikram", "11:30", 90),
        slot("e", "mus", null),
        slot("f", null, "11:30"),
      ]),
    ).toEqual([{ agentId: "mus", day: "2026-10-12", ids: ["a", "b"] }]);
  });
});
