import { z } from "zod";

import { ENTITY_KEYS, type EntityKey } from "./records/fields";
import { type FilterGroup, filterGroupSchema } from "./records/filters";

/** Évènements déclencheurs d'une automatisation ou d'un webhook. */
export const AUTOMATION_TRIGGERS = ["created", "updated", "deleted"] as const;
export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];
export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  created: "Création",
  updated: "Modification",
  deleted: "Mise en corbeille",
};

/** Profondeur maximale d'enchaînement (une automatisation qui modifie une fiche…). */
export const AUTOMATION_MAX_DEPTH = 2;

export const automationActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("notify"),
    /** « owner » : le responsable de la fiche ; sinon des identifiants de membres. */
    to: z.union([z.literal("owner"), z.array(z.string().min(1)).min(1).max(20)]),
    message: z.string().trim().min(1).max(300),
  }),
  z.object({
    type: z.literal("set_field"),
    field: z.string().min(1).max(80),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal("send_email"),
    to: z.email({ error: "Adresse email invalide." }),
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(5000),
  }),
  z.object({
    type: z.literal("create_task"),
    title: z.string().trim().min(1).max(200),
    dueInDays: z.number().int().min(0).max(365),
  }),
]);
export type AutomationAction = z.infer<typeof automationActionSchema>;

export const AUTOMATION_ACTION_LABELS: Record<AutomationAction["type"], string> = {
  notify: "Notifier",
  set_field: "Modifier un champ",
  send_email: "Envoyer un email",
  create_task: "Créer une tâche",
};

export const automationSchema = z.object({
  name: z.string().trim().min(1, "Donnez un nom.").max(120),
  entity: z.enum(ENTITY_KEYS),
  trigger: z.enum(AUTOMATION_TRIGGERS),
  conditions: filterGroupSchema,
  actions: z.array(automationActionSchema).min(1, "Ajoutez au moins une action.").max(10),
  active: z.boolean(),
});
export type AutomationInput = z.infer<typeof automationSchema>;

/** Remplace {{titre}}, {{lien}} et {{champ}} par les valeurs de la fiche. */
export function renderTemplate(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const value = values[key];
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.toLocaleDateString("fr-FR");
    return String(value);
  });
}

/** Nom d'évènement public (webhooks, API) : « invoice.created ». */
export function eventName(entity: EntityKey, trigger: AutomationTrigger): string {
  return `${entity}.${trigger}`;
}

export const WEBHOOK_EVENTS: string[] = ENTITY_KEYS.flatMap((e) =>
  AUTOMATION_TRIGGERS.map((t) => eventName(e, t)),
);

export const webhookSchema = z.object({
  url: z
    .url({ error: "Adresse invalide." })
    .refine(
      (u) =>
        u.startsWith("https://") ||
        u.startsWith("http://localhost") ||
        u.startsWith("http://127.0.0.1"),
      "L'adresse doit être en HTTPS.",
    ),
  events: z.array(z.string()).min(1, "Choisissez au moins un évènement.").max(200),
  active: z.boolean(),
});

export const API_SCOPES = ["read", "write"] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export const EMPTY_CONDITIONS: FilterGroup = { combinator: "and", rules: [] };
