import type { ModuleKey } from "../modules";

/** Types de champ gérés par le moteur (standards et personnalisés). */
export const FIELD_TYPES = [
  "text",
  "longtext",
  "email",
  "phone",
  "url",
  "number",
  "currency",
  "percent",
  "date",
  "datetime",
  "boolean",
  "select",
  "multiselect",
  "tags",
  "user",
  "relation",
  "duration",
  "image",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export interface FieldOption {
  value: string;
  label: string;
  /** Jeton de couleur du badge (neutral, primary, success, warning, danger, info). */
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  /** Colonne Prisma (par défaut : `key`). Les champs personnalisés vivent dans `customFields`. */
  column?: string;
  required?: boolean;
  /** Modifiable dans les formulaires et en cellule. */
  editable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  groupable?: boolean;
  /** Agrégat affiché en sous-total quand on regroupe. */
  aggregate?: "sum" | "avg";
  options?: FieldOption[];
  /** Entité cible d'un champ `relation`. */
  relation?: EntityKey;
  /** Visible par défaut dans le tableau. */
  defaultVisible?: boolean;
  width?: number;
  /** Champ personnalisé défini par l'espace. */
  custom?: boolean;
  /** Longueur maximale (texte). */
  maxLength?: number;
  /** Montant stocké en centimes (entier) mais saisi et affiché en euros. */
  cents?: boolean;
  /** Valeur appliquée à la création quand le champ n'est pas saisi (« today » : date du jour). */
  defaultValue?: string | number | boolean;
  /** Colonne entière (arrondi à la saisie). */
  integer?: boolean;
  /** Colonne jamais nulle (tri sans option `nulls`). */
  notNull?: boolean;
  /** Nom de la relation Prisma d'un champ `user`/`relation` (par défaut : clé sans « Id »). */
  relationName?: string;
}

export const ENTITY_KEYS = [
  "company",
  "contact",
  "deal",
  "activity",
  "product",
  "quote",
  "order",
  "invoice",
  "creditNote",
  "recurringInvoice",
  "project",
  "task",
  "timeEntry",
  "supplier",
  "purchaseOrder",
  "bill",
  "expense",
  "warehouse",
  "stockMovement",
  "event",
  "ticket",
  "employee",
  "leave",
  "bankAccount",
  "bankTransaction",
  "document",
  "site",
  "cleaningContract",
  "intervention",
  "inspection",
  "equipment",
  "vehicle",
  "rental",
] as const;
export type EntityKey = (typeof ENTITY_KEYS)[number];

/** Délégués Prisma utilisés par le moteur. */
export type EntityModel =
  | "company"
  | "contact"
  | "deal"
  | "activity"
  | "product"
  | "salesDocument"
  | "project"
  | "task"
  | "timeEntry"
  | "supplier"
  | "purchaseOrder"
  | "bill"
  | "expense"
  | "warehouse"
  | "stockMovement"
  | "event"
  | "ticket"
  | "employee"
  | "leave"
  | "bankAccount"
  | "bankTransaction"
  | "document"
  | "site"
  | "cleaningContract"
  | "intervention"
  | "inspection"
  | "equipment"
  | "vehicle"
  | "rental";

/** Affichages possibles d'une liste, en plus du tableau. */
export interface EntityLayouts {
  /** Kanban : colonnes = valeurs d'un champ liste ; somme éventuelle d'un montant. */
  board?: { field: string; sum?: string };
  /** Calendrier mensuel sur un champ date. */
  calendar?: { start: string; end?: string };
  /** Diagramme de Gantt (début → fin). */
  gantt?: { start: string; end: string };
}

/** Liste liée affichée en onglet sur une fiche (ex. contacts d'une entreprise). */
export interface RelatedList {
  entity: EntityKey;
  /** Champ de l'entité liée qui pointe vers la fiche. */
  field: string;
  label: string;
}

export interface EntityDef {
  key: EntityKey;
  module: ModuleKey;
  model: EntityModel;
  /** Segment d'URL sous le module : /crm/entreprises */
  slug: string;
  label: string;
  labelPlural: string;
  /** Genre grammatical, pour « Nouvelle entreprise » / « Nouveau contact ». */
  feminine: boolean;
  fields: FieldDef[];
  /** Champs composant le libellé d'un enregistrement. */
  titleFields: string[];
  /** Libellé quand les champs de titre sont vides. */
  emptyTitle: string;
  /** Champs affichés sous le titre (recherche, listes de choix). */
  subtitleFields: string[];
  /** Champs parcourus par la recherche. */
  searchFields: string[];
  defaultSort: { field: string; direction: "asc" | "desc" };
  /** Restriction permanente (plusieurs entités partagent une table). */
  baseWhere?: Record<string, unknown>;
  /** Valeurs forcées à la création. */
  createDefaults?: Record<string, unknown>;
  layouts?: EntityLayouts;
  related?: RelatedList[];
  /** La fiche utilise un écran dédié (documents commerciaux). */
  customPage?: "document";
}

/** Préfixe des clés de champs personnalisés dans les filtres, tris et colonnes. */
export const CUSTOM_PREFIX = "cf.";

export function isCustomKey(key: string): boolean {
  return key.startsWith(CUSTOM_PREFIX);
}

/** Définition d'un champ personnalisé stocké en base, convertie en FieldDef. */
export interface CustomFieldRecord {
  key: string;
  label: string;
  type: string;
  options: unknown;
}

const CUSTOM_TYPE_MAP: Record<string, FieldType> = {
  TEXT: "text",
  NUMBER: "number",
  DATE: "date",
  SELECT: "select",
  CHECKBOX: "boolean",
  FILE: "text",
  RELATION: "relation",
};

export function customFieldToDef(record: CustomFieldRecord): FieldDef {
  const opts = (record.options ?? {}) as {
    choices?: string[];
    relation?: EntityKey;
    required?: boolean;
  };
  return {
    key: `${CUSTOM_PREFIX}${record.key}`,
    label: record.label,
    type: CUSTOM_TYPE_MAP[record.type] ?? "text",
    custom: true,
    editable: true,
    // Le tri SQL sur une valeur JSON n'est pas indexable : les colonnes personnalisées ne se trient pas.
    sortable: false,
    filterable: true,
    groupable: record.type === "SELECT" || record.type === "CHECKBOX",
    required: opts.required ?? false,
    options: opts.choices?.map((c) => ({ value: c, label: c })),
    relation: opts.relation,
    width: 160,
  };
}
