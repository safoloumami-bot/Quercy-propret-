import { randomBytes } from "node:crypto";

import { PRESET_REPORTS, SYSTEM_ROLES, resolvePeriod } from "@quercy/core";
import { type Prisma, prisma } from "@quercy/db";
import { closeMailer } from "@quercy/mailer";
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  AccessError,
  accessFor,
  dispatchScheduledReports,
  reportCsv,
  reportPdf,
  runReport,
} from "../index";

const run = randomBytes(4).toString("hex");
let orgId = "";
let ownerId = "";
let memberId = "";
const def = PRESET_REPORTS.find((r) => r.key === "revenue-by-customer")!.definition;

beforeAll(async () => {
  process.env.ENABLE_DEV_MAILBOX = "false";
  delete process.env.RESEND_API_KEY;
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  const org = await prisma.organization.create({
    data: { name: "Rapports test", slug: `rapports-${run}`, modules: ["sales", "crm"] },
  });
  orgId = org.id;
  const [ownerRole, memberRole] = await Promise.all([
    prisma.role.create({
      data: {
        organizationId: orgId,
        name: "Propriétaire",
        systemKey: "owner",
        permissions: SYSTEM_ROLES.owner,
      },
    }),
    prisma.role.create({
      data: {
        organizationId: orgId,
        name: "Membre",
        systemKey: "member",
        permissions: SYSTEM_ROLES.member,
      },
    }),
  ]);
  const owner = await prisma.user.create({
    data: { email: `owner-${run}@test.quercy.app`, name: "Owner" },
  });
  const member = await prisma.user.create({
    data: { email: `member-${run}@test.quercy.app`, name: "Member" },
  });
  ownerId = owner.id;
  memberId = member.id;
  await prisma.membership.createMany({
    data: [
      { organizationId: orgId, userId: ownerId, roleId: ownerRole.id },
      { organizationId: orgId, userId: memberId, roleId: memberRole.id },
    ],
  });
  const [a, b] = await Promise.all([
    prisma.company.create({ data: { organizationId: orgId, name: "Alpha" } }),
    prisma.company.create({ data: { organizationId: orgId, name: "Bêta" } }),
  ]);
  const issue = new Date("2026-09-10T10:00:00Z");
  await prisma.salesDocument.createMany({
    data: [
      {
        organizationId: orgId,
        kind: "INVOICE",
        status: "paid",
        companyId: a.id,
        totalExclCents: 100_000,
        issueDate: issue,
        ownerId,
      },
      {
        organizationId: orgId,
        kind: "INVOICE",
        status: "sent",
        companyId: b.id,
        totalExclCents: 50_000,
        issueDate: issue,
        ownerId: memberId,
      },
      {
        organizationId: orgId,
        kind: "INVOICE",
        status: "draft",
        companyId: b.id,
        totalExclCents: 999_999,
        issueDate: issue,
        ownerId,
      },
      {
        organizationId: orgId,
        kind: "QUOTE",
        status: "sent",
        companyId: b.id,
        totalExclCents: 777_777,
        issueDate: issue,
        ownerId,
      },
    ],
  });
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: orgId } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, memberId] } } });
  await closeMailer();
  await prisma.$disconnect();
});

describe("rapports", () => {
  const period = resolvePeriod({ preset: "month" }, new Date("2026-09-20T10:00:00Z"));

  it("agrège les seules factures émises du périmètre, avec les noms des clients", async () => {
    const access = await accessFor(orgId, ownerId, "invoice", "view");
    const result = await runReport(access.db, { definition: def, ...access, range: period });
    expect(result.points.map((p) => [p.label, p.value])).toEqual([
      ["Alpha", 100_000],
      ["Bêta", 50_000],
    ]);
    expect(result.total).toBe(150_000);
    const csv = reportCsv(def, result);
    expect(csv).toContain("Alpha;1000");
    const pdf = await PDFDocument.load(
      await reportPdf("CA par client", def, result, period, "Rapports test"),
    );
    expect(pdf.getTitle()).toBe("CA par client");
  });

  it("refuse un module désactivé", async () => {
    await expect(accessFor(orgId, ownerId, "task", "view")).rejects.toBeInstanceOf(AccessError);
  });

  it("envoie les rapports hebdomadaires le lundi, une seule fois", async () => {
    const report = await prisma.report.create({
      data: {
        organizationId: orgId,
        ownerId,
        name: "CA par client",
        definition: def as unknown as Prisma.InputJsonValue,
        period: "7d",
        schedule: "weekly",
        recipients: ["direction@exemple.fr"],
      },
    });
    const monday = new Date("2026-09-28T05:30:00Z");
    const first = await dispatchScheduledReports("https://app.quercy.test", monday);
    expect(first.sent).toBeGreaterThanOrEqual(1);
    expect(
      (await prisma.report.findUniqueOrThrow({ where: { id: report.id } })).lastSentAt,
    ).not.toBeNull();
    const again = await dispatchScheduledReports(
      "https://app.quercy.test",
      new Date("2026-09-28T09:00:00Z"),
    );
    expect(again.sent).toBe(0);
  });
});
