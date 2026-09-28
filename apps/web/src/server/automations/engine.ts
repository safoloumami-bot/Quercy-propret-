import "server-only";

import {
  AUTOMATION_MAX_DEPTH,
  type AutomationAction,
  type AutomationTrigger,
  ENTITIES,
  type EntityKey,
  type FilterGroup,
  automationActionSchema,
  buildWhere,
  entityFields,
  parseRecordInput,
  recordPath,
  recordTitle,
  renderTemplate,
} from "@quercy/core";
import { prisma } from "@quercy/db";
import { sendMail } from "@quercy/mailer";

import { env } from "../env";
import { notify } from "../notify";
import { type RecordsCtx, delegate } from "../records/context";
import { applyBusinessRules } from "../records/hooks";

type Row = Record<string, unknown> & { id: string };

/**
 * Exécute les automatisations actives de l'espace pour des fiches qui viennent de changer.
 * Les conditions réutilisent le moteur de filtres (même sens que dans les listes).
 * Renvoie les fiches modifiées par une action « Modifier un champ » (pour l'enchaînement).
 */
export async function runAutomations(
  ctx: RecordsCtx,
  entity: EntityKey,
  rows: Row[],
  trigger: AutomationTrigger,
  depth: number,
  onChanged: (entity: EntityKey, ids: string[], depth: number) => Promise<void>,
): Promise<void> {
  if (depth > AUTOMATION_MAX_DEPTH || rows.length === 0) return;
  const automations = await prisma.automation.findMany({
    where: { organizationId: ctx.organizationId, entity, trigger, active: true },
  });
  if (automations.length === 0) return;
  const custom = await prisma.customFieldDefinition.findMany({
    where: { organizationId: ctx.organizationId, entityType: entity, deletedAt: null },
    select: { key: true, label: true, type: true, options: true },
  });
  const fields = entityFields(ENTITIES[entity], custom);

  for (const automation of automations) {
    const conditions = automation.conditions as unknown as FilterGroup;
    let matching = rows;
    if (conditions?.rules?.length) {
      const where = buildWhere(fields, conditions);
      const ids = await delegate(ctx, entity).findMany({
        where: { id: { in: rows.map((r) => r.id) }, deletedAt: undefined, ...where },
        select: { id: true },
      });
      const ok = new Set((ids as { id: string }[]).map((r) => r.id));
      matching = rows.filter((r) => ok.has(r.id));
    }
    if (matching.length === 0) continue;
    let error: string | null = null;
    for (const row of matching) {
      for (const raw of automation.actions as unknown[]) {
        const parsed = automationActionSchema.safeParse(raw);
        if (!parsed.success) continue;
        try {
          await runAction(ctx, entity, row, parsed.data, depth, onChanged);
        } catch (e) {
          error = e instanceof Error ? e.message : "Erreur inconnue";
        }
      }
    }
    await prisma.automation.update({
      where: { id: automation.id },
      data: { runCount: { increment: matching.length }, lastRunAt: new Date(), lastError: error },
    });
  }
}

async function runAction(
  ctx: RecordsCtx,
  entity: EntityKey,
  row: Row,
  action: AutomationAction,
  depth: number,
  onChanged: (entity: EntityKey, ids: string[], depth: number) => Promise<void>,
) {
  const title = recordTitle(entity, row);
  const url = recordPath(entity, row.id);
  const values = { ...row, titre: title, lien: `${env().APP_URL}${url}` };
  switch (action.type) {
    case "notify": {
      const owner = typeof row.ownerId === "string" ? row.ownerId : null;
      const userIds = action.to === "owner" ? (owner ? [owner] : []) : action.to;
      await notify({
        organizationId: ctx.organizationId,
        userIds,
        actorId: "automation",
        type: "automation",
        title: renderTemplate(action.message, values),
        url,
      });
      return;
    }
    case "set_field": {
      const fields = ENTITIES[entity].fields;
      const parsed = parseRecordInput(fields, { [action.field]: action.value }, "update");
      if (!parsed.success) throw new Error(Object.values(parsed.errors).join(" "));
      const data = applyBusinessRules(entity, parsed.value.data, row);
      await delegate(ctx, entity).update({ where: { id: row.id }, data: data as never });
      await onChanged(entity, [row.id], depth + 1);
      return;
    }
    case "send_email": {
      const text = renderTemplate(action.body, values);
      await sendMail({
        to: action.to,
        subject: renderTemplate(action.subject, values),
        text,
        html: text
          .split("\n")
          .map(
            (l) =>
              `<p>${l.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!)}</p>`,
          )
          .join(""),
      });
      return;
    }
    case "create_task": {
      if (!ctx.workspace.organization.modules.includes("projects")) return;
      const due = new Date();
      due.setDate(due.getDate() + action.dueInDays);
      const task = await ctx.db.task.create({
        data: {
          organizationId: ctx.organizationId,
          title: renderTemplate(action.title, values),
          dueDate: due,
          ownerId: typeof row.ownerId === "string" ? row.ownerId : ctx.user.id,
          description: `Créée par une automatisation depuis ${url}`,
        },
      });
      await onChanged("task", [task.id], depth + 1);
      return;
    }
  }
}
