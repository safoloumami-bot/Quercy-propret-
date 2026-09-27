import { MODULES, type ModuleKey } from "../modules";
import {
  type CustomFieldRecord,
  type EntityDef,
  type EntityKey,
  type FieldDef,
  type FieldOption,
  customFieldToDef,
} from "./fields";

// ─────────────────────────── Champs communs ───────────────────────────

const SYSTEM_FIELDS: FieldDef[] = [
  {
    key: "createdAt",
    label: "Créé le",
    type: "datetime",
    sortable: true,
    filterable: true,
    notNull: true,
    width: 150,
  },
  {
    key: "updatedAt",
    label: "Modifié le",
    type: "datetime",
    sortable: true,
    filterable: true,
    notNull: true,
    width: 150,
  },
];

function owner(label = "Responsable", defaultVisible = false): FieldDef {
  return {
    key: "ownerId",
    label,
    type: "user",
    editable: true,
    sortable: true,
    filterable: true,
    groupable: true,
    defaultVisible,
    width: 170,
  };
}

const TAGS: FieldDef = {
  key: "tags",
  label: "Étiquettes",
  type: "tags",
  editable: true,
  filterable: true,
  width: 180,
};

function relation(
  key: string,
  label: string,
  target: EntityKey,
  extra: Partial<FieldDef> = {},
): FieldDef {
  return {
    key,
    label,
    type: "relation",
    relation: target,
    editable: true,
    sortable: true,
    filterable: true,
    groupable: true,
    width: 200,
    ...extra,
  };
}

function text(key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef {
  return {
    key,
    label,
    type: "text",
    editable: true,
    sortable: true,
    filterable: true,
    width: 180,
    maxLength: 200,
    ...extra,
  };
}

function choice(
  key: string,
  label: string,
  options: FieldOption[],
  extra: Partial<FieldDef> = {},
): FieldDef {
  return {
    key,
    label,
    type: "select",
    options,
    editable: true,
    sortable: true,
    filterable: true,
    groupable: true,
    width: 140,
    ...extra,
  };
}

function date(key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef {
  return {
    key,
    label,
    type: "date",
    editable: true,
    sortable: true,
    filterable: true,
    width: 130,
    ...extra,
  };
}

function longtext(key: string, label: string): FieldDef {
  return {
    key,
    label,
    type: "longtext",
    editable: true,
    filterable: true,
    width: 260,
    maxLength: 10_000,
  };
}

// ─────────────────────────── Listes de valeurs ───────────────────────────

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

export const DEAL_STAGES: (FieldOption & { probability: number })[] = [
  { value: "lead", label: "Nouvelle", tone: "neutral", probability: 10 },
  { value: "qualified", label: "Qualifiée", tone: "info", probability: 25 },
  { value: "proposal", label: "Proposition", tone: "primary", probability: 50 },
  { value: "negotiation", label: "Négociation", tone: "warning", probability: 75 },
  { value: "won", label: "Gagnée", tone: "success", probability: 100 },
  { value: "lost", label: "Perdue", tone: "danger", probability: 0 },
];

/** Probabilité par défaut associée à une étape du pipeline. */
export function stageProbability(stage: string): number | null {
  return DEAL_STAGES.find((s) => s.value === stage)?.probability ?? null;
}

export const ACTIVITY_TYPES: FieldOption[] = [
  { value: "call", label: "Appel", tone: "info" },
  { value: "email", label: "Email", tone: "neutral" },
  { value: "meeting", label: "Rendez-vous", tone: "primary" },
  { value: "task", label: "À faire", tone: "warning" },
  { value: "note", label: "Note", tone: "neutral" },
];

export const PRODUCT_TYPES: FieldOption[] = [
  { value: "service", label: "Prestation", tone: "primary" },
  { value: "good", label: "Produit", tone: "info" },
];

export const PRODUCT_UNITS: FieldOption[] = [
  { value: "unit", label: "unité" },
  { value: "hour", label: "heure" },
  { value: "day", label: "jour" },
  { value: "flat", label: "forfait" },
  { value: "month", label: "mois" },
  { value: "sqm", label: "m²" },
  { value: "kg", label: "kg" },
];

export const VAT_RATES: FieldOption[] = [
  { value: "20", label: "20 %" },
  { value: "10", label: "10 %" },
  { value: "5.5", label: "5,5 %" },
  { value: "2.1", label: "2,1 %" },
  { value: "0", label: "0 %" },
];

export const QUOTE_STATUSES: FieldOption[] = [
  { value: "draft", label: "Brouillon", tone: "neutral" },
  { value: "sent", label: "Envoyé", tone: "info" },
  { value: "accepted", label: "Accepté", tone: "success" },
  { value: "declined", label: "Refusé", tone: "danger" },
  { value: "expired", label: "Expiré", tone: "warning" },
  { value: "invoiced", label: "Facturé", tone: "primary" },
];

export const ORDER_STATUSES: FieldOption[] = [
  { value: "draft", label: "Brouillon", tone: "neutral" },
  { value: "confirmed", label: "Confirmée", tone: "info" },
  { value: "delivered", label: "Livrée", tone: "success" },
  { value: "invoiced", label: "Facturée", tone: "primary" },
  { value: "cancelled", label: "Annulée", tone: "danger" },
];

export const INVOICE_STATUSES: FieldOption[] = [
  { value: "draft", label: "Brouillon", tone: "neutral" },
  { value: "sent", label: "Émise", tone: "info" },
  { value: "partial", label: "Partiellement payée", tone: "warning" },
  { value: "overdue", label: "En retard", tone: "danger" },
  { value: "paid", label: "Payée", tone: "success" },
  { value: "credited", label: "Annulée par avoir", tone: "neutral" },
];

export const CREDIT_NOTE_STATUSES: FieldOption[] = [
  { value: "draft", label: "Brouillon", tone: "neutral" },
  { value: "issued", label: "Émis", tone: "info" },
  { value: "refunded", label: "Remboursé", tone: "success" },
];

export const RECURRING_STATUSES: FieldOption[] = [
  { value: "active", label: "Active", tone: "success" },
  { value: "paused", label: "En pause", tone: "warning" },
  { value: "ended", label: "Terminée", tone: "neutral" },
];

export const RECURRING_INTERVALS: FieldOption[] = [
  { value: "monthly", label: "Tous les mois" },
  { value: "quarterly", label: "Tous les trimestres" },
  { value: "yearly", label: "Tous les ans" },
];

export const PROJECT_STATUSES: FieldOption[] = [
  { value: "planned", label: "Planifié", tone: "neutral" },
  { value: "active", label: "En cours", tone: "info" },
  { value: "on_hold", label: "En pause", tone: "warning" },
  { value: "done", label: "Terminé", tone: "success" },
  { value: "cancelled", label: "Annulé", tone: "danger" },
];

export const TASK_STATUSES: FieldOption[] = [
  { value: "todo", label: "À faire", tone: "neutral" },
  { value: "in_progress", label: "En cours", tone: "info" },
  { value: "review", label: "En revue", tone: "warning" },
  { value: "done", label: "Terminée", tone: "success" },
];

export const TASK_PRIORITIES: FieldOption[] = [
  { value: "low", label: "Basse", tone: "neutral" },
  { value: "normal", label: "Normale", tone: "info" },
  { value: "high", label: "Haute", tone: "warning" },
  { value: "urgent", label: "Urgente", tone: "danger" },
];

// ─────────────────────────── Documents commerciaux ───────────────────────────

export const DOCUMENT_KINDS = ["QUOTE", "ORDER", "INVOICE", "CREDIT_NOTE", "RECURRING"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** Entité du moteur correspondant à chaque type de document. */
export const DOCUMENT_ENTITY: Record<DocumentKind, EntityKey> = {
  QUOTE: "quote",
  ORDER: "order",
  INVOICE: "invoice",
  CREDIT_NOTE: "creditNote",
  RECURRING: "recurringInvoice",
};

export function isDocumentEntity(entity: EntityKey): boolean {
  return Object.values(DOCUMENT_ENTITY).includes(entity);
}

function money(key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef {
  return {
    key,
    label,
    type: "currency",
    cents: true,
    notNull: true,
    sortable: true,
    filterable: true,
    aggregate: "sum",
    width: 130,
    ...extra,
  };
}

function documentFields(kind: DocumentKind): FieldDef[] {
  const statuses: Record<DocumentKind, FieldOption[]> = {
    QUOTE: QUOTE_STATUSES,
    ORDER: ORDER_STATUSES,
    INVOICE: INVOICE_STATUSES,
    CREDIT_NOTE: CREDIT_NOTE_STATUSES,
    RECURRING: RECURRING_STATUSES,
  };
  const dueLabel: Record<DocumentKind, string> = {
    QUOTE: "Valable jusqu'au",
    ORDER: "Livraison prévue",
    INVOICE: "Échéance",
    CREDIT_NOTE: "Date limite",
    RECURRING: "Échéance",
  };
  const fields: FieldDef[] = [];
  if (kind !== "RECURRING") {
    fields.push(
      text("number", "Numéro", {
        editable: false,
        defaultVisible: true,
        width: 140,
        maxLength: 40,
      }),
    );
  }
  fields.push(
    relation("companyId", "Client", "company", { required: true, defaultVisible: true }),
    text("subject", "Objet", { defaultVisible: true, width: 240 }),
    choice("status", "Statut", statuses[kind], {
      defaultValue: kind === "RECURRING" ? "active" : "draft",
      editable: kind === "RECURRING",
      required: true,
      notNull: true,
      defaultVisible: true,
      width: 160,
    }),
  );
  if (kind === "RECURRING") {
    fields.push(
      choice("interval", "Fréquence", RECURRING_INTERVALS, {
        defaultValue: "monthly",
        required: true,
        defaultVisible: true,
      }),
      date("nextRunAt", "Prochaine facture", { defaultVisible: true }),
      date("endsAt", "Fin"),
      {
        key: "autoSend",
        label: "Envoi automatique",
        type: "boolean",
        editable: true,
        filterable: true,
        width: 140,
        defaultVisible: true,
      },
    );
  } else {
    fields.push(
      date("issueDate", "Date", { editable: false, defaultVisible: true }),
      date("dueDate", dueLabel[kind], { defaultVisible: kind !== "CREDIT_NOTE" }),
    );
  }
  fields.push(
    money("totalExclCents", "Total HT", { defaultVisible: true }),
    money("taxCents", "TVA"),
    money("totalCents", "Total TTC", { defaultVisible: kind !== "RECURRING" }),
  );
  if (kind === "INVOICE") {
    fields.push(
      money("paidCents", "Encaissé"),
      money("dueCents", "Reste dû", { defaultVisible: true }),
    );
  }
  if (kind === "CREDIT_NOTE") {
    fields.push(
      relation("creditedInvoiceId", "Facture d'origine", "invoice", {
        editable: false,
        defaultVisible: true,
      }),
    );
  }
  fields.push(relation("contactId", "Contact", "contact"));
  if (kind === "QUOTE" || kind === "ORDER") fields.push(relation("dealId", "Opportunité", "deal"));
  if (kind === "INVOICE" || kind === "RECURRING")
    fields.push(relation("projectId", "Projet", "project"));
  fields.push(owner("Commercial"), TAGS, ...SYSTEM_FIELDS);
  return fields;
}

function documentEntity(
  kind: DocumentKind,
  key: EntityKey,
  slug: string,
  label: string,
  labelPlural: string,
  feminine: boolean,
  initialStatus: string,
): EntityDef {
  return {
    key,
    module: "sales",
    model: "salesDocument",
    slug,
    label,
    labelPlural,
    feminine,
    fields: documentFields(kind),
    titleFields: kind === "RECURRING" ? ["subject"] : ["number"],
    emptyTitle: kind === "RECURRING" ? "Facture récurrente" : "Brouillon",
    subtitleFields: ["subject"],
    searchFields: ["number", "subject"],
    defaultSort: { field: "createdAt", direction: "desc" },
    baseWhere: { kind },
    createDefaults: { kind, status: initialStatus },
    customPage: "document",
    layouts: kind === "QUOTE" ? { board: { field: "status", sum: "totalExclCents" } } : undefined,
  };
}

// ─────────────────────────── Registre ───────────────────────────

export const ENTITIES: Record<EntityKey, EntityDef> = {
  company: {
    key: "company",
    module: "crm",
    model: "company",
    slug: "entreprises",
    label: "Entreprise",
    labelPlural: "Entreprises",
    feminine: true,
    titleFields: ["name"],
    emptyTitle: "Sans nom",
    subtitleFields: ["city", "email"],
    searchFields: ["name", "email", "city", "siren", "website"],
    defaultSort: { field: "name", direction: "asc" },
    related: [
      { entity: "contact", field: "companyId", label: "Contacts" },
      { entity: "deal", field: "companyId", label: "Opportunités" },
      { entity: "activity", field: "companyId", label: "Activités" },
      { entity: "quote", field: "companyId", label: "Devis" },
      { entity: "invoice", field: "companyId", label: "Factures" },
      { entity: "project", field: "companyId", label: "Projets" },
    ],
    fields: [
      text("name", "Nom", { required: true, defaultVisible: true, width: 240, maxLength: 160 }),
      choice("type", "Type", COMPANY_TYPES, { defaultVisible: true }),
      text("email", "Email", { type: "email", defaultVisible: true, width: 220 }),
      text("phone", "Téléphone", {
        type: "phone",
        sortable: false,
        defaultVisible: true,
        width: 150,
        maxLength: 40,
      }),
      text("website", "Site web", { type: "url", sortable: false, width: 200 }),
      text("address", "Adresse", { sortable: false, width: 220 }),
      text("postalCode", "Code postal", { width: 110, maxLength: 12 }),
      text("city", "Ville", {
        groupable: true,
        defaultVisible: true,
        width: 150,
        maxLength: 120,
      }),
      text("country", "Pays", { groupable: true, width: 120, maxLength: 80 }),
      text("siren", "SIREN", { sortable: false, width: 120, maxLength: 14 }),
      text("vatNumber", "N° de TVA", { sortable: false, width: 150, maxLength: 20 }),
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
        integer: true,
        label: "Effectif",
        type: "number",
        editable: true,
        sortable: true,
        filterable: true,
        aggregate: "sum",
        width: 110,
      },
      owner("Responsable", true),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },
  contact: {
    key: "contact",
    module: "crm",
    model: "contact",
    slug: "contacts",
    label: "Contact",
    labelPlural: "Contacts",
    feminine: false,
    titleFields: ["firstName", "lastName"],
    emptyTitle: "Sans nom",
    subtitleFields: ["jobTitle", "email"],
    searchFields: ["firstName", "lastName", "email", "phone", "jobTitle"],
    defaultSort: { field: "lastName", direction: "asc" },
    related: [
      { entity: "deal", field: "contactId", label: "Opportunités" },
      { entity: "activity", field: "contactId", label: "Activités" },
    ],
    fields: [
      text("firstName", "Prénom", { defaultVisible: true, width: 140, maxLength: 80 }),
      text("lastName", "Nom", {
        required: true,
        defaultVisible: true,
        width: 160,
        maxLength: 80,
      }),
      relation("companyId", "Entreprise", "company", { defaultVisible: true }),
      text("jobTitle", "Fonction", { defaultVisible: true, width: 170, maxLength: 120 }),
      text("email", "Email", { type: "email", defaultVisible: true, width: 220 }),
      text("phone", "Téléphone", { type: "phone", sortable: false, width: 150, maxLength: 40 }),
      choice("status", "Statut", CONTACT_STATUSES, { defaultVisible: true, width: 130 }),
      {
        key: "score",
        integer: true,
        label: "Score",
        type: "number",
        editable: true,
        sortable: true,
        filterable: true,
        aggregate: "avg",
        defaultVisible: true,
        width: 100,
      },
      choice("source", "Origine", CONTACT_SOURCES, { width: 150 }),
      owner(),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },
  deal: {
    key: "deal",
    module: "crm",
    model: "deal",
    slug: "opportunites",
    label: "Opportunité",
    labelPlural: "Opportunités",
    feminine: true,
    titleFields: ["name"],
    emptyTitle: "Sans nom",
    subtitleFields: [],
    searchFields: ["name"],
    defaultSort: { field: "updatedAt", direction: "desc" },
    layouts: {
      board: { field: "stage", sum: "amount" },
      calendar: { start: "expectedCloseDate" },
    },
    related: [
      { entity: "activity", field: "dealId", label: "Activités" },
      { entity: "quote", field: "dealId", label: "Devis" },
    ],
    fields: [
      text("name", "Nom", { required: true, defaultVisible: true, width: 240, maxLength: 160 }),
      relation("companyId", "Entreprise", "company", { defaultVisible: true }),
      relation("contactId", "Contact", "contact"),
      choice("stage", "Étape", DEAL_STAGES, {
        defaultValue: "lead",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      {
        key: "amount",
        label: "Montant",
        type: "currency",
        editable: true,
        sortable: true,
        filterable: true,
        aggregate: "sum",
        defaultVisible: true,
        width: 130,
      },
      {
        key: "probability",
        integer: true,
        label: "Probabilité",
        type: "percent",
        editable: true,
        sortable: true,
        filterable: true,
        aggregate: "avg",
        defaultVisible: true,
        width: 110,
      },
      date("expectedCloseDate", "Clôture prévue", { defaultVisible: true }),
      date("closedAt", "Clôturée le", { editable: false }),
      choice("source", "Origine", CONTACT_SOURCES, { width: 150 }),
      text("lostReason", "Motif de perte", { width: 200 }),
      owner("Responsable", true),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },
  activity: {
    key: "activity",
    module: "crm",
    model: "activity",
    slug: "activites",
    label: "Activité",
    labelPlural: "Activités",
    feminine: true,
    titleFields: ["subject"],
    emptyTitle: "Sans objet",
    subtitleFields: [],
    searchFields: ["subject", "notes"],
    defaultSort: { field: "dueAt", direction: "asc" },
    layouts: { calendar: { start: "dueAt" }, board: { field: "type" } },
    fields: [
      text("subject", "Objet", { required: true, defaultVisible: true, width: 260 }),
      choice("type", "Type", ACTIVITY_TYPES, {
        defaultValue: "task",
        required: true,
        notNull: true,
        defaultVisible: true,
        width: 130,
      }),
      {
        key: "dueAt",
        label: "Prévue le",
        type: "datetime",
        editable: true,
        sortable: true,
        filterable: true,
        defaultVisible: true,
        width: 160,
      },
      {
        key: "done",
        label: "Faite",
        type: "boolean",
        editable: true,
        filterable: true,
        groupable: true,
        defaultVisible: true,
        width: 90,
      },
      relation("companyId", "Entreprise", "company", { defaultVisible: true }),
      relation("contactId", "Contact", "contact", { defaultVisible: true }),
      relation("dealId", "Opportunité", "deal"),
      {
        key: "durationMinutes",
        label: "Durée",
        type: "duration",
        editable: true,
        sortable: true,
        filterable: true,
        aggregate: "sum",
        width: 100,
      },
      longtext("notes", "Compte rendu"),
      owner("Responsable", true),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },
  product: {
    key: "product",
    module: "sales",
    model: "product",
    slug: "catalogue",
    label: "Article",
    labelPlural: "Catalogue",
    feminine: false,
    titleFields: ["name"],
    emptyTitle: "Sans nom",
    subtitleFields: ["sku"],
    searchFields: ["name", "sku", "description"],
    defaultSort: { field: "name", direction: "asc" },
    fields: [
      text("name", "Désignation", { required: true, defaultVisible: true, width: 260 }),
      text("sku", "Référence", { defaultVisible: true, width: 130, maxLength: 60 }),
      choice("type", "Type", PRODUCT_TYPES, {
        defaultValue: "service",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      choice("unit", "Unité", PRODUCT_UNITS, {
        defaultValue: "unit",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      {
        key: "unitPrice",
        label: "Prix unitaire HT",
        type: "currency",
        editable: true,
        required: true,
        notNull: true,
        sortable: true,
        filterable: true,
        defaultVisible: true,
        width: 150,
      },
      choice("vatRate", "TVA", VAT_RATES, {
        defaultValue: "20",
        required: true,
        notNull: true,
        defaultVisible: true,
        width: 100,
      }),
      {
        key: "purchasePrice",
        label: "Prix d'achat HT",
        type: "currency",
        editable: true,
        sortable: true,
        filterable: true,
        width: 140,
      },
      {
        key: "active",
        label: "Actif",
        type: "boolean",
        editable: true,
        filterable: true,
        groupable: true,
        defaultVisible: true,
        width: 90,
      },
      longtext("description", "Description"),
      owner(),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },
  quote: documentEntity("QUOTE", "quote", "devis", "Devis", "Devis", false, "draft"),
  order: documentEntity("ORDER", "order", "commandes", "Commande", "Commandes", true, "draft"),
  invoice: documentEntity("INVOICE", "invoice", "factures", "Facture", "Factures", true, "draft"),
  creditNote: documentEntity(
    "CREDIT_NOTE",
    "creditNote",
    "avoirs",
    "Avoir",
    "Avoirs",
    false,
    "draft",
  ),
  recurringInvoice: documentEntity(
    "RECURRING",
    "recurringInvoice",
    "recurrentes",
    "Facture récurrente",
    "Factures récurrentes",
    true,
    "active",
  ),
  project: {
    key: "project",
    module: "projects",
    model: "project",
    slug: "liste",
    label: "Projet",
    labelPlural: "Projets",
    feminine: false,
    titleFields: ["name"],
    emptyTitle: "Sans nom",
    subtitleFields: [],
    searchFields: ["name", "description"],
    defaultSort: { field: "updatedAt", direction: "desc" },
    layouts: {
      board: { field: "status", sum: "budget" },
      gantt: { start: "startDate", end: "endDate" },
    },
    related: [
      { entity: "task", field: "projectId", label: "Tâches" },
      { entity: "timeEntry", field: "projectId", label: "Temps passé" },
      { entity: "invoice", field: "projectId", label: "Factures" },
    ],
    fields: [
      text("name", "Nom", { required: true, defaultVisible: true, width: 240 }),
      relation("companyId", "Client", "company", { defaultVisible: true }),
      choice("status", "Statut", PROJECT_STATUSES, {
        defaultValue: "planned",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      date("startDate", "Début", { defaultVisible: true }),
      date("endDate", "Fin", { defaultVisible: true }),
      {
        key: "budget",
        label: "Budget",
        type: "currency",
        editable: true,
        sortable: true,
        filterable: true,
        aggregate: "sum",
        defaultVisible: true,
        width: 130,
      },
      {
        key: "hourlyRate",
        label: "Taux horaire",
        type: "currency",
        editable: true,
        sortable: true,
        filterable: true,
        width: 120,
      },
      longtext("description", "Description"),
      owner("Chef de projet", true),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },
  task: {
    key: "task",
    module: "projects",
    model: "task",
    slug: "taches",
    label: "Tâche",
    labelPlural: "Tâches",
    feminine: true,
    titleFields: ["title"],
    emptyTitle: "Sans titre",
    subtitleFields: [],
    searchFields: ["title", "description"],
    defaultSort: { field: "dueDate", direction: "asc" },
    layouts: {
      board: { field: "status" },
      calendar: { start: "dueDate" },
      gantt: { start: "startDate", end: "dueDate" },
    },
    related: [{ entity: "timeEntry", field: "taskId", label: "Temps passé" }],
    fields: [
      text("title", "Titre", { required: true, defaultVisible: true, width: 280 }),
      relation("projectId", "Projet", "project", { defaultVisible: true }),
      choice("status", "Statut", TASK_STATUSES, {
        defaultValue: "todo",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      choice("priority", "Priorité", TASK_PRIORITIES, {
        defaultValue: "normal",
        required: true,
        notNull: true,
        defaultVisible: true,
        width: 120,
      }),
      owner("Assignée à", true),
      date("startDate", "Début"),
      date("dueDate", "Échéance", { defaultVisible: true }),
      {
        key: "estimateHours",
        label: "Estimation (h)",
        type: "number",
        editable: true,
        sortable: true,
        filterable: true,
        aggregate: "sum",
        width: 120,
      },
      date("completedAt", "Terminée le", { editable: false }),
      longtext("description", "Description"),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },
  timeEntry: {
    key: "timeEntry",
    module: "projects",
    model: "timeEntry",
    slug: "temps",
    label: "Saisie de temps",
    labelPlural: "Temps passé",
    feminine: true,
    titleFields: ["description"],
    emptyTitle: "Temps passé",
    subtitleFields: [],
    searchFields: ["description"],
    defaultSort: { field: "date", direction: "desc" },
    layouts: { calendar: { start: "date" } },
    fields: [
      date("date", "Date", {
        defaultValue: "today",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      owner("Personne", true),
      relation("projectId", "Projet", "project", { defaultVisible: true }),
      relation("taskId", "Tâche", "task", { defaultVisible: true }),
      text("description", "Description", { defaultVisible: true, width: 260 }),
      {
        key: "minutes",
        label: "Durée",
        type: "duration",
        editable: true,
        sortable: true,
        filterable: true,
        aggregate: "sum",
        defaultVisible: true,
        width: 100,
      },
      {
        key: "billable",
        label: "Facturable",
        type: "boolean",
        editable: true,
        filterable: true,
        groupable: true,
        defaultVisible: true,
        width: 110,
      },
      relation("invoiceId", "Facture", "invoice", { editable: false }),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },
};

// ─────────────────────────── Utilitaires ───────────────────────────

/** Adresse de la liste d'une entité (« /ventes/factures »). */
export function entityPath(entity: EntityKey): string {
  const def = ENTITIES[entity];
  return `/${MODULES[def.module].slug}/${def.slug}`;
}

export function recordPath(entity: EntityKey, id: string): string {
  return `${entityPath(entity)}/${id}`;
}

export function entityBySlug(module: ModuleKey, slug: string): EntityDef | undefined {
  return Object.values(ENTITIES).find((e) => e.module === module && e.slug === slug);
}

/** Tous les champs d'une entité : standards puis personnalisés. */
export function entityFields(entity: EntityDef, custom: CustomFieldRecord[] = []): FieldDef[] {
  return [...entity.fields, ...custom.map(customFieldToDef)];
}

/** Nom de la relation Prisma portée par un champ `user` ou `relation`. */
export function relationName(field: FieldDef): string {
  return field.relationName ?? field.key.replace(/Id$/, "");
}

/** Libellé affichable d'un enregistrement. */
export function recordTitle(entity: EntityKey, record: Record<string, unknown>): string {
  const def = ENTITIES[entity];
  const parts = def.titleFields
    .map((key) => record[key])
    .filter((v) => v !== null && v !== undefined && v !== "");
  return parts.length ? parts.map(String).join(" ") : def.emptyTitle;
}

/** Sous-titre (recherche, listes de choix) : premier champ renseigné. */
export function recordSubtitle(entity: EntityKey, record: Record<string, unknown>): string | null {
  for (const key of ENTITIES[entity].subtitleFields) {
    const value = record[key];
    if (value !== null && value !== undefined && value !== "") return String(value);
  }
  return null;
}
