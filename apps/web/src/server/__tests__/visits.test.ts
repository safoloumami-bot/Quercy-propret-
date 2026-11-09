import { prisma } from "@quercy/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { recordView, referrerHost, visitorId } from "../analytics/visits";
import { expectCode, testFixtures } from "./helpers";

const fx = testFixtures("visites");
const PHONE =
  "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36";
let orgA: string;
let orgB: string;
let ownerA: Awaited<ReturnType<typeof fx.caller>>;
let admin: Awaited<ReturnType<typeof fx.caller>>;

beforeAll(async () => {
  const a = await fx.user("owner-a");
  orgA = (await fx.org("a")).id;
  orgB = (await fx.org("b")).id;
  await fx.member(orgA, a.id, "owner");
  ownerA = await fx.caller(a, orgA);
  const boss = await prisma.user.update({
    where: { id: (await fx.user("equipe-sebt")).id },
    data: { role: "admin" },
  });
  await fx.member(orgA, boss.id, "owner");
  admin = await fx.caller(boss, orgA);
  await prisma.website.create({
    data: { organizationId: orgA, slug: `visites-a-${fx.run}`, draft: { name: "A" } },
  });
});

afterAll(async () => {
  await prisma.pageView.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
  await prisma.website.deleteMany({ where: { organizationId: orgA } });
  await fx.cleanup();
});

describe("visites sans cookie", () => {
  it("garde le domaine d'origine seulement et ignore les robots", async () => {
    expect(referrerHost("https://www.google.fr/search?q=plombier")).toBe("google.fr");
    expect(referrerHost("https://dupont.fr/contact", "dupont.fr")).toBeNull();
    expect(visitorId("1.2.3.4", PHONE)).toHaveLength(20);
    expect(
      await recordView({
        kind: "site",
        organizationId: orgA,
        path: "/",
        ip: "1.2.3.4",
        userAgent: "Googlebot/2.1",
      }),
    ).toBe(false);
  });

  it("chaque entreprise ne voit que les visites de son site", async () => {
    for (const [org, path] of [
      [orgA, "/"],
      [orgA, "/contact?x=1"],
      [orgB, "/"],
    ] as const)
      await recordView({
        kind: "site",
        organizationId: org,
        path,
        referrer: "https://www.google.fr/",
        ip: "1.2.3.4",
        userAgent: PHONE,
      });
    const stats = await ownerA.website.stats();
    expect(stats.views).toBe(2);
    expect(stats.visitors).toBe(1);
    expect(stats.pages.map((p) => p.path).sort()).toEqual(["/", "/contact"]);
    expect(stats.referrers).toEqual([{ host: "google.fr", views: 2 }]);
    expect(stats.mobileShare).toBe(1);
    expect(stats.series).toHaveLength(30);
  });

  it("la surveillance de la plateforme est réservée à l'équipe sebt", async () => {
    await expectCode(ownerA.admin.activity(), "FORBIDDEN");
    const a = await admin.admin.activity();
    expect(a.signups).toHaveLength(30);
    expect(a.sites.views).toBeGreaterThanOrEqual(3);
    expect(a.feed.some((e) => e.kind === "user")).toBe(true);
  });
});
