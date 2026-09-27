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
}

export const ENTITY_KEYS = ["company", "contact"] as const;
export type EntityKey = (typeof ENTITY_KEYS)[number];

export interface EntityDef {
  key: EntityKey;
  module: ModuleKey;
  /** Segment d'URL sous le module : /crm/entreprises */
  slug: string;
  label: string;
  labelPlural: string;
  /** Genre grammatical, pour « Nouvelle entreprise » / « Nouveau contact ». */
  feminine: boolean;
  fields: FieldDef[];
  /** Champs parcourus par la recherche globale. */
  searchFields: string[];
  defaultSort: { field: string; direction: "asc" | "desc" };
}

/** Préfixe des clés de champs personnalisés dans les filtres, tris et colonnes. */
export const CUSTOM_PREFIX = "cf.";

export function isCustomKey(key: string): boolean {
  return key.startsWith(CUSTOM_PREFIX);
}

const SYSTEM_FIELDS: FieldDef[] = [
  {
    key: "createdAt",
    label: "Créé le",
    type: "datetime",
    sortable: true,
    filterable: true,
    width: 150,
  },
  {
    key: "updatedAt",
    label: "Modifié le",
    type: "datetime",
    sortable: true,
    filterable: true,
    width: 150,
  },
];

export const COMPANY_TYPES: FieldOption[] = [
  { value: "prospect", label: "Prospect", tone: "info" },
  { value: "customer", label: "Client", tone: "success" },
  { value: "partner", label: "Partenaire", tone: "primary" },
  { value: "supplier", label: "Fournisseur", tone: "neutral" },
  { value: "former", label: "Ancien client", tone: "warning" },
];

export const CONTACT_STATUSES: FieldOption[] = [
  { value: "lead", label: "Piste", tone: "neutral" },
  { value: "prospect", label: "Prospect", tone: "info" },
  { value: "customer", label: "Client", tone: "success" },
  { value: "inactive", label: "Inactif", tone: "warning" },
];

export const CONTACT_SOURCES: FieldOption[] = [
  { value: "website", label: "Site web" },
  { value: "referral", label: "Recommandation" },
  { value: "event", label: "Salon / événement" },
  { value: "outbound", label: "Prospection" },
  { value: "partner", label: "Partenaire" },
  { value: "other", label: "Autre" },
];

export const ENTITIES: Record<EntityKey, EntityDef> = {
  company: {
    key: "company",
    module: "crm",
    slug: "entreprises",
    label: "Entreprise",
    labelPlural: "Entreprises",
    feminine: true,
    searchFields: ["name", "email", "city", "siren", "website"],
    defaultSort: { field: "name", direction: "asc" },
    fields: [
      {
        key: "name",
        label: "Nom",
        type: "text",
        required: true,
        editable: true,
        sortable: true,
        filterable: true,
        defaultVisible: true,
        width: 240,
        maxLength: 160,
      },
      {
        key: "type",
        label: "Type",
        type: "select",
        options: COMPANY_TYPES,
        editable: true,
        sortable: true,
        filterable: true,
        groupable: true,
        defaultVisible: true,
        width: 140,
      },
      {
        key: "email",
        label: "Email",
        type: "email",
        editable: true,
        sortable: true,
        filterable: true,
        defaultVisible: true,
        width: 220,
        maxLength: 200,
      },
      {
        key: "phone",
        label: "Téléphone",
        type: "phone",
        editable: true,
        filterable: true,
        defaultVisible: true,
        width: 150,
        maxLength: 40,
      },
      {
        key: "website",
        label: "Site web",
        type: "url",
        editable: true,
        filterable: true,
        width: 200,
        maxLength: 200,
      },
      {
        key: "city",
        label: "Ville",
        type: "text",
        editable: true,
        sortable: true,
        filterable: true,
        groupable: true,
        defaultVisible: true,
        width: 150,
        maxLength: 120,
      },
      {
        key: "country",
        label: "Pays",
        type: "text",
        editable: true,
        sortable: true,
        filterable: true,
        groupable: true,
        width: 120,
        maxLength: 80,
      },
      {
        key: "siren",
        label: "SIREN",
        type: "text",
        editable: true,
        filterable: true,
        width: 120,
        maxLength: 14,
      },
      {
        key: "annualRevenue",
        label: "CA annuel",
        type: "currency",
        editable: true,
        sortable: true,
        filterable: true,
        aggregate: "sum",
        width: 140,
      },
      {
        key: "employees",
        label: "Effectif",
        type: "number",
        editable: true,
        sortable: true,
        filterable: true,
        aggregate: "sum",
        width: 110,
      },
      {
        key: "ownerId",
        label: "Responsable",
        type: "user",
        editable: true,
        sortable: true,
        filterable: true,
        groupable: true,
        defaultVisible: true,
        width: 170,
      },
      {
        key: "tags",
        label: "Étiquettes",
        type: "tags",
        editable: true,
        filterable: true,
        width: 180,
      },
      ...SYSTEM_FIELDS,
    ],
  },
  contact: {
    key: "contact",
    module: "crm",
    slug: "contacts",
    label: "Contact",
    labelPlural: "Contacts",
    feminine: false,
    searchFields: ["firstName", "lastName", "email", "phone", "jobTitle"],
    defaultSort: { field: "lastName", direction: "asc" },
    fields: [
      {
        key: "firstName",
        label: "Prénom",
        type: "text",
        editable: true,
        sortable: true,
        filterable: true,
        defaultVisible: true,
        width: 140,
        maxLength: 80,
      },
      {
        key: "lastName",
        label: "Nom",
        type: "text",
        required: true,
        editable: true,
        sortable: true,
        filterable: true,
        defaultVisible: true,
        width: 160,
        maxLength: 80,
      },
      {
        key: "companyId",
        label: "Entreprise",
        type: "relation",
        relation: "company",
        editable: true,
        sortable: true,
        filterable: true,
        groupable: true,
        defaultVisible: true,
        width: 200,
      },
      {
        key: "jobTitle",
        label: "Fonction",
        type: "text",
        editable: true,
        sortable: true,
        filterable: true,
        defaultVisible: true,
        width: 170,
        maxLength: 120,
      },
      {
        key: "email",
        label: "Email",
        type: "email",
        editable: true,
        sortable: true,
        filterable: true,
        defaultVisible: true,
        width: 220,
        maxLength: 200,
      },
      {
        key: "phone",
        label: "Téléphone",
        type: "phone",
        editable: true,
        filterable: true,
        width: 150,
        maxLength: 40,
      },
      {
        key: "status",
        label: "Statut",
        type: "select",
        options: CONTACT_STATUSES,
        editable: true,
        sortable: true,
        filterable: true,
        groupable: true,
        defaultVisible: true,
        width: 130,
      },
      {
        key: "score",
        label: "Score",
        type: "number",
        editable: true,
        sortable: true,
        filterable: true,
        aggregate: "avg",
        defaultVisible: true,
        width: 100,
      },
      {
        key: "source",
        label: "Origine",
        type: "select",
        options: CONTACT_SOURCES,
        editable: true,
        sortable: true,
        filterable: true,
        groupable: true,
        width: 150,
      },
      {
        key: "ownerId",
        label: "Responsable",
        type: "user",
        editable: true,
        sortable: true,
        filterable: true,
        groupable: true,
        width: 170,
      },
      {
        key: "tags",
        label: "Étiquettes",
        type: "tags",
        editable: true,
        filterable: true,
        width: 180,
      },
      ...SYSTEM_FIELDS,
    ],
  },
};

export function entityBySlug(module: ModuleKey, slug: string): EntityDef | undefined {
  return Object.values(ENTITIES).find((e) => e.module === module && e.slug === slug);
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

/** Tous les champs d'une entité : standards puis personnalisés. */
export function entityFields(entity: EntityDef, custom: CustomFieldRecord[] = []): FieldDef[] {
  return [...entity.fields, ...custom.map(customFieldToDef)];
}

/** Libellé affichable d'un enregistrement. */
export function recordTitle(entity: EntityKey, record: Record<string, unknown>): string {
  if (entity === "contact") {
    return [record.firstName, record.lastName].filter(Boolean).join(" ") || "Sans nom";
  }
  return String(record.name ?? "Sans nom");
}
