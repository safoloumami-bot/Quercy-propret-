import { prisma } from "@quercy/db";
import { afterAll, describe, expect, it } from "vitest";

import { claimDailyRun } from "../daily-on-ping";

afterAll(() => prisma.platformState.deleteMany({ where: { key: "daily-jobs" } }));

describe("tâches du jour lancées par le signal de réveil", () => {
  it("une seule fois par jour, et pas avant 5 h UTC", async () => {
    await prisma.platformState.deleteMany({ where: { key: "daily-jobs" } });
    expect(await claimDailyRun(new Date("2030-01-02T04:59:00Z"))).toBe(false);
    expect(await claimDailyRun(new Date("2030-01-02T05:10:00Z"))).toBe(true);
    expect(await claimDailyRun(new Date("2030-01-02T05:20:00Z"))).toBe(false);
    expect(await claimDailyRun(new Date("2030-01-03T05:00:00Z"))).toBe(true);
  });
});
