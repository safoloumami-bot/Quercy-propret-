import { describe, expect, it } from "vitest";

import { describeRule, recurrenceRuleSchema } from "../recurrence";

describe("règles de récurrence", () => {
  it("valide les règles de la V12 et les décrit en français", () => {
    const weekly = recurrenceRuleSchema.parse({ kind: "weekly", weekdays: [1] });
    expect(weekly).toMatchObject({ everyWeeks: 1 });
    expect(describeRule(weekly)).toBe("chaque lundi");
    expect(
      describeRule(recurrenceRuleSchema.parse({ kind: "weekly", weekdays: [2], everyWeeks: 2 })),
    ).toBe("mardi, toutes les 2 semaines");
    expect(
      describeRule(
        recurrenceRuleSchema.parse({ kind: "monthly_weeks", weekdays: [1], weeks: [1, 3] }),
      ),
    ).toBe("le 1er et 3e lundi du mois");
    expect(
      describeRule(
        recurrenceRuleSchema.parse({ kind: "monthly_weeks", weekdays: [5], weeks: [-1] }),
      ),
    ).toBe("le dernier vendredi du mois");
    expect(describeRule(recurrenceRuleSchema.parse({ kind: "monthly_days", days: [5, -1] }))).toBe(
      "le 5 et dernier jour de chaque mois",
    );
    expect(describeRule(recurrenceRuleSchema.parse({ kind: "interval_days", days: 7 }))).toBe(
      "tous les 7 jours",
    );
  });

  it("refuse les règles incohérentes", () => {
    expect(recurrenceRuleSchema.safeParse({ kind: "weekly", weekdays: [] }).success).toBe(false);
    expect(recurrenceRuleSchema.safeParse({ kind: "weekly", weekdays: [8] }).success).toBe(false);
    expect(
      recurrenceRuleSchema.safeParse({ kind: "monthly_weeks", weekdays: [1], weeks: [6] }).success,
    ).toBe(false);
    expect(recurrenceRuleSchema.safeParse({ kind: "dates", dates: ["30/09/2026"] }).success).toBe(
      false,
    );
  });
});
