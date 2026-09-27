import { describe, expect, it } from "vitest";

import { parseSse, screenFromPath } from "../ai-screen";

describe("screenFromPath", () => {
  it("reconnaît la liste et la fiche d'une entité", () => {
    expect(screenFromPath("/crm/entreprises")).toEqual({ entity: "company" });
    expect(screenFromPath("/ventes/factures/abc123")).toEqual({
      entity: "invoice",
      recordId: "abc123",
    });
    expect(screenFromPath("/ventes/factures/nouveau")).toEqual({ entity: "invoice" });
    expect(screenFromPath("/rapports")).toEqual({});
    expect(screenFromPath("/")).toEqual({});
  });
});

describe("parseSse", () => {
  it("rend les événements complets et garde le reste pour la suite", () => {
    const first = parseSse('data: {"type":"text","delta":"Bon"}\n\ndata: {"type":"te');
    expect(first.events).toEqual([{ type: "text", delta: "Bon" }]);
    const second = parseSse(first.rest + 'xt","delta":"jour"}\n\n');
    expect(second).toEqual({ events: [{ type: "text", delta: "jour" }], rest: "" });
  });

  it("ignore les fragments illisibles", () => {
    expect(parseSse("data: {oups\n\n: commentaire\n\n").events).toEqual([]);
  });
});
