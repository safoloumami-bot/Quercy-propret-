import { describe, expect, it } from "vitest";

describe("toCsv", async () => {
  const { toCsv } = await import("../export");

  it("échappe les séparateurs, guillemets et retours à la ligne", () => {
    const csv = toCsv([{ nom: 'Dupont "& Fils"', note: "a;b", ligne: "x\ny", n: 3, vide: null }]);
    expect(csv.startsWith("﻿")).toBe(true);
    const [header, row] = csv.slice(1).split("\r\n");
    expect(header).toBe("nom;note;ligne;n;vide");
    expect(row).toBe('"Dupont ""& Fils""";"a;b";"x\ny";3;');
  });

  it("sérialise les dates et objets", () => {
    const csv = toCsv([{ d: new Date("2026-01-02T03:04:05.000Z"), o: { a: 1 } }]);
    expect(csv).toContain("2026-01-02T03:04:05.000Z");
    expect(csv).toContain('"{""a"":1}"');
  });
});
