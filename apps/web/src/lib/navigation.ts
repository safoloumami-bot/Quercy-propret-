import {
  type Action,
  type EntityKey,
  type ModuleKey,
  type PermissionMatrix,
  type Resource,
  can,
} from "@quercy/core";
import {
  Building2Icon,
  CalendarCheckIcon,
  ChartColumnIcon,
  ClipboardListIcon,
  ContactRoundIcon,
  FactoryIcon,
  FileMinusIcon,
  FileTextIcon,
  FolderKanbanIcon,
  HandshakeIcon,
  ListTodoIcon,
  PackageIcon,
  ReceiptIcon,
  RepeatIcon,
  SlidersHorizontalIcon,
  TimerIcon,
  CreditCardIcon,
  HomeIcon,
  KeyRoundIcon,
  ListPlusIcon,
  type LucideIcon,
  PaletteIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SwatchBookIcon,
  UserIcon,
  UsersIcon,
  UsersRoundIcon,
  TruckIcon,
  FileInputIcon,
  WalletIcon,
  WarehouseIcon,
  ArrowLeftRightIcon,
  CalendarDaysIcon,
  LifeBuoyIcon,
  IdCardIcon,
  PalmtreeIcon,
  LandmarkIcon,
  BanknoteIcon,
  FolderOpenIcon,
  WorkflowIcon,
  PlugIcon,
  MapPinnedIcon,
  FileSignatureIcon,
  SparklesIcon,
  ClipboardCheckIcon,
  CalendarRangeIcon,
  SmartphoneIcon,
  ClockIcon,
  FileSpreadsheetIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  /** Mots-clés supplémentaires pour la palette de commandes. */
  keywords?: string[];
  /** Raccourci de navigation « G puis … ». */
  goKey?: string;
  /** Droit requis pour voir l'écran. */
  permission?: readonly [Resource, Action];
  /** Module auquel appartient l'écran (masqué si le module est désactivé). */
  module?: ModuleKey;
}

export interface NavSection {
  id: string;
  label: string | null;
  items: NavItem[];
}

/** Barre latérale. Un écran n'apparaît ici que lorsqu'il est réellement livré. */
export const SIDEBAR_SECTIONS: NavSection[] = [
  {
    id: "main",
    label: null,
    items: [
      {
        id: "home",
        href: "/",
        label: "Accueil",
        icon: HomeIcon,
        goKey: "h",
        keywords: ["tableau de bord", "widgets", "indicateurs"],
      },
      {
        id: "reports",
        href: "/rapports",
        label: "Rapports",
        icon: ChartColumnIcon,
        goKey: "s",
        keywords: ["statistiques", "graphiques", "analyse", "export", "kpi"],
      },
    ],
  },
];

/** Icône de chaque entité (palette, onglets de fiches, listes). */
export const ENTITY_ICONS: Record<EntityKey, LucideIcon> = {
  company: FactoryIcon,
  contact: ContactRoundIcon,
  deal: HandshakeIcon,
  activity: CalendarCheckIcon,
  product: PackageIcon,
  quote: FileTextIcon,
  order: ClipboardListIcon,
  invoice: ReceiptIcon,
  creditNote: FileMinusIcon,
  recurringInvoice: RepeatIcon,
  project: FolderKanbanIcon,
  task: ListTodoIcon,
  timeEntry: TimerIcon,
  supplier: TruckIcon,
  purchaseOrder: ClipboardListIcon,
  bill: FileInputIcon,
  expense: WalletIcon,
  warehouse: WarehouseIcon,
  stockMovement: ArrowLeftRightIcon,
  event: CalendarDaysIcon,
  ticket: LifeBuoyIcon,
  employee: IdCardIcon,
  leave: PalmtreeIcon,
  bankAccount: LandmarkIcon,
  bankTransaction: BanknoteIcon,
  document: FolderOpenIcon,
  site: MapPinnedIcon,
  cleaningContract: FileSignatureIcon,
  intervention: SparklesIcon,
  inspection: ClipboardCheckIcon,
};

function entityItem(
  id: string,
  href: string,
  label: string,
  entity: EntityKey,
  module: ModuleKey,
  keywords: string[],
  goKey?: string,
): NavItem {
  return {
    id,
    href,
    label,
    icon: ENTITY_ICONS[entity],
    keywords,
    goKey,
    permission: [module, "view"],
    module,
  };
}

/** Modules livrés : leurs écrans ne sont visibles que si le module est activé dans l'espace. */
export const MODULE_SECTIONS: NavSection[] = [
  {
    id: "crm",
    label: "Contacts & CRM",
    items: [
      entityItem(
        "crm-contacts",
        "/crm/contacts",
        "Contacts",
        "contact",
        "crm",
        ["crm", "personnes", "prospects", "clients"],
        "c",
      ),
      entityItem(
        "crm-companies",
        "/crm/entreprises",
        "Entreprises",
        "company",
        "crm",
        ["crm", "sociétés", "comptes", "clients"],
        "e",
      ),
      entityItem(
        "crm-deals",
        "/crm/opportunites",
        "Opportunités",
        "deal",
        "crm",
        ["pipeline", "affaires", "ventes", "kanban"],
        "o",
      ),
      entityItem(
        "crm-activities",
        "/crm/activites",
        "Activités",
        "activity",
        "crm",
        ["appels", "rendez-vous", "relances", "tâches"],
        "a",
      ),
      {
        id: "crm-duplicates",
        href: "/crm/doublons",
        label: "Doublons",
        icon: ListPlusIcon,
        keywords: ["fusion", "fusionner", "dédoublonner"],
        permission: ["crm", "update"],
        module: "crm",
      },
    ],
  },
  {
    id: "sales",
    label: "Ventes & facturation",
    items: [
      entityItem(
        "sales-quotes",
        "/ventes/devis",
        "Devis",
        "quote",
        "sales",
        ["propositions", "offres"],
        "v",
      ),
      entityItem("sales-orders", "/ventes/commandes", "Commandes", "order", "sales", [
        "bons de commande",
      ]),
      entityItem(
        "sales-invoices",
        "/ventes/factures",
        "Factures",
        "invoice",
        "sales",
        ["facturation", "encaissements", "impayés"],
        "f",
      ),
      entityItem("sales-credit-notes", "/ventes/avoirs", "Avoirs", "creditNote", "sales", [
        "remboursements",
        "annulation",
      ]),
      entityItem(
        "sales-recurring",
        "/ventes/recurrentes",
        "Factures récurrentes",
        "recurringInvoice",
        "sales",
        ["abonnements", "mensuel"],
      ),
      entityItem("sales-catalog", "/ventes/catalogue", "Catalogue", "product", "sales", [
        "produits",
        "prestations",
        "articles",
        "tarifs",
      ]),
      {
        id: "sales-accounting-export",
        href: "/ventes/export-comptable",
        label: "Export comptable (FEC)",
        icon: FileSpreadsheetIcon,
        keywords: ["comptabilité", "expert-comptable", "fec", "écritures", "export"],
        permission: ["sales", "export"],
        module: "sales",
      },
      {
        id: "sales-settings",
        href: "/ventes/parametres",
        label: "Paramètres de vente",
        icon: SlidersHorizontalIcon,
        keywords: ["mentions légales", "numérotation", "relances", "iban", "tva", "stripe"],
        permission: ["sales", "admin"],
        module: "sales",
      },
    ],
  },
  {
    id: "cleaning",
    label: "Nettoyage & interventions",
    items: [
      {
        id: "cleaning-planning",
        href: "/nettoyage/planning",
        label: "Planning des agents",
        icon: CalendarRangeIcon,
        keywords: ["semaine", "tournées", "agents", "remplacement", "nettoyage"],
        goKey: "l",
        permission: ["cleaning", "view"],
        module: "cleaning",
      },
      {
        id: "cleaning-my-day",
        href: "/nettoyage/ma-journee",
        label: "Ma journée",
        icon: SmartphoneIcon,
        keywords: ["pointage", "arrivée", "départ", "signature", "mobile", "agent"],
        permission: ["cleaning", "view"],
        module: "cleaning",
      },
      entityItem(
        "cleaning-interventions",
        "/nettoyage/interventions",
        "Interventions",
        "intervention",
        "cleaning",
        ["passages", "ménage", "nettoyage", "prestations"],
        "i",
      ),
      entityItem("cleaning-sites", "/nettoyage/sites", "Sites clients", "site", "cleaning", [
        "adresses",
        "locaux",
        "codes d'accès",
        "clés",
      ]),
      entityItem(
        "cleaning-contracts",
        "/nettoyage/contrats",
        "Contrats d'entretien",
        "cleaningContract",
        "cleaning",
        ["récurrent", "forfait", "abonnement"],
      ),
      entityItem(
        "cleaning-inspections",
        "/nettoyage/controles",
        "Contrôles qualité",
        "inspection",
        "cleaning",
        ["qualité", "audit", "grille", "réclamations"],
      ),
      {
        id: "cleaning-hours",
        href: "/nettoyage/heures",
        label: "Heures et paie",
        icon: ClockIcon,
        keywords: ["heures travaillées", "paie", "dimanche", "nuit", "férié", "export"],
        permission: ["cleaning", "export"],
        module: "cleaning",
      },
    ],
  },
  {
    id: "projects",
    label: "Projets & tâches",
    items: [
      entityItem(
        "projects-list",
        "/projets/liste",
        "Projets",
        "project",
        "projects",
        ["chantiers", "missions", "gantt"],
        "p",
      ),
      entityItem(
        "projects-tasks",
        "/projets/taches",
        "Tâches",
        "task",
        "projects",
        ["kanban", "à faire"],
        "t",
      ),
      entityItem("projects-time", "/projets/temps", "Temps passé", "timeEntry", "projects", [
        "feuilles de temps",
        "chronomètre",
        "heures",
      ]),
    ],
  },
  {
    id: "purchases",
    label: "Achats & dépenses",
    items: [
      entityItem(
        "purchases-suppliers",
        "/achats/fournisseurs",
        "Fournisseurs",
        "supplier",
        "purchases",
        ["prestataires"],
      ),
      entityItem(
        "purchases-orders",
        "/achats/commandes",
        "Commandes fournisseurs",
        "purchaseOrder",
        "purchases",
        ["bons de commande", "achats"],
      ),
      entityItem(
        "purchases-bills",
        "/achats/factures",
        "Factures fournisseurs",
        "bill",
        "purchases",
        ["à payer", "dépenses"],
      ),
      entityItem(
        "purchases-expenses",
        "/achats/notes-de-frais",
        "Notes de frais",
        "expense",
        "purchases",
        ["frais", "remboursements"],
      ),
    ],
  },
  {
    id: "inventory",
    label: "Stocks",
    items: [
      entityItem(
        "inventory-products",
        "/ventes/catalogue",
        "Articles et stocks",
        "product",
        "sales",
        ["inventaire", "quantités"],
      ),
      entityItem(
        "inventory-movements",
        "/stocks/mouvements",
        "Mouvements",
        "stockMovement",
        "inventory",
        ["entrées", "sorties", "inventaire"],
      ),
      entityItem(
        "inventory-warehouses",
        "/stocks/entrepots",
        "Entrepôts",
        "warehouse",
        "inventory",
        ["dépôts", "magasins"],
      ),
    ],
  },
  {
    id: "calendar",
    label: "Agenda",
    items: [
      entityItem("calendar-events", "/agenda/evenements", "Agenda", "event", "calendar", [
        "rendez-vous",
        "calendrier",
        "planning",
      ]),
    ],
  },
  {
    id: "support",
    label: "Support",
    items: [
      entityItem("support-tickets", "/support/tickets", "Tickets", "ticket", "support", [
        "sav",
        "demandes",
        "assistance",
      ]),
    ],
  },
  {
    id: "hr",
    label: "Ressources humaines",
    items: [
      entityItem("hr-employees", "/rh/salaries", "Salariés", "employee", "hr", [
        "personnel",
        "équipe",
      ]),
      entityItem("hr-leaves", "/rh/absences", "Congés et absences", "leave", "hr", [
        "congés",
        "rtt",
        "maladie",
      ]),
    ],
  },
  {
    id: "treasury",
    label: "Trésorerie",
    items: [
      entityItem(
        "treasury-accounts",
        "/tresorerie/comptes",
        "Comptes bancaires",
        "bankAccount",
        "treasury",
        ["banque", "soldes"],
      ),
      entityItem(
        "treasury-transactions",
        "/tresorerie/operations",
        "Opérations",
        "bankTransaction",
        "treasury",
        ["relevés", "rapprochement", "encaissements"],
      ),
    ],
  },
  {
    id: "documents",
    label: "Documents",
    items: [
      entityItem(
        "documents-library",
        "/documents/bibliotheque",
        "Documents",
        "document",
        "documents",
        ["ged", "fichiers", "contrats"],
      ),
    ],
  },
  {
    id: "platform",
    label: "Automatisations & intégrations",
    items: [
      {
        id: "automations",
        href: "/automatisations",
        label: "Automatisations",
        icon: WorkflowIcon,
        keywords: ["règles", "workflow", "déclencheurs"],
        permission: ["automations", "admin"],
        module: "automations",
      },
      {
        id: "integrations",
        href: "/integrations",
        label: "Intégrations",
        icon: PlugIcon,
        keywords: ["api", "webhooks", "zapier", "make", "clés", "ical", "agenda"],
        permission: ["integrations", "admin"],
        module: "integrations",
      },
    ],
  },
];

/** Entrée « Réglages » en pied de barre latérale. */
export const SETTINGS_ENTRY: NavItem = {
  id: "settings",
  href: "/reglages/profil",
  label: "Réglages",
  icon: SettingsIcon,
  goKey: "r",
  keywords: ["paramètres", "préférences"],
};

/** Sous-navigation des réglages. */
export const SETTINGS_SECTIONS: NavSection[] = [
  {
    id: "account",
    label: "Mon compte",
    items: [
      {
        id: "profile",
        href: "/reglages/profil",
        label: "Profil",
        icon: UserIcon,
        keywords: ["nom", "compte"],
      },
      {
        id: "security",
        href: "/reglages/securite",
        label: "Sécurité",
        icon: ShieldCheckIcon,
        keywords: [
          "mot de passe",
          "2fa",
          "double authentification",
          "sessions",
          "supprimer mon compte",
        ],
      },
      {
        id: "appearance",
        href: "/reglages/apparence",
        label: "Apparence",
        icon: PaletteIcon,
        keywords: ["thème", "sombre", "clair", "couleur", "accent"],
      },
    ],
  },
  {
    id: "workspace",
    label: "Espace",
    items: [
      {
        id: "workspace-general",
        href: "/reglages/espace",
        label: "Général",
        icon: Building2Icon,
        keywords: ["entreprise", "modules", "devise", "fuseau", "export", "rgpd"],
        permission: ["settings", "view"],
      },
      {
        id: "members",
        href: "/reglages/membres",
        label: "Membres",
        icon: UsersIcon,
        keywords: ["inviter", "invitation", "utilisateurs", "équipe"],
        goKey: "m",
        permission: ["members", "view"],
      },
      {
        id: "teams",
        href: "/reglages/equipes",
        label: "Équipes",
        icon: UsersRoundIcon,
        keywords: ["services", "groupes"],
        permission: ["members", "view"],
      },
      {
        id: "custom-fields",
        href: "/reglages/champs",
        label: "Champs personnalisés",
        icon: ListPlusIcon,
        keywords: ["champs", "attributs", "personnalisation"],
        permission: ["settings", "admin"],
      },
      {
        id: "roles",
        href: "/reglages/roles",
        label: "Rôles et permissions",
        icon: KeyRoundIcon,
        keywords: ["droits", "accès"],
        permission: ["settings", "admin"],
      },
      {
        id: "billing",
        href: "/reglages/facturation",
        label: "Facturation",
        icon: CreditCardIcon,
        keywords: ["abonnement", "offre", "paiement", "factures", "stripe", "plan"],
        permission: ["billing", "view"],
      },
      {
        id: "audit",
        href: "/reglages/audit",
        label: "Journal d'audit",
        icon: ScrollTextIcon,
        keywords: ["historique", "traçabilité"],
        permission: ["audit", "view"],
      },
    ],
  },
  {
    id: "resources",
    label: "Ressources",
    items: [
      {
        id: "design-system",
        href: "/design-system",
        label: "Design system",
        icon: SwatchBookIcon,
        keywords: ["composants", "jetons", "tokens", "couleurs", "typographie"],
        goKey: "d",
      },
    ],
  },
];

const SETTINGS_ITEMS = SETTINGS_SECTIONS.flatMap((s) => s.items);

/** Tous les écrans (palette de commandes, fil d'Ariane, raccourcis). */
export const NAV_ITEMS: NavItem[] = [
  ...SIDEBAR_SECTIONS.flatMap((s) => s.items),
  ...MODULE_SECTIONS.flatMap((s) => s.items),
  SETTINGS_ENTRY,
  ...SETTINGS_ITEMS,
];

export function isAllowed(
  item: NavItem,
  permissions: PermissionMatrix,
  modules?: readonly ModuleKey[],
): boolean {
  if (item.module && modules && !modules.includes(item.module)) return false;
  return !item.permission || can(permissions, item.permission[0], item.permission[1]);
}

export function filterSections(
  sections: NavSection[],
  permissions: PermissionMatrix,
  modules?: readonly ModuleKey[],
): NavSection[] {
  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => isAllowed(i, permissions, modules)) }))
    .filter((s) => s.items.length > 0);
}

function matches(item: NavItem, pathname: string): boolean {
  return item.href === "/"
    ? pathname === "/"
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Écran actif pour un chemin (correspondance la plus longue, hors entrée « Réglages »). */
export function activeNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.filter((item) => item !== SETTINGS_ENTRY && matches(item, pathname)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}

export function isSettingsPath(pathname: string): boolean {
  const item = activeNavItem(pathname);
  return Boolean(item && SETTINGS_ITEMS.includes(item));
}

export interface Crumb {
  label: string;
  href?: string;
}

/** Fil d'Ariane d'un chemin. */
export function breadcrumbFor(pathname: string): Crumb[] {
  const item = activeNavItem(pathname);
  if (!item) return [];
  const moduleSection = MODULE_SECTIONS.find((s) => s.items.includes(item));
  if (moduleSection?.label) {
    return [{ label: moduleSection.label }, { label: item.label, href: item.href }];
  }
  if (SETTINGS_ITEMS.includes(item)) {
    return [
      { label: SETTINGS_ENTRY.label, href: SETTINGS_ENTRY.href },
      { label: item.label, href: item.href },
    ];
  }
  return [{ label: item.label, href: item.href }];
}
