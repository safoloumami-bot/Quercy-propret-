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

export const SUPPLIER_CATEGORIES: FieldOption[] = [
  { value: "goods", label: "Marchandises" },
  { value: "services", label: "Services" },
  { value: "subcontracting", label: "Sous-traitance" },
  { value: "utilities", label: "Énergie et télécoms" },
  { value: "other", label: "Autre" },
];

export const PURCHASE_ORDER_STATUSES: FieldOption[] = [
  { value: "draft", label: "Brouillon", tone: "neutral" },
  { value: "sent", label: "Envoyée", tone: "info" },
  { value: "received", label: "Reçue", tone: "success" },
  { value: "cancelled", label: "Annulée", tone: "warning" },
];

export const BILL_STATUSES: FieldOption[] = [
  { value: "to_pay", label: "À payer", tone: "info" },
  { value: "paid", label: "Payée", tone: "success" },
  { value: "disputed", label: "Contestée", tone: "danger" },
  { value: "cancelled", label: "Annulée", tone: "neutral" },
];

export const EXPENSE_CATEGORIES: FieldOption[] = [
  { value: "travel", label: "Déplacements" },
  { value: "meals", label: "Repas" },
  { value: "lodging", label: "Hébergement" },
  { value: "supplies", label: "Fournitures" },
  { value: "services", label: "Prestations" },
  { value: "other", label: "Autre" },
];

export const EXPENSE_STATUSES: FieldOption[] = [
  { value: "submitted", label: "Soumise", tone: "info" },
  { value: "approved", label: "Validée", tone: "primary" },
  { value: "rejected", label: "Refusée", tone: "danger" },
  { value: "reimbursed", label: "Remboursée", tone: "success" },
];

export const STOCK_MOVEMENT_TYPES: FieldOption[] = [
  { value: "in", label: "Entrée", tone: "success" },
  { value: "out", label: "Sortie", tone: "warning" },
  { value: "adjust", label: "Ajustement", tone: "neutral" },
];

export const EVENT_TYPES: FieldOption[] = [
  { value: "meeting", label: "Rendez-vous", tone: "primary" },
  { value: "call", label: "Appel", tone: "info" },
  { value: "visit", label: "Intervention", tone: "success" },
  { value: "internal", label: "Interne", tone: "neutral" },
  { value: "other", label: "Autre", tone: "neutral" },
];

export const TICKET_STATUSES: FieldOption[] = [
  { value: "new", label: "Nouveau", tone: "info" },
  { value: "open", label: "En cours", tone: "primary" },
  { value: "pending", label: "En attente client", tone: "warning" },
  { value: "resolved", label: "Résolu", tone: "success" },
  { value: "closed", label: "Fermé", tone: "neutral" },
];

export const TICKET_CHANNELS: FieldOption[] = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Téléphone" },
  { value: "web", label: "Formulaire web" },
  { value: "onsite", label: "Sur place" },
];

export const CONTRACT_TYPES: FieldOption[] = [
  { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" },
  { value: "apprentice", label: "Apprentissage" },
  { value: "intern", label: "Stage" },
  { value: "freelance", label: "Indépendant" },
];

export const EMPLOYEE_STATUSES: FieldOption[] = [
  { value: "active", label: "En poste", tone: "success" },
  { value: "leave", label: "En congé longue durée", tone: "warning" },
  { value: "left", label: "Parti", tone: "neutral" },
];

export const LEAVE_TYPES: FieldOption[] = [
  { value: "paid", label: "Congés payés", tone: "primary" },
  { value: "rtt", label: "RTT", tone: "info" },
  { value: "sick", label: "Maladie", tone: "warning" },
  { value: "unpaid", label: "Sans solde", tone: "neutral" },
  { value: "other", label: "Autre", tone: "neutral" },
];

export const LEAVE_STATUSES: FieldOption[] = [
  { value: "requested", label: "Demandée", tone: "info" },
  { value: "approved", label: "Validée", tone: "success" },
  { value: "rejected", label: "Refusée", tone: "danger" },
];

export const TRANSACTION_CATEGORIES: FieldOption[] = [
  { value: "sales", label: "Encaissement client" },
  { value: "purchases", label: "Paiement fournisseur" },
  { value: "payroll", label: "Salaires" },
  { value: "taxes", label: "Impôts et charges" },
  { value: "bank_fees", label: "Frais bancaires" },
  { value: "transfer", label: "Virement interne" },
  { value: "other", label: "Autre" },
];

export const DOCUMENT_CATEGORIES: FieldOption[] = [
  { value: "contract", label: "Contrat" },
  { value: "invoice", label: "Facture" },
  { value: "hr", label: "RH" },
  { value: "legal", label: "Juridique" },
  { value: "technical", label: "Technique" },
  { value: "other", label: "Autre" },
];

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
    related: [{ entity: "stockMovement", field: "productId", label: "Mouvements de stock" }],
    fields: [
      {
        key: "imageUrl",
        label: "Image",
        type: "image",
        editable: true,
        filterable: true,
        defaultVisible: true,
        width: 76,
      },
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
      {
        key: "stockQuantity",
        label: "Stock",
        type: "number",
        sortable: true,
        filterable: true,
        aggregate: "sum",
        notNull: true,
        width: 100,
      },
      {
        key: "reorderLevel",
        label: "Seuil d'alerte",
        type: "number",
        editable: true,
        sortable: true,
        filterable: true,
        width: 120,
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

  // ─────────────────────────── Achats ───────────────────────────
  supplier: {
    key: "supplier",
    module: "purchases",
    model: "supplier",
    slug: "fournisseurs",
    label: "Fournisseur",
    labelPlural: "Fournisseurs",
    feminine: false,
    titleFields: ["name"],
    emptyTitle: "Sans nom",
    subtitleFields: ["city", "email"],
    searchFields: ["name", "email", "siret", "city"],
    defaultSort: { field: "name", direction: "asc" },
    related: [
      { entity: "purchaseOrder", field: "supplierId", label: "Commandes" },
      { entity: "bill", field: "supplierId", label: "Factures" },
    ],
    fields: [
      text("name", "Nom", { required: true, defaultVisible: true, width: 240 }),
      choice("category", "Catégorie", SUPPLIER_CATEGORIES, { defaultVisible: true }),
      text("email", "Email", { type: "email", defaultVisible: true, width: 220 }),
      text("phone", "Téléphone", { type: "phone", defaultVisible: true, width: 150 }),
      text("siret", "SIRET", { width: 150, maxLength: 20 }),
      text("vatNumber", "N° TVA", { width: 150, maxLength: 20 }),
      text("iban", "IBAN", { width: 240, maxLength: 40 }),
      text("address", "Adresse", { width: 240 }),
      text("city", "Ville", { defaultVisible: true, width: 150 }),
      longtext("notes", "Notes"),
      owner(),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },
  purchaseOrder: {
    key: "purchaseOrder",
    module: "purchases",
    model: "purchaseOrder",
    slug: "commandes",
    label: "Commande fournisseur",
    labelPlural: "Commandes fournisseurs",
    feminine: true,
    titleFields: ["number"],
    emptyTitle: "Commande",
    subtitleFields: [],
    searchFields: ["number", "notes"],
    defaultSort: { field: "orderDate", direction: "desc" },
    layouts: {
      board: { field: "status", sum: "totalExclCents" },
      calendar: { start: "expectedDate" },
    },
    related: [{ entity: "bill", field: "purchaseOrderId", label: "Factures" }],
    fields: [
      text("number", "Numéro", { defaultVisible: true, width: 140, maxLength: 40 }),
      relation("supplierId", "Fournisseur", "supplier", { required: true, defaultVisible: true }),
      choice("status", "Statut", PURCHASE_ORDER_STATUSES, {
        defaultValue: "draft",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      date("orderDate", "Date", {
        defaultValue: "today",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      date("expectedDate", "Livraison prévue", { defaultVisible: true }),
      money("totalExclCents", "Total HT", { editable: true, defaultVisible: true }),
      relation("projectId", "Projet", "project"),
      longtext("notes", "Notes"),
      owner("Acheteur"),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },
  bill: {
    key: "bill",
    module: "purchases",
    model: "bill",
    slug: "factures",
    label: "Facture fournisseur",
    labelPlural: "Factures fournisseurs",
    feminine: true,
    titleFields: ["number"],
    emptyTitle: "Facture fournisseur",
    subtitleFields: [],
    searchFields: ["number", "notes"],
    defaultSort: { field: "dueDate", direction: "asc" },
    layouts: { board: { field: "status", sum: "totalCents" }, calendar: { start: "dueDate" } },
    fields: [
      text("number", "Numéro", { defaultVisible: true, width: 140, maxLength: 60 }),
      relation("supplierId", "Fournisseur", "supplier", { required: true, defaultVisible: true }),
      choice("status", "Statut", BILL_STATUSES, {
        defaultValue: "to_pay",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      choice("category", "Catégorie", EXPENSE_CATEGORIES, { defaultValue: "supplies" }),
      date("issueDate", "Date", {
        defaultValue: "today",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      date("dueDate", "Échéance", { defaultVisible: true }),
      money("totalExclCents", "Total HT", { editable: true, defaultVisible: true }),
      money("vatCents", "TVA", { editable: true }),
      money("totalCents", "Total TTC", { editable: true, defaultVisible: true }),
      date("paidAt", "Payée le", { editable: false }),
      relation("purchaseOrderId", "Commande", "purchaseOrder"),
      relation("projectId", "Projet", "project"),
      longtext("notes", "Notes"),
      owner(),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },
  expense: {
    key: "expense",
    module: "purchases",
    model: "expense",
    slug: "notes-de-frais",
    label: "Note de frais",
    labelPlural: "Notes de frais",
    feminine: true,
    titleFields: ["description"],
    emptyTitle: "Note de frais",
    subtitleFields: [],
    searchFields: ["description"],
    defaultSort: { field: "date", direction: "desc" },
    layouts: { board: { field: "status", sum: "amountCents" } },
    fields: [
      text("description", "Objet", { required: true, defaultVisible: true, width: 260 }),
      date("date", "Date", {
        defaultValue: "today",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      choice("category", "Catégorie", EXPENSE_CATEGORIES, {
        defaultValue: "travel",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      money("amountCents", "Montant TTC", { editable: true, defaultVisible: true }),
      money("vatCents", "Dont TVA", { editable: true }),
      choice("status", "Statut", EXPENSE_STATUSES, {
        defaultValue: "submitted",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      relation("projectId", "Projet", "project"),
      owner("Salarié", true),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },

  // ─────────────────────────── Stocks ───────────────────────────
  warehouse: {
    key: "warehouse",
    module: "inventory",
    model: "warehouse",
    slug: "entrepots",
    label: "Entrepôt",
    labelPlural: "Entrepôts",
    feminine: false,
    titleFields: ["name"],
    emptyTitle: "Sans nom",
    subtitleFields: ["address"],
    searchFields: ["name", "address"],
    defaultSort: { field: "name", direction: "asc" },
    related: [{ entity: "stockMovement", field: "warehouseId", label: "Mouvements" }],
    fields: [
      text("name", "Nom", { required: true, defaultVisible: true, width: 220 }),
      text("address", "Adresse", { defaultVisible: true, width: 280 }),
      owner("Responsable", true),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },
  stockMovement: {
    key: "stockMovement",
    module: "inventory",
    model: "stockMovement",
    slug: "mouvements",
    label: "Mouvement de stock",
    labelPlural: "Mouvements de stock",
    feminine: false,
    titleFields: ["reference"],
    emptyTitle: "Mouvement",
    subtitleFields: [],
    searchFields: ["reference", "note"],
    defaultSort: { field: "date", direction: "desc" },
    fields: [
      date("date", "Date", {
        defaultValue: "today",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      relation("productId", "Article", "product", { required: true, defaultVisible: true }),
      choice("type", "Type", STOCK_MOVEMENT_TYPES, {
        defaultValue: "in",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      {
        key: "quantity",
        label: "Quantité",
        type: "number",
        editable: true,
        required: true,
        notNull: true,
        sortable: true,
        filterable: true,
        aggregate: "sum",
        defaultVisible: true,
        width: 110,
      },
      relation("warehouseId", "Entrepôt", "warehouse", { defaultVisible: true }),
      text("reference", "Référence", { defaultVisible: true, width: 160, maxLength: 80 }),
      longtext("note", "Note"),
      owner("Saisi par"),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },

  // ─────────────────────────── Agenda ───────────────────────────
  event: {
    key: "event",
    module: "calendar",
    model: "event",
    slug: "evenements",
    label: "Événement",
    labelPlural: "Événements",
    feminine: false,
    titleFields: ["title"],
    emptyTitle: "Sans titre",
    subtitleFields: ["location"],
    searchFields: ["title", "location", "description"],
    defaultSort: { field: "startAt", direction: "desc" },
    layouts: { calendar: { start: "startAt", end: "endAt" } },
    fields: [
      text("title", "Titre", { required: true, defaultVisible: true, width: 260 }),
      choice("type", "Type", EVENT_TYPES, {
        defaultValue: "meeting",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      {
        key: "startAt",
        label: "Début",
        type: "datetime",
        editable: true,
        required: true,
        notNull: true,
        sortable: true,
        filterable: true,
        defaultVisible: true,
        width: 160,
      },
      {
        key: "endAt",
        label: "Fin",
        type: "datetime",
        editable: true,
        sortable: true,
        filterable: true,
        defaultVisible: true,
        width: 160,
      },
      text("location", "Lieu", { defaultVisible: true }),
      relation("companyId", "Entreprise", "company"),
      relation("contactId", "Contact", "contact"),
      relation("projectId", "Projet", "project"),
      longtext("description", "Description"),
      owner("Organisateur", true),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },

  // ─────────────────────────── Support ───────────────────────────
  ticket: {
    key: "ticket",
    module: "support",
    model: "ticket",
    slug: "tickets",
    label: "Ticket",
    labelPlural: "Tickets",
    feminine: false,
    titleFields: ["subject"],
    emptyTitle: "Sans objet",
    subtitleFields: [],
    searchFields: ["subject", "description"],
    defaultSort: { field: "createdAt", direction: "desc" },
    layouts: { board: { field: "status" }, calendar: { start: "dueDate" } },
    fields: [
      text("subject", "Objet", { required: true, defaultVisible: true, width: 300 }),
      relation("companyId", "Client", "company", { defaultVisible: true }),
      relation("contactId", "Contact", "contact"),
      choice("status", "Statut", TICKET_STATUSES, {
        defaultValue: "new",
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
      choice("channel", "Canal", TICKET_CHANNELS, { defaultValue: "email" }),
      date("dueDate", "Échéance", { defaultVisible: true }),
      date("resolvedAt", "Résolu le", { editable: false }),
      longtext("description", "Demande"),
      owner("Assigné à", true),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },

  // ─────────────────────────── RH ───────────────────────────
  employee: {
    key: "employee",
    module: "hr",
    model: "employee",
    slug: "salaries",
    label: "Salarié",
    labelPlural: "Salariés",
    feminine: false,
    titleFields: ["firstName", "lastName"],
    emptyTitle: "Sans nom",
    subtitleFields: ["jobTitle"],
    searchFields: ["firstName", "lastName", "email", "jobTitle"],
    defaultSort: { field: "lastName", direction: "asc" },
    related: [
      { entity: "leave", field: "employeeId", label: "Absences" },
      { entity: "document", field: "employeeId", label: "Documents" },
    ],
    fields: [
      text("firstName", "Prénom", { required: true, defaultVisible: true, width: 150 }),
      text("lastName", "Nom", { required: true, defaultVisible: true, width: 170 }),
      text("jobTitle", "Poste", { defaultVisible: true, width: 200 }),
      text("department", "Service", { defaultVisible: true, width: 150 }),
      text("email", "Email", { type: "email", width: 220 }),
      text("phone", "Téléphone", { type: "phone", width: 150 }),
      choice("contractType", "Contrat", CONTRACT_TYPES, {
        defaultValue: "cdi",
        defaultVisible: true,
      }),
      choice("status", "Statut", EMPLOYEE_STATUSES, {
        defaultValue: "active",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      date("startDate", "Entrée", { defaultVisible: true }),
      date("endDate", "Sortie"),
      money("grossSalaryCents", "Salaire brut annuel", { editable: true }),
      owner("Manager"),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },
  leave: {
    key: "leave",
    module: "hr",
    model: "leave",
    slug: "absences",
    label: "Absence",
    labelPlural: "Congés et absences",
    feminine: true,
    titleFields: ["reason"],
    emptyTitle: "Absence",
    subtitleFields: [],
    searchFields: ["reason"],
    defaultSort: { field: "startDate", direction: "desc" },
    layouts: {
      board: { field: "status" },
      calendar: { start: "startDate", end: "endDate" },
      gantt: { start: "startDate", end: "endDate" },
    },
    fields: [
      relation("employeeId", "Salarié", "employee", { required: true, defaultVisible: true }),
      choice("type", "Type", LEAVE_TYPES, {
        defaultValue: "paid",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      date("startDate", "Du", { required: true, notNull: true, defaultVisible: true }),
      date("endDate", "Au", { required: true, notNull: true, defaultVisible: true }),
      {
        key: "days",
        label: "Jours",
        type: "number",
        editable: true,
        sortable: true,
        filterable: true,
        aggregate: "sum",
        defaultVisible: true,
        width: 90,
      },
      choice("status", "Statut", LEAVE_STATUSES, {
        defaultValue: "requested",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      text("reason", "Motif", { width: 220 }),
      owner("Validé par"),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },

  // ─────────────────────────── Trésorerie ───────────────────────────
  bankAccount: {
    key: "bankAccount",
    module: "treasury",
    model: "bankAccount",
    slug: "comptes",
    label: "Compte bancaire",
    labelPlural: "Comptes bancaires",
    feminine: false,
    titleFields: ["name"],
    emptyTitle: "Compte",
    subtitleFields: ["bank"],
    searchFields: ["name", "bank", "iban"],
    defaultSort: { field: "name", direction: "asc" },
    related: [{ entity: "bankTransaction", field: "accountId", label: "Opérations" }],
    fields: [
      text("name", "Nom", { required: true, defaultVisible: true, width: 220 }),
      text("bank", "Banque", { defaultVisible: true, width: 180 }),
      text("iban", "IBAN", { defaultVisible: true, width: 260, maxLength: 40 }),
      money("openingBalanceCents", "Solde initial", { editable: true }),
      money("balanceCents", "Solde", { editable: false, defaultVisible: true }),
      owner(),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },
  bankTransaction: {
    key: "bankTransaction",
    module: "treasury",
    model: "bankTransaction",
    slug: "operations",
    label: "Opération",
    labelPlural: "Opérations bancaires",
    feminine: true,
    titleFields: ["label"],
    emptyTitle: "Opération",
    subtitleFields: [],
    searchFields: ["label", "note"],
    defaultSort: { field: "date", direction: "desc" },
    layouts: { calendar: { start: "date" } },
    fields: [
      date("date", "Date", {
        defaultValue: "today",
        required: true,
        notNull: true,
        defaultVisible: true,
      }),
      text("label", "Libellé", { required: true, defaultVisible: true, width: 280 }),
      money("amountCents", "Montant", { editable: true, required: true, defaultVisible: true }),
      relation("accountId", "Compte", "bankAccount", { required: true, defaultVisible: true }),
      choice("category", "Catégorie", TRANSACTION_CATEGORIES, { defaultVisible: true }),
      {
        key: "reconciled",
        label: "Rapprochée",
        type: "boolean",
        editable: true,
        filterable: true,
        groupable: true,
        defaultVisible: true,
        width: 110,
      },
      relation("invoiceId", "Facture client", "invoice"),
      relation("billId", "Facture fournisseur", "bill"),
      longtext("note", "Note"),
      owner(),
      TAGS,
      ...SYSTEM_FIELDS,
    ],
  },

  // ─────────────────────────── Documents ───────────────────────────
  document: {
    key: "document",
    module: "documents",
    model: "document",
    slug: "bibliotheque",
    label: "Document",
    labelPlural: "Documents",
    feminine: false,
    titleFields: ["title"],
    emptyTitle: "Sans titre",
    subtitleFields: ["folder"],
    searchFields: ["title", "folder", "description"],
    defaultSort: { field: "updatedAt", direction: "desc" },
    fields: [
      text("title", "Titre", { required: true, defaultVisible: true, width: 280 }),
      text("folder", "Dossier", { defaultVisible: true, groupable: true, width: 180 }),
      choice("category", "Catégorie", DOCUMENT_CATEGORIES, { defaultVisible: true }),
      relation("companyId", "Entreprise", "company"),
      relation("projectId", "Projet", "project"),
      relation("employeeId", "Salarié", "employee"),
      date("expiresAt", "Échéance", { defaultVisible: true }),
      longtext("description", "Description"),
      owner("Responsable", true),
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
