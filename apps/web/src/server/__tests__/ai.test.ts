import type { Server } from "node:http";

import { aiMonthlyQuota } from "@quercy/core";
import { prisma } from "@quercy/db";
import { closeMailer } from "@quercy/mailer";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { type RecordedRequest, startFakeAnthropic } from "../../../scripts/fake-anthropic";
import type { AiPart, AiStreamEvent } from "@/lib/ai-types";

import { runChat, trimHistory } from "../ai/chat";
import { extractDocument } from "../ai/extract";
import { resolveWorkspace } from "../workspace";
import { expectCode, testFixtures } from "./helpers";

const fx = testFixtures("ai");
type Api = Awaited<ReturnType<typeof fx.caller>>;

let server: Server;
let requests: RecordedRequest[];
let orgId: string;
let owner: { id: string; name: string; email: string };
let ownerApi: Api;
let memberApi: Api;
let companyId: string;
let invoiceId: string;

async function ask(text: string, conversationId: string | null = null, screen = null) {
  const events: AiStreamEvent[] = [];
  const workspace = (await resolveWorkspace(owner.id, orgId))!;
  await runChat({
    workspace,
    user: owner,
    caller: ownerApi,
    conversationId,
    text,
    screen,
    emit: (e) => events.push(e),
  });
  const parts = events.flatMap((e) => (e.type === "part" ? [e.part] : []));
  const answer = events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("");
  const conversation = events.find((e) => e.type === "conversation") as { id: string } | undefined;
  return { events, parts, answer, conversationId: conversation?.id ?? null };
}

const actionOf = (parts: AiPart[]) =>
  parts.find((p): p is Extract<AiPart, { type: "action" }> => p.type === "action");

beforeAll(async () => {
  const fake = await startFakeAnthropic();
  server = fake.server;
  requests = fake.requests;
  process.env.ANTHROPIC_API_KEY = "sk-test";
  process.env.ANTHROPIC_BASE_URL = fake.url;
  process.env.ENABLE_DEV_MAILBOX = "false";
  delete process.env.RESEND_API_KEY;
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  const o = await fx.user("owner");
  owner = { id: o.id, name: o.name, email: o.email };
  const member = await fx.user("member");
  const org = await fx.org("a");
  orgId = org.id;
  await fx.member(orgId, owner.id, "owner");
  await fx.member(orgId, member.id, "member");
  ownerApi = await fx.caller(owner, orgId);
  memberApi = await fx.caller(member, orgId);

  const company = await ownerApi.records.create({
    entity: "company",
    values: { name: "Dupont Rénovation", email: "compta@dupont.fr" },
  });
  companyId = company.id;
  const invoice = await ownerApi.records.create({ entity: "invoice", values: { companyId } });
  invoiceId = invoice.id;
  await ownerApi.sales.saveLines({
    id: invoiceId,
    lines: [
      {
        description: "Chantier",
        quantity: 1,
        unitPriceCents: 100_000,
        discountPercent: 0,
        vatRate: 20,
      },
    ],
  });
  await ownerApi.sales.send({ id: invoiceId, to: "compta@dupont.fr" });
  await prisma.salesDocument.update({
    where: { id: invoiceId },
    data: { status: "overdue", dueDate: new Date(Date.now() - 20 * 86_400_000) },
  });
});

afterAll(async () => {
  server.close();
  await fx.cleanup();
  await closeMailer();
  await prisma.$disconnect();
});

describe("assistant — questions sur les données", () => {
  it("répond avec un graphique, un lien vers la liste filtrée et garde la conversation", async () => {
    const before = requests.length;
    const { parts, answer, conversationId, events } = await ask(
      "Quel est mon chiffre d'affaires ?",
    );
    const chart = parts.find((p) => p.type === "chart");
    expect(chart).toMatchObject({ type: "chart", total: 100_000 });
    expect(answer).toMatch(/1\s000\s€/);
    expect(answer).toContain("](/ventes/factures?filtre=");
    expect(events.at(-1)).toMatchObject({ type: "done", creditsUsed: 1 });

    // Deux appels : outil puis réponse ; invite système en cache, repli serveur activé.
    const calls = requests.slice(before);
    expect(calls).toHaveLength(2);
    expect(calls[0]!.headers["anthropic-beta"]).toContain("server-side-fallback-2026-07-01");
    expect(calls[0]!.body).toMatchObject({
      stream: true,
      cache_control: { type: "ephemeral" },
      fallbacks: "default",
    });

    const saved = await prisma.aiConversation.findUniqueOrThrow({ where: { id: conversationId! } });
    const messages = saved.messages as { role: string }[];
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant", "user", "assistant"]);
    expect(await prisma.aiUsage.count({ where: { organizationId: orgId, kind: "chat" } })).toBe(1);
    const conversation = await ownerApi.ai.conversation({ id: conversationId! });
    expect(conversation.turns).toHaveLength(2);
    // Une conversation est personnelle.
    await expectCode(memberApi.ai.conversation({ id: conversationId! }), "NOT_FOUND");
  });

  it("résume la fiche ouverte (contexte de l'écran)", async () => {
    const { answer } = await (async () => {
      const events: AiStreamEvent[] = [];
      await runChat({
        workspace: (await resolveWorkspace(owner.id, orgId))!,
        user: owner,
        caller: ownerApi,
        conversationId: null,
        text: "Résume cette fiche",
        screen: { path: `/crm/entreprises/${companyId}`, entity: "company", recordId: companyId },
        emit: (e) => events.push(e),
      });
      return { answer: events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("") };
    })();
    expect(answer).toContain("Dupont Rénovation");
  });
});

describe("assistant — actions confirmées", () => {
  it("prépare les relances, ne les envoie qu'après confirmation, une seule fois", async () => {
    const { parts, conversationId } = await ask("Relance tous les impayés de plus de 15 jours");
    const action = actionOf(parts)!;
    expect(action.summary).toContain("compta@dupont.fr");
    const doc = () => prisma.salesDocument.findUniqueOrThrow({ where: { id: invoiceId } });
    expect((await doc()).reminderCount).toBe(0);

    await expectCode(memberApi.ai.confirmAction({ id: action.actionId }), "NOT_FOUND");
    const result = await ownerApi.ai.confirmAction({ id: action.actionId });
    expect(result).toMatchObject({ status: "confirmed" });
    expect((await doc()).reminderCount).toBe(1);
    await expectCode(ownerApi.ai.confirmAction({ id: action.actionId }), "CONFLICT");

    // Le tour suivant informe l'assistant du résultat.
    const before = requests.length;
    await ask("Merci", conversationId);
    expect(JSON.stringify(requests[before]!.body.messages.at(-1))).toContain(
      "confirmée et exécutée",
    );
  });

  it("crée le devis demandé après confirmation ; un refus n'exécute rien", async () => {
    const first = await ask("Crée un devis pour Dupont");
    const action = actionOf(first.parts)!;
    const count = () =>
      prisma.salesDocument.count({ where: { organizationId: orgId, kind: "QUOTE" } });
    await ownerApi.ai.rejectAction({ id: action.actionId });
    expect(await count()).toBe(0);
    await expectCode(ownerApi.ai.confirmAction({ id: action.actionId }), "CONFLICT");

    const second = await ask("Crée un devis pour Dupont");
    const result = await ownerApi.ai.confirmAction({ id: actionOf(second.parts)!.actionId });
    expect(result.status).toBe("confirmed");
    const quote = await prisma.salesDocument.findFirstOrThrow({
      where: { organizationId: orgId, kind: "QUOTE" },
    });
    expect(quote).toMatchObject({ companyId, totalExclCents: 130_000, status: "draft" });
  });
});

describe("assistant — limites et erreurs", () => {
  it("n'enregistre ni historique ni crédit quand le service échoue", async () => {
    const usage = await prisma.aiUsage.count({ where: { organizationId: orgId } });
    const { events, conversationId } = await ask("Provoque une erreur de service");
    expect(events.some((e) => e.type === "error")).toBe(true);
    const saved = await prisma.aiConversation.findUniqueOrThrow({ where: { id: conversationId! } });
    expect(saved.messages).toEqual([]);
    expect(await prisma.aiUsage.count({ where: { organizationId: orgId } })).toBe(usage);
  });

  it("signale un refus sans inventer de réponse", async () => {
    const { parts } = await ask("Fais quelque chose d'interdit");
    expect(parts).toContainEqual(expect.objectContaining({ type: "notice", tone: "warning" }));
  });

  it("refuse une question quand les crédits du mois sont épuisés", async () => {
    const status = await ownerApi.ai.status();
    expect(status.configured).toBe(true);
    expect(status.credits.quota).toBe(aiMonthlyQuota("BUSINESS", 2));
    await prisma.aiUsage.create({
      data: {
        organizationId: orgId,
        userId: owner.id,
        kind: "chat",
        credits: status.credits.left,
        model: "test",
      },
    });
    const { events } = await ask("Bonjour");
    expect(events).toEqual([expect.objectContaining({ type: "error" })]);
    await prisma.aiUsage.deleteMany({ where: { organizationId: orgId, model: "test" } });
  });
});

describe("assistant — lecture de documents", () => {
  it("extrait montant, TVA, date et fournisseur, et vérifie la cohérence", async () => {
    const workspace = (await resolveWorkspace(owner.id, orgId))!;
    const result = await extractDocument({
      workspace,
      userId: owner.id,
      conversationId: null,
      fileName: "facture.pdf",
      mime: "application/pdf",
      bytes: Buffer.from("%PDF-1.4 test"),
    });
    expect(result.part).toMatchObject({
      type: "extraction",
      consistent: true,
      data: { supplierName: "Papeterie Martin", totalIncludingTax: 120, issueDate: "2026-09-12" },
    });
    const usage = await prisma.aiUsage.findFirstOrThrow({
      where: { organizationId: orgId, kind: "extraction" },
    });
    expect(usage.credits).toBe(3);
    const sent = requests.at(-1)!.body.messages[0]!.content as { type: string }[];
    expect(sent[0]!.type).toBe("document");
  });
});

describe("historique borné", () => {
  it("garde les dernières questions complètes", () => {
    const q = (n: number) => ({ role: "user" as const, content: `q${n}` });
    const a = { role: "assistant" as const, content: "r" };
    const tool = {
      role: "user" as const,
      content: [{ type: "tool_result" as const, tool_use_id: "t", content: "{}" }],
    };
    const history = [q(1), a, q(2), a, tool, a, q(3), a];
    expect(trimHistory(history, 2)).toEqual([q(2), a, tool, a, q(3), a]);
    expect(trimHistory(history, 5)).toEqual(history);
  });
});
