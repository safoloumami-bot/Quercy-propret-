import { z } from "zod";

/**
 * Catalogue des modules métier activables par entreprise.
 * L'ordre du tableau est l'ordre d'affichage par défaut dans la navigation.
 */
export const MODULE_KEYS = [
  "crm",
  "sales",
  "purchases",
  "inventory",
  "projects",
  "cleaning",
  "calendar",
  "support",
  "hr",
  "treasury",
  "documents",
  "automations",
  "integrations",
] as const;

export const moduleKeySchema = z.enum(MODULE_KEYS);
export type ModuleKey = z.infer<typeof moduleKeySchema>;

export type ModuleCategory = "relation" | "finance" | "operations" | "people" | "platform";

export interface ModuleDefinition {
  key: ModuleKey;
  /** Segment d'URL : /app/<slug> */
  slug: string;
  name: string;
  description: string;
  category: ModuleCategory;
  /** Modules conseillés en complément (utilisé par l'assistant d'accueil). */
  pairsWith: readonly ModuleKey[];
}

export const MODULES: Record<ModuleKey, ModuleDefinition> = {
  crm: {
    key: "crm",
    slug: "crm",
    name: "Contacts & CRM",
    description: "Entreprises, contacts, prospects et pipeline de ventes.",
    category: "relation",
    pairsWith: ["sales", "calendar"],
  },
  sales: {
    key: "sales",
    slug: "ventes",
    name: "Ventes & facturation",
    description: "Catalogue, devis, commandes, factures, avoirs et relances.",
    category: "finance",
    pairsWith: ["crm", "treasury"],
  },
  purchases: {
    key: "purchases",
    slug: "achats",
    name: "Achats & dépenses",
    description: "Fournisseurs, bons de commande, factures fournisseurs et notes de frais.",
    category: "finance",
    pairsWith: ["inventory", "treasury"],
  },
  inventory: {
    key: "inventory",
    slug: "stocks",
    name: "Stocks & inventaire",
    description: "Articles, entrepôts, mouvements, alertes et valorisation.",
    category: "operations",
    pairsWith: ["purchases", "sales"],
  },
  projects: {
    key: "projects",
    slug: "projets",
    name: "Projets & tâches",
    description: "Projets, tâches, Kanban, Gantt et suivi du temps.",
    category: "operations",
    pairsWith: ["calendar", "sales"],
  },
  cleaning: {
    key: "cleaning",
    slug: "nettoyage",
    name: "Nettoyage & interventions",
    description:
      "Sites clients, contrats d'entretien, planning des agents, pointage, signatures et contrôles qualité.",
    category: "operations",
    pairsWith: ["crm", "sales", "hr"],
  },
  calendar: {
    key: "calendar",
    slug: "agenda",
    name: "Agenda",
    description: "Calendrier partagé, rendez-vous et rappels.",
    category: "operations",
    pairsWith: ["crm", "projects"],
  },
  support: {
    key: "support",
    slug: "support",
    name: "Support client",
    description: "Tickets, priorités, SLA et réponses types.",
    category: "relation",
    pairsWith: ["crm"],
  },
  hr: {
    key: "hr",
    slug: "rh",
    name: "Ressources humaines",
    description: "Fiches employés, congés, planning et entretiens.",
    category: "people",
    pairsWith: ["calendar"],
  },
  treasury: {
    key: "treasury",
    slug: "tresorerie",
    name: "Trésorerie & comptabilité",
    description: "Encaissements, rapprochement bancaire, prévisionnel et export FEC.",
    category: "finance",
    pairsWith: ["sales", "purchases"],
  },
  documents: {
    key: "documents",
    slug: "documents",
    name: "Documents",
    description: "Dossiers, aperçus, versions et partage par lien.",
    category: "platform",
    pairsWith: [],
  },
  automations: {
    key: "automations",
    slug: "automatisations",
    name: "Automatisations",
    description: "Règles « quand… alors… » et journal d'exécution.",
    category: "platform",
    pairsWith: [],
  },
  integrations: {
    key: "integrations",
    slug: "integrations",
    name: "Intégrations",
    description: "API publique, webhooks et connecteurs.",
    category: "platform",
    pairsWith: ["automations"],
  },
};

export const MODULE_CATEGORY_LABELS: Record<ModuleCategory, string> = {
  relation: "Relation client",
  finance: "Finance",
  operations: "Opérations",
  people: "Équipe",
  platform: "Plateforme",
};

/** Renvoie les définitions des modules actifs, dans l'ordre canonique. */
export function activeModules(enabled: readonly ModuleKey[]): ModuleDefinition[] {
  const set = new Set(enabled);
  return MODULE_KEYS.filter((key) => set.has(key)).map((key) => MODULES[key]);
}

export function moduleBySlug(slug: string): ModuleDefinition | undefined {
  return Object.values(MODULES).find((m) => m.slug === slug);
}
