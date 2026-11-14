/**
 * Grilles de contrôle qualité de l'application terrain, pièce par pièce.
 * Un point « critique » non validé bloque la clôture tant qu'un motif n'est pas écrit.
 * La grille est choisie d'après la prestation (et le nom du site). Contenu repris de
 * l'application de référence (v15) : quatre modèles, mêmes consommables.
 */

export interface ChecklistItem {
  l: string;
  crit: boolean;
}
export interface ChecklistRoom {
  n: string;
  items: ChecklistItem[];
}
export interface Consumable {
  l: string;
  u: string;
}
export interface Checklist {
  key: string;
  label: string;
  pieces: ChecklistRoom[];
  consommables: Consumable[];
}

const item = (l: string, crit = false): ChecklistItem => ({ l, crit });

const CONSOMMABLES: Consumable[] = [
  { l: "Sacs poubelle 30 L", u: "unité" },
  { l: "Sacs poubelle 100 L", u: "unité" },
  { l: "Papier toilette", u: "rouleau" },
  { l: "Essuie-tout", u: "rouleau" },
  { l: "Savon mains", u: "flacon" },
  { l: "Gel douche", u: "flacon" },
  { l: "Produit sol désinfectant", u: "dose" },
  { l: "Dégraissant cuisine", u: "dose" },
];

export const CHECKLISTS: Checklist[] = [
  {
    key: "logement",
    label: "Logement meublé",
    pieces: [
      {
        n: "Chambres",
        items: [
          item("Lits refaits, linge propre et sans plis"),
          item("Poussières, surfaces et poignées"),
          item("Sols aspirés puis lavés"),
        ],
      },
      {
        n: "Salle de bain",
        items: [
          item("Cuvette, robinetterie et joints désinfectés", true),
          item("Douche détartrée, paroi sans traces"),
          item("Miroir et surfaces"),
          item("Consommables réapprovisionnés"),
        ],
      },
      {
        n: "Cuisine",
        items: [
          item("Plan de travail et évier désinfectés", true),
          item("Four, réfrigérateur, micro-ondes"),
          item("Vaisselle rangée, lave-vaisselle vidé"),
        ],
      },
      {
        n: "Séjour",
        items: [
          item("Sols aspirés puis lavés, plinthes comprises"),
          item("Vitres intérieures et miroirs"),
        ],
      },
      {
        n: "Sortie",
        items: [
          item("Poubelles vidées, sacs remplacés, local propre", true),
          item("Aération, contrôle des odeurs"),
          item("Clés replacées en boîte, code brouillé", true),
        ],
      },
    ],
    consommables: CONSOMMABLES,
  },
  {
    key: "bureaux",
    label: "Bureaux et locaux",
    pieces: [
      {
        n: "Postes de travail",
        items: [
          item("Bureaux, écrans et téléphones dépoussiérés"),
          item("Corbeilles vidées, sacs remplacés"),
          item("Sols aspirés"),
        ],
      },
      {
        n: "Sanitaires",
        items: [
          item("Cuvettes et urinoirs désinfectés", true),
          item("Lavabos, robinetterie et miroirs"),
          item("Savon, papier et essuie-mains réapprovisionnés", true),
          item("Sols lavés et désinfectés"),
        ],
      },
      {
        n: "Espace détente",
        items: [
          item("Plan de travail et évier"),
          item("Micro-ondes et réfrigérateur"),
          item("Machine à café détartrée et vidée"),
        ],
      },
      {
        n: "Circulations",
        items: [
          item("Hall, couloirs et escaliers"),
          item("Portes vitrées et traces de mains"),
          item("Interrupteurs et points de contact désinfectés", true),
        ],
      },
      {
        n: "Fermeture",
        items: [
          item("Déchets évacués au local"),
          item("Lumières éteintes, locaux fermés", true),
          item("Alarme réenclenchée", true),
        ],
      },
    ],
    consommables: CONSOMMABLES,
  },
  {
    key: "remise-en-etat",
    label: "Remise en état",
    pieces: [
      {
        n: "Cuisine",
        items: [
          item("Dégraissage complet des meubles hauts et bas", true),
          item("Hotte, filtres et four décapés", true),
          item("Placards vidés, nettoyés intérieur et extérieur"),
          item("Carrelage mural et joints"),
        ],
      },
      {
        n: "Sanitaires",
        items: [
          item("Détartrage complet, robinetterie et joints", true),
          item("Traitement des moisissures"),
          item("Évacuations dégagées"),
        ],
      },
      {
        n: "Sols et murs",
        items: [
          item("Sols décapés puis protégés"),
          item("Plinthes, portes et chambranles"),
          item("Traces sur les murs traitées"),
        ],
      },
      {
        n: "Menuiseries",
        items: [
          item("Vitrages intérieurs et extérieurs accessibles"),
          item("Rails, joints et volets"),
        ],
      },
      {
        n: "Finitions",
        items: [
          item("Interrupteurs, prises et radiateurs"),
          item("Encombrants évacués", true),
          item("Contrôle final pièce par pièce", true),
        ],
      },
    ],
    consommables: CONSOMMABLES,
  },
  {
    key: "parties-communes",
    label: "Parties communes",
    pieces: [
      {
        n: "Hall et entrée",
        items: [
          item("Sol lavé, paillasson nettoyé"),
          item("Boîtes aux lettres et interphone dépoussiérés"),
          item("Portes vitrées sans traces"),
        ],
      },
      {
        n: "Escaliers et paliers",
        items: [
          item("Marches et contremarches"),
          item("Rampes désinfectées", true),
          item("Paliers et portes palières"),
        ],
      },
      {
        n: "Local poubelles",
        items: [
          item("Containers sortis et rentrés", true),
          item("Sol lavé et désinfecté", true),
          item("Local désodorisé"),
        ],
      },
      {
        n: "Abords",
        items: [item("Entrée extérieure balayée"), item("Local vélos et parking")],
      },
      {
        n: "Contrôles",
        items: [
          item("Ampoules grillées signalées"),
          item("Dégradations relevées et photographiées"),
        ],
      },
    ],
    consommables: CONSOMMABLES,
  },
];

const RULES: [RegExp, string][] = [
  [/remise en [ée]tat|fin de chantier|apr[eè]s travaux/i, "remise-en-etat"],
  [/parties? communes?|copropri|immeuble|r[ée]sidence|syndic|hall/i, "parties-communes"],
  [
    /bureau|locaux|entreprise|agence|cabinet|mairie|magasin|commerce|showroom|[ée]cole|scolaire|gymnase|entrep[ôo]t|usine|atelier|clinique|h[ôo]pital|ehpad|m[ée]dical|banque|cr[ée]dit/i,
    "bureaux",
  ],
];

/** Grille adaptée à la prestation ; logement meublé par défaut. */
export function checklistFor(...texts: (string | null | undefined)[]): Checklist {
  const text = texts.filter(Boolean).join(" ");
  const key = RULES.find(([re]) => re.test(text))?.[1] ?? "logement";
  return CHECKLISTS.find((c) => c.key === key) ?? CHECKLISTS[0]!;
}
