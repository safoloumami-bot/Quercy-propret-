import { describe, expect, it } from "vitest";

import {
  anomalyClientEligible,
  anomalyTransition,
  anomalyTypeLabel,
  detectPointageAnomalies,
} from "../anomalies";

describe("circuit des anomalies", () => {
  it("validation ou rejet depuis « à valider », puis traitement", () => {
    expect(anomalyTransition("reported", "validate")).toBe("validated");
    expect(anomalyTransition("reported", "reject")).toBe("rejected");
    expect(anomalyTransition("validated", "start")).toBe("in_progress");
    expect(anomalyTransition("in_progress", "resolve")).toBe("resolved");
    expect(anomalyTransition("resolved", "reopen")).toBe("reported");
  });

  it("refuse les sauts d'étape", () => {
    expect(anomalyTransition("reported", "resolve")).toBeNull();
    expect(anomalyTransition("reported", "start")).toBeNull();
    expect(anomalyTransition("rejected", "validate")).toBeNull();
  });

  it("jamais montrable au client avant validation", () => {
    expect(anomalyClientEligible("reported")).toBe(false);
    expect(anomalyClientEligible("rejected")).toBe(false);
    expect(anomalyClientEligible("validated")).toBe(true);
    expect(anomalyClientEligible("resolved")).toBe(true);
  });

  it("libellés", () => {
    expect(anomalyTypeLabel("leak")).toBe("Fuite / eau");
    expect(anomalyTypeLabel("missed_visit")).toBe("Passage non réalisé");
    expect(anomalyTypeLabel("inconnu")).toBe("inconnu");
  });
});

describe("détection sur les pointages", () => {
  const base = {
    id: "i1",
    date: new Date("2026-10-05T00:00:00Z"),
    startTime: "08:00",
    durationMinutes: 60,
  };

  it("rien à signaler pour un passage normal (heure de Paris)", () => {
    expect(
      detectPointageAnomalies({
        ...base,
        // 08:10 à Paris (UTC+2 en octobre).
        checkInAt: new Date("2026-10-05T06:10:00Z"),
        checkOutAt: new Date("2026-10-05T07:05:00Z"),
      }),
    ).toEqual([]);
  });

  it("arrivée plus de deux heures après l'heure prévue", () => {
    const found = detectPointageAnomalies({
      ...base,
      checkInAt: new Date("2026-10-05T08:30:00Z"),
      checkOutAt: null,
    });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ type: "off_schedule", dedupeKey: "creneau:i1" });
    expect(found[0]!.comment).toContain("10h30");
  });

  it("arrivée un autre jour", () => {
    const found = detectPointageAnomalies({
      ...base,
      checkInAt: new Date("2026-10-06T06:00:00Z"),
      checkOutAt: null,
    });
    expect(found[0]?.comment).toContain("2026-10-06");
  });

  it("durée anormale : trop courte ou trop longue", () => {
    const short = detectPointageAnomalies({
      ...base,
      checkInAt: new Date("2026-10-05T06:00:00Z"),
      checkOutAt: new Date("2026-10-05T06:20:00Z"),
    });
    expect(short).toEqual([
      expect.objectContaining({ type: "abnormal_duration", severity: "high" }),
    ]);
    const long = detectPointageAnomalies({
      ...base,
      checkInAt: new Date("2026-10-05T06:00:00Z"),
      checkOutAt: new Date("2026-10-05T08:30:00Z"),
    });
    expect(long[0]?.type).toBe("abnormal_duration");
  });
});
