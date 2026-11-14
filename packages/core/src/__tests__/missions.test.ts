import { describe, expect, it } from "vitest";

import { TASK_LIBRARY, dueLookbackStart, taskDue } from "../missions";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("fiches mission", () => {
  it("bibliothèque complète, par zone", () => {
    const zones = TASK_LIBRARY.map((z) => z.zone);
    for (const zone of [
      "Bureaux",
      "Ateliers",
      "Cuisine",
      "WC et sanitaires",
      "Vestiaires",
      "Escaliers et cages",
      "Halls",
      "Ascenseurs",
      "Parkings",
      "Vitres",
      "Locaux poubelles",
      "Extérieurs",
      "Salles de réunion",
      "Chambres",
      "Remise en état",
    ])
      expect(zones).toContain(zone);
    expect(TASK_LIBRARY.every((z) => z.tasks.length >= 4)).toBe(true);
  });

  it("à chaque passage : toujours due", () => {
    expect(taskDue("each_visit", d("2026-10-06"), [d("2026-10-05")])).toBe(true);
  });

  it("hebdomadaire : seulement au premier passage de la semaine", () => {
    // Lundi 5 et mardi 6 octobre 2026, même semaine ISO.
    expect(taskDue("weekly", d("2026-10-05"), [d("2026-10-02")])).toBe(true);
    expect(taskDue("weekly", d("2026-10-06"), [d("2026-10-05")])).toBe(false);
    expect(taskDue("weekly", d("2026-10-12"), [d("2026-10-05"), d("2026-10-06")])).toBe(true);
  });

  it("mensuelle et trimestrielle", () => {
    expect(taskDue("monthly", d("2026-10-06"), [d("2026-09-29")])).toBe(true);
    expect(taskDue("monthly", d("2026-10-13"), [d("2026-10-06")])).toBe(false);
    expect(taskDue("quarterly", d("2026-11-03"), [d("2026-10-06")])).toBe(false);
    expect(taskDue("quarterly", d("2026-10-06"), [d("2026-09-29")])).toBe(true);
    // Les passages postérieurs ne comptent pas.
    expect(taskDue("monthly", d("2026-10-06"), [d("2026-10-20")])).toBe(true);
    expect(dueLookbackStart(d("2026-11-17")).toISOString().slice(0, 10)).toBe("2026-10-01");
  });
});

describe("import Excel des tâches", () => {
  it("lit les colonnes en clair, sans accents ni ordre imposé", async () => {
    const { parseMissionTasks } = await import("../missions");
    const parsed = parseMissionTasks(
      ["Tâche", "zone", "Fréquence", "Critique", "Photo obligatoire"],
      [
        ["Laver les sols", "Hall", "À chaque passage", "non", ""],
        ["Vitres", "Hall", "trimestriel", "", "oui"],
        ["Rampes", "Escaliers", "hebdo", "x", ""],
        ["", "", "", "", ""],
        ["Sans zone", "", "", "", ""],
        ["Bizarre", "Hall", "parfois", "", ""],
      ],
    );
    expect(parsed.tasks).toEqual([
      {
        zone: "Hall",
        label: "Laver les sols",
        frequency: "each_visit",
        critical: false,
        photoRequired: false,
      },
      {
        zone: "Hall",
        label: "Vitres",
        frequency: "quarterly",
        critical: false,
        photoRequired: true,
      },
      {
        zone: "Escaliers",
        label: "Rampes",
        frequency: "weekly",
        critical: true,
        photoRequired: false,
      },
    ]);
    expect(parsed.errors).toEqual([
      "Ligne 6 : zone ou tâche manquante.",
      "Ligne 7 : fréquence « parfois » non reconnue.",
    ]);
    expect(parseMissionTasks(["A", "B"], []).errors).toHaveLength(1);
  });
});
