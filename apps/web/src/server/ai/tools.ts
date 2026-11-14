import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import {
  CHART_TYPES,
  DATE_BUCKETS,
  ENTITIES,
  ENTITY_KEYS,
  type EntityKey,
  type FieldDef,
  type FilterGroup,
  OPERATORS,
  PERIOD_PRESETS,
  can,
  computeTotals,
  formatCents,
  isDocumentEntity,
  lineTotalCents,
  parseRecordInput,
  recordPath,
} from "@quercy/core";
import { formatMeasure } from "@quercy/reports";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { AiPart } from "@/lib/ai-types";
import { filteredListHref } from "@/lib/filter-param";

import { readableValue } from "../records/format";
import type { createCaller } from "../trpc/root";
import type { ResolvedWorkspace } from "../workspace";

export type Caller = ReturnType<typeof createCaller>;

export interface ToolContext {
  caller: Caller;
  workspace: ResolvedWorkspace;
  /** Enregistre une action proposée et renvoie son identifiant. */
  propose: (tool: string, input: unknown, summary: string) => Promise<string>;
}

export interface ToolOutcome {
  /** Contenu renvoyé au modèle (JSON). */
  content: string;
  isError?: boolean;
  /** Élément affiché dans le panneau. */
  part?: AiPart;
}

const clean = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");
const euros = (cents: number) => clean(formatCents(cents));

const ruleSchema = z.object({
  field: z.string().max(80).describe("Clé du champ (voir le schéma des données)"),
  operator: z.enum(OPERATORS),
  value: z
    .unknown()
    .optional()
    .describe("Valeur selon l'opérateur ; montants en euros, dates AAAA-MM-JJ"),
});

function toFilter(rules: z.infer<typeof ruleSchema>[], match: "all" | "any"): FilterGroup {
  return { combinator: match === "all" ? "and" : "or", rules };
}

function allowed(
  workspace: ResolvedWorkspace,
  entity: EntityKey,
  action: "view" | "create" | "update",
) {
  const moduleKey = ENTITIES[entity].module;
  return (
    workspace.organization.modules.includes(moduleKey) &&
    can(workspace.role.permissions, moduleKey, action)
  );
}

/** Colonnes résumées d'une entité : champs visibles par défaut (hors titre). */
function summaryFields(entity: EntityKey): FieldDef[] {
  const def = ENTITIES[entity];
  return def.fields.filter((f) => f.defaultVisible && !def.titleFields.includes(f.key)).slice(0, 6);
}

type Row = Record<string, unknown> & { id: string; title: string; labels: Record<string, string> };

function rowForModel(entity: EntityKey, row: Row, fields: FieldDef[]) {
  const out: Record<string, string> = { id: row.id, titre: row.title };
  for (const f of fields) {
    const v = readableValue(f, row);
    if (v) out[f.label] = v;
  }
  out.url = recordPath(entity, row.id);
  return out;
}

// ─────────────────────────── Schémas d'entrée ───────────────────────────

const searchInput = z.object({
  entity: z.enum(ENTITY_KEYS),
  filters: z.array(ruleSchema).max(15).default([]),
  match: z
    .enum(["all", "any"])
    .default("all")
    .describe("all : toutes les règles ; any : au moins une"),
  sort: z
    .array(z.object({ field: z.string().max(80), direction: z.enum(["asc", "desc"]) }))
    .max(3)
    .default([]),
  search: z.string().max(120).optional().describe("Recherche plein texte (nom, email…)"),
  limit: z.number().int().min(1).max(50).default(20),
});

const reportInput = z.object({
  entity: z.enum(ENTITY_KEYS),
  measure: z.enum(["count", "sum", "avg"]),
  measureField: z.string().max(80).optional().describe("Champ numérique pour sum/avg"),
  groupBy: z
    .string()
    .max(80)
    .optional()
    .describe("Champ de regroupement (liste, personne, relation, date)"),
  dateBucket: z.enum(DATE_BUCKETS).optional().describe("Obligatoire si groupBy est une date"),
  dateField: z.string().max(80).optional().describe("Champ date sur lequel appliquer la période"),
  period: z
    .object({
      preset: z.enum(PERIOD_PRESETS),
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .default({ preset: "12m" }),
  filters: z.array(ruleSchema).max(15).default([]),
  chart: z.enum(CHART_TYPES).default("bar"),
  limit: z.number().int().min(1).max(50).default(12),
});

const getRecordInput = z.object({ entity: z.enum(ENTITY_KEYS), id: z.string().min(1).max(40) });

const createRecordInput = z.object({
  entity: z.enum(ENTITY_KEYS),
  values: z
    .record(z.string(), z.unknown())
    .describe("Valeurs par clé de champ ; relations = identifiants"),
});

const updateRecordInput = z.object({
  entity: z.enum(ENTITY_KEYS),
  id: z.string().min(1).max(40),
  values: z.record(z.string(), z.unknown()),
});

const quoteInput = z.object({
  companyId: z.string().min(1).max(40),
  contactId: z.string().min(1).max(40).optional(),
  subject: z.string().max(200),
  lines: z
    .array(
      z.object({
        description: z.string().min(1).max(2000),
        quantity: z.number().positive(),
        unitPrice: z.number().describe("Prix unitaire HT en euros"),
        vatRate: z.number().min(0).max(100).default(20),
        discountPercent: z.number().min(0).max(100).default(0),
        unit: z.string().max(20).optional(),
        productId: z.string().max(40).optional(),
      }),
    )
    .min(1)
    .max(50),
});

const remindersInput = z.object({
  invoiceIds: z.array(z.string().min(1).max(40)).min(1).max(50),
  message: z
    .string()
    .max(3000)
    .optional()
    .describe("Message personnalisé (sinon message de relance standard)"),
});

const sendInput = z.object({
  id: z
    .string()
    .min(1)
    .max(40)
    .describe("Identifiant du devis, de la commande, de la facture ou de l'avoir"),
  to: z.email().optional().describe("Destinataire (par défaut : email du contact ou du client)"),
  message: z.string().max(3000).optional(),
});

// ─────────────────────────── Définitions ───────────────────────────

function schemaOf(schema: z.ZodType): Anthropic.Beta.BetaTool["input_schema"] {
  const { $schema: _ignored, ...json } = z.toJSONSchema(schema, { io: "input" }) as Record<
    string,
    unknown
  >;
  return json as Anthropic.Beta.BetaTool["input_schema"];
}

export const TOOL_DEFINITIONS: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_records",
    description:
      "Recherche des fiches d'une entité (clients, contacts, opportunités, factures, tâches…) avec filtres, tri et limite. Renvoie le nombre total, les premières fiches (valeurs lisibles) et l'adresse de la liste filtrée. À utiliser pour « quelles factures… », « liste des clients… », pour retrouver un identifiant par nom.",
    input_schema: schemaOf(searchInput),
  },
  {
    name: "run_report",
    description:
      "Calcule un agrégat (nombre, somme, moyenne) éventuellement regroupé (par client, statut, mois…) sur une période. Renvoie le total et chaque groupe avec un lien vers la liste filtrée ; le résultat s'affiche en graphique. À utiliser pour « CA de mars par client », « nombre de devis par statut », « temps passé par projet ».",
    input_schema: schemaOf(reportInput),
  },
  {
    name: "get_record",
    description:
      "Détail d'une fiche : tous ses champs, les fiches liées (contacts, devis, factures, tâches…) et, pour un document commercial, ses lignes et paiements. À utiliser pour résumer un client, un projet, une facture.",
    input_schema: schemaOf(getRecordInput),
  },
  {
    name: "list_members",
    description:
      "Liste les membres de l'espace (identifiant, nom, email), pour attribuer une fiche à quelqu'un.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "propose_create_record",
    description:
      "PRÉPARE la création d'une fiche (contact, entreprise, opportunité, activité, tâche, projet, article…), soumise à la confirmation de la personne. Pas pour les devis (propose_create_quote).",
    input_schema: schemaOf(createRecordInput),
  },
  {
    name: "propose_update_record",
    description: "PRÉPARE la modification de champs d'une fiche existante, soumise à confirmation.",
    input_schema: schemaOf(updateRecordInput),
  },
  {
    name: "propose_create_quote",
    description:
      "PRÉPARE un devis brouillon pour un client avec ses lignes (prix HT en euros), soumis à confirmation. Rechercher d'abord l'identifiant du client et, si utile, les articles du catalogue (entité product) pour leurs prix.",
    input_schema: schemaOf(quoteInput),
  },
  {
    name: "propose_invoice_reminders",
    description:
      "PRÉPARE l'envoi d'emails de relance pour des factures impayées (émises, partiellement payées ou en retard), soumis à confirmation. Rechercher d'abord les factures concernées.",
    input_schema: schemaOf(remindersInput),
  },
  {
    name: "propose_send_document",
    description:
      "PRÉPARE l'envoi par email d'un devis, d'une commande, d'une facture ou d'un avoir (PDF joint), soumis à confirmation.",
    input_schema: schemaOf(sendInput),
  },
];

export const TOOL_LABELS: Record<string, string> = {
  search_records: "Recherche dans les fiches",
  run_report: "Calcul",
  get_record: "Lecture d'une fiche",
  list_members: "Liste des membres",
  propose_create_record: "Préparation d'une création",
  propose_update_record: "Préparation d'une modification",
  propose_create_quote: "Préparation d'un devis",
  propose_invoice_reminders: "Préparation des relances",
  propose_send_document: "Préparation d'un envoi",
};

// ─────────────────────────── Exécution ───────────────────────────

const json = (value: unknown) => JSON.stringify(value);

async function relationLabel(caller: Caller, field: FieldDef, id: unknown): Promise<string> {
  if (typeof id !== "string" || !field.relation) return String(id ?? "");
  try {
    const record = await caller.records.get({ entity: field.relation, id });
    return record.row.title;
  } catch {
    return `introuvable (${id})`;
  }
}

async function describeValues(caller: Caller, entity: EntityKey, values: Record<string, unknown>) {
  const fields = ENTITIES[entity].fields;
  const lines: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    const field = fields.find((f) => f.key === key);
    if (!field) continue;
    let shown = Array.isArray(value) ? value.join(", ") : String(value ?? "—");
    if (field.type === "relation") shown = await relationLabel(caller, field, value);
    if (field.type === "select")
      shown = field.options?.find((o) => o.value === value)?.label ?? shown;
    lines.push(`${field.label} : ${shown}`);
  }
  return lines;
}

const TOOLS: Record<string, (input: unknown, ctx: ToolContext) => Promise<ToolOutcome>> = {
  async search_records(raw, { caller }) {
    const input = searchInput.parse(raw);
    const filter = toFilter(input.filters, input.match);
    const result = await caller.records.list({
      entity: input.entity,
      filter,
      sort: input.sort,
      search: input.search,
      limit: input.limit,
    });
    const fields = summaryFields(input.entity);
    const rows = result.rows as Row[];
    const href = filteredListHref(input.entity, filter);
    const def = ENTITIES[input.entity];
    return {
      content: json({
        total: result.total,
        shown: rows.length,
        rows: rows.map((r) => rowForModel(input.entity, r, fields)),
        listUrl: href,
      }),
      part: {
        type: "table",
        entity: input.entity,
        title: `${def.labelPlural} — ${result.total} résultat${result.total > 1 ? "s" : ""}`,
        columns: [def.label, ...fields.map((f) => f.label)],
        rows: rows.map((r) => ({
          id: r.id,
          href: recordPath(input.entity, r.id),
          cells: [r.title, ...fields.map((f) => readableValue(f, r))],
        })),
        total: result.total,
        href,
      },
    };
  },

  async run_report(raw, { caller }) {
    const input = reportInput.parse(raw);
    const definition = {
      entity: input.entity,
      measure:
        input.measure === "count"
          ? { op: "count" as const }
          : { op: input.measure, field: input.measureField ?? null },
      groupBy: input.groupBy ?? null,
      dateBucket: input.dateBucket ?? null,
      dateField: input.dateField ?? null,
      filter: toFilter(input.filters, "all"),
      chart: input.chart,
      limit: input.limit,
      sort: input.dateBucket ? ("label" as const) : ("value_desc" as const),
    };
    const result = await caller.reports.run({
      definition,
      period: input.period.preset === "custom" ? input.period : { preset: input.period.preset },
    });
    const format = (v: number) => clean(formatMeasure(result.measureField, v));
    return {
      content: json({
        measure: result.measure,
        period: result.period ?? "toutes périodes",
        total: format(result.total),
        records: result.count,
        groups: result.points.map((p) => ({
          label: p.label,
          value: format(p.value),
          records: p.count,
          url: p.href,
        })),
        listUrl: result.href,
      }),
      part: {
        type: "chart",
        title: `${result.measure}${result.period ? ` · ${result.period}` : ""}`,
        chart: input.groupBy ? input.chart : "number",
        definition,
        measureField: result.measureField,
        total: result.total,
        points: result.points,
        href: result.href,
      },
    };
  },

  async get_record(raw, { caller, workspace }) {
    const input = getRecordInput.parse(raw);
    const { row } = await caller.records.get({ entity: input.entity, id: input.id });
    const def = ENTITIES[input.entity];
    const details: Record<string, string> = {};
    for (const f of def.fields) {
      const v = readableValue(f, row as Row);
      if (v) details[f.label] = v;
    }
    const related: Record<string, unknown> = {};
    for (const r of def.related ?? []) {
      if (!allowed(workspace, r.entity, "view")) continue;
      const list = await caller.records.list({
        entity: r.entity,
        and: { field: r.field, operator: "in", value: [input.id] },
        limit: 10,
      });
      const fields = summaryFields(r.entity);
      related[r.label] = {
        total: list.total,
        items: (list.rows as Row[]).map((x) => rowForModel(r.entity, x, fields)),
        listUrl: filteredListHref(r.entity, {
          combinator: "and",
          rules: [{ field: r.field, operator: "in", value: [input.id] }],
        }),
      };
    }
    let document: unknown;
    if (isDocumentEntity(input.entity)) {
      const { doc } = await caller.sales.document({ id: input.id });
      document = {
        lignes: doc.lines.map((l) => ({
          designation: l.description,
          quantite: l.quantity,
          prixUnitaireHT: euros(l.unitPriceCents),
          remise: l.discountPercent ? `${l.discountPercent} %` : undefined,
          tva: `${l.vatRate} %`,
          totalHT: euros(l.totalExclCents),
        })),
        paiements: doc.payments.map((p) => ({
          date: p.date.toISOString().slice(0, 10),
          montant: euros(p.amountCents),
          moyen: p.method,
        })),
        resteDu: euros(doc.dueCents),
        relances: doc.reminderCount,
        lienClient: doc.publicUrl,
      };
    }
    return {
      content: json({
        entity: input.entity,
        id: input.id,
        title: row.title,
        url: recordPath(input.entity, input.id),
        details,
        related,
        document,
      }),
    };
  },

  async list_members(_input, { caller }) {
    const members = await caller.records.options({ kind: "user" });
    return { content: json(members.map((m) => ({ id: m.value, name: m.label, email: m.hint }))) };
  },

  async propose_create_record(raw, { caller, workspace, propose }) {
    const input = createRecordInput.parse(raw);
    const def = ENTITIES[input.entity];
    if (def.customPage)
      return {
        content: json({
          error:
            "Pour un devis, utilisez propose_create_quote ; les autres documents se créent depuis un devis ou l'écran Ventes.",
        }),
        isError: true,
      };
    if (!allowed(workspace, input.entity, "create"))
      return {
        content: json({ error: "Le rôle de la personne ne permet pas de créer ce type de fiche." }),
        isError: true,
      };
    const parsed = parseRecordInput(def.fields, input.values, "create");
    if (!parsed.success)
      return {
        content: json({ error: "Valeurs invalides", details: parsed.errors }),
        isError: true,
      };
    const lines = await describeValues(caller, input.entity, input.values);
    const summary = `Créer ${def.feminine ? "une" : "un"} ${def.label.toLowerCase()}\n${lines.join("\n")}`;
    const actionId = await propose("propose_create_record", input, summary);
    return {
      content: json({ status: "awaiting_confirmation", actionId, summary }),
      part: { type: "action", actionId, summary },
    };
  },

  async propose_update_record(raw, { caller, workspace, propose }) {
    const input = updateRecordInput.parse(raw);
    const def = ENTITIES[input.entity];
    if (!allowed(workspace, input.entity, "update"))
      return {
        content: json({
          error: "Le rôle de la personne ne permet pas de modifier ce type de fiche.",
        }),
        isError: true,
      };
    const { row, canEdit } = await caller.records.get({ entity: input.entity, id: input.id });
    if (!canEdit)
      return {
        content: json({ error: "Cette fiche est hors du périmètre modifiable de la personne." }),
        isError: true,
      };
    const parsed = parseRecordInput(def.fields, input.values, "update");
    if (!parsed.success)
      return {
        content: json({ error: "Valeurs invalides", details: parsed.errors }),
        isError: true,
      };
    const lines = await describeValues(caller, input.entity, input.values);
    const summary = `Modifier ${def.label.toLowerCase()} « ${row.title} »\n${lines.join("\n")}`;
    const actionId = await propose("propose_update_record", input, summary);
    return {
      content: json({ status: "awaiting_confirmation", actionId, summary }),
      part: { type: "action", actionId, summary },
    };
  },

  async propose_create_quote(raw, { caller, workspace, propose }) {
    const input = quoteInput.parse(raw);
    if (!allowed(workspace, "quote", "create"))
      return {
        content: json({ error: "Le rôle de la personne ne permet pas de créer des devis." }),
        isError: true,
      };
    const company = await caller.records.get({ entity: "company", id: input.companyId });
    const lines = input.lines.map((l) => ({
      quantity: l.quantity,
      unitPriceCents: Math.round(l.unitPrice * 100),
      discountPercent: l.discountPercent,
      vatRate: l.vatRate,
    }));
    const totals = computeTotals(lines);
    const summary = [
      `Créer un devis brouillon pour ${company.row.title} — ${input.subject}`,
      ...input.lines.map(
        (l, i) =>
          `• ${l.description} : ${l.quantity} × ${euros(lines[i]!.unitPriceCents)} HT${l.discountPercent ? ` (−${l.discountPercent} %)` : ""} = ${euros(lineTotalCents(lines[i]!))}`,
      ),
      `Total : ${euros(totals.totalExclCents)} HT, ${euros(totals.totalCents)} TTC`,
    ].join("\n");
    const actionId = await propose("propose_create_quote", input, summary);
    return {
      content: json({ status: "awaiting_confirmation", actionId, summary }),
      part: { type: "action", actionId, summary },
    };
  },

  async propose_invoice_reminders(raw, { caller, workspace, propose }) {
    const input = remindersInput.parse(raw);
    if (!allowed(workspace, "invoice", "update"))
      return {
        content: json({ error: "Le rôle de la personne ne permet pas de relancer les factures." }),
        isError: true,
      };
    const ready: { id: string; to: string }[] = [];
    const lines: string[] = [];
    const skipped: string[] = [];
    for (const id of [...new Set(input.invoiceIds)]) {
      try {
        const { doc } = await caller.sales.document({ id });
        const to = doc.contact?.email ?? doc.company?.email ?? null;
        if (doc.kind !== "INVOICE" || !["sent", "partial", "overdue"].includes(doc.status)) {
          skipped.push(`${doc.number ?? id} : pas une facture impayée`);
        } else if (!to) {
          skipped.push(`${doc.number} : aucun email client`);
        } else {
          ready.push({ id, to });
          lines.push(
            `• ${doc.number} — ${doc.company?.name ?? "Client"} — reste dû ${euros(doc.dueCents)} → ${to}`,
          );
        }
      } catch {
        skipped.push(`${id} : introuvable ou inaccessible`);
      }
    }
    if (ready.length === 0)
      return { content: json({ error: "Aucune facture à relancer", skipped }), isError: true };
    const summary = [
      `Envoyer ${ready.length} relance${ready.length > 1 ? "s" : ""} par email`,
      ...lines,
    ].join("\n");
    const actionId = await propose(
      "propose_invoice_reminders",
      { invoices: ready, message: input.message },
      summary,
    );
    return {
      content: json({ status: "awaiting_confirmation", actionId, summary, skipped }),
      part: { type: "action", actionId, summary },
    };
  },

  async propose_send_document(raw, { caller, propose }) {
    const input = sendInput.parse(raw);
    const { doc, entity, canEdit } = await caller.sales.document({ id: input.id });
    if (!canEdit)
      return {
        content: json({ error: "La personne ne peut pas envoyer ce document." }),
        isError: true,
      };
    const to = input.to ?? doc.contact?.email ?? doc.company?.email;
    if (!to)
      return {
        content: json({ error: "Aucun email connu : précisez le destinataire." }),
        isError: true,
      };
    const label = ENTITIES[entity].label.toLowerCase();
    const summary = `Envoyer ${label} ${doc.number ?? "(brouillon, émis à l'envoi)"} à ${to}${input.message ? " avec un message personnalisé" : ""}`;
    const actionId = await propose(
      "propose_send_document",
      { id: input.id, to, message: input.message },
      summary,
    );
    return {
      content: json({ status: "awaiting_confirmation", actionId, summary }),
      part: { type: "action", actionId, summary },
    };
  },
};

/** Exécute un outil ; toute erreur devient un résultat d'erreur lisible par le modèle. */
export async function runTool(
  name: string,
  input: unknown,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  const tool = TOOLS[name];
  if (!tool) return { content: json({ error: `Outil inconnu : ${name}` }), isError: true };
  try {
    return await tool(input ?? {}, ctx);
  } catch (error) {
    if (error instanceof z.ZodError)
      return {
        content: json({ error: "Paramètres invalides", details: error.issues.slice(0, 5) }),
        isError: true,
      };
    if (error instanceof TRPCError)
      return { content: json({ error: error.message }), isError: true };
    throw error;
  }
}

// ─────────────────────────── Actions confirmées ───────────────────────────

/** Exécute une action confirmée avec les droits de la personne ; renvoie un compte rendu. */
export async function executeAction(
  caller: Caller,
  tool: string,
  input: unknown,
): Promise<{ message: string; url?: string }> {
  switch (tool) {
    case "propose_create_record": {
      const i = createRecordInput.parse(input);
      const created = await caller.records.create({ entity: i.entity, values: i.values });
      return {
        message: `${ENTITIES[i.entity].label} « ${created.title} » créé(e).`,
        url: recordPath(i.entity, created.id),
      };
    }
    case "propose_update_record": {
      const i = updateRecordInput.parse(input);
      const updated = await caller.records.update({ entity: i.entity, id: i.id, values: i.values });
      return { message: `« ${updated.title} » modifié(e).`, url: recordPath(i.entity, i.id) };
    }
    case "propose_create_quote": {
      const i = quoteInput.parse(input);
      const quote = await caller.records.create({
        entity: "quote",
        values: { companyId: i.companyId, contactId: i.contactId, subject: i.subject },
      });
      await caller.sales.saveLines({
        id: quote.id,
        lines: i.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPriceCents: Math.round(l.unitPrice * 100),
          discountPercent: l.discountPercent,
          vatRate: l.vatRate,
          unit: l.unit ?? null,
          productId: l.productId ?? null,
        })),
      });
      return {
        message: "Devis brouillon créé : vérifiez-le puis envoyez-le.",
        url: recordPath("quote", quote.id),
      };
    }
    case "propose_invoice_reminders": {
      const i = z
        .object({
          invoices: z.array(z.object({ id: z.string(), to: z.email() })),
          message: z.string().optional(),
        })
        .parse(input);
      const failures: string[] = [];
      for (const inv of i.invoices) {
        try {
          await caller.sales.send({ id: inv.id, to: inv.to, message: i.message, reminder: true });
        } catch (error) {
          failures.push(`${inv.to} : ${error instanceof Error ? error.message : "échec"}`);
        }
      }
      const sent = i.invoices.length - failures.length;
      return {
        message:
          `${sent} relance${sent > 1 ? "s" : ""} envoyée${sent > 1 ? "s" : ""}.` +
          (failures.length ? ` Échecs : ${failures.join(" ; ")}` : ""),
      };
    }
    case "propose_send_document": {
      const i = z
        .object({ id: z.string(), to: z.email(), message: z.string().optional() })
        .parse(input);
      await caller.sales.send({ id: i.id, to: i.to, message: i.message });
      return { message: `Document envoyé à ${i.to}.` };
    }
    default:
      throw new Error(`Action inconnue : ${tool}`);
  }
}
