import { describe, expect, it } from "vitest";

import { type CandidateAgent, documentAlertLevel, rankReplacements } from "../workforce";

const agent = (id: string, extra: Partial<CandidateAgent> = {}): CandidateAgent => ({
  id,
  name: id,
  kind: "employee",
  activities: [],
  absentDays: new Set(),
  busy: [],
  knowsSites: new Set(),
  ...extra,
});
const slot = {
  day: "2026-10-12",
  startTime: "08:00",
  durationMinutes: 60,
  siteId: "s1",
  activity: "copropriete",
};

describe("propositions de remplacement", () => {
  it("n°1, n°2, agents qualifiés, puis sous-traitants ; jamais un absent", () => {
    const list = rankReplacements(
      slot,
      { id: "absent", replacement1Id: "r1", replacement2Id: "r2" },
      [
        agent("absent"),
        agent("st", { kind: "subcontractor" }),
        agent("zoe", { activities: ["copropriete"] }),
        agent("bureaux", { activities: ["bureaux"] }),
        agent("ancien", { activities: ["bureaux"], knowsSites: new Set(["s1"]) }),
        agent("r2"),
        agent("r1"),
        agent("conge", { absentDays: new Set(["2026-10-12"]) }),
      ],
    );
    expect(list.map((p) => [p.agentId, p.rank])).toEqual([
      ["r1", "replacement1"],
      ["r2", "replacement2"],
      ["ancien", "qualified"],
      ["zoe", "qualified"],
      ["st", "subcontractor"],
    ]);
  });

  it("un remplaçant absent est sauté ; un agent déjà pris est signalé, placé après", () => {
    const list = rankReplacements(
      slot,
      { id: "absent", replacement1Id: "r1", replacement2Id: null },
      [
        agent("r1", { absentDays: new Set(["2026-10-12"]) }),
        agent("pris", { busy: [{ day: "2026-10-12", startTime: "08:30", durationMinutes: 60 }] }),
        agent("libre", { busy: [{ day: "2026-10-12", startTime: "10:00", durationMinutes: 60 }] }),
      ],
    );
    expect(list.map((p) => [p.agentId, p.conflict])).toEqual([
      ["libre", false],
      ["pris", true],
    ]);
  });

  it("attestations : expirée, bientôt, ou rien", () => {
    const today = new Date("2026-10-06T00:00:00Z");
    expect(documentAlertLevel(new Date("2026-10-01T00:00:00Z"), today)).toBe("expired");
    expect(documentAlertLevel(new Date("2026-10-30T00:00:00Z"), today)).toBe("soon");
    expect(documentAlertLevel(new Date("2027-01-30T00:00:00Z"), today)).toBeNull();
    expect(documentAlertLevel(null, today)).toBeNull();
  });
});
