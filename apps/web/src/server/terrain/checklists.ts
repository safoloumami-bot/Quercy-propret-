/**
 * Grilles de contrôle qualité de l'application terrain, pièce par pièce.
 * Un point « critique » non validé bloque la clôture tant qu'un motif n'est pas écrit.
 * La grille est choisie d'après la prestation (et le nom du site).
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
    consommables: [
      { l: "Sacs poubelle 30 L", u: "unité" },
      { l: "Papier toilette", u: "rouleau" },
      { l: "Essuie-tout", u: "rouleau" },
      { l: "Gel douche / savon", u: "flacon" },
      { l: "Produit sol désinfectant", u: "dose" },
    ],
  },
  {
    key: "bureaux",
    label: "Bureaux",
    pieces: [
      {
        n: "Postes de travail",
        items: [
          item("Bureaux et plans dépoussiérés (sans déplacer les documents)"),
          item("Téléphones, poignées et interrupteurs désinfectés"),
          item("Corbeilles vidées, sacs remplacés"),
        ],
      },
      {
        n: "Sanitaires",
        items: [
          item("Cuvettes, urinoirs et lavabos désinfectés", true),
          item("Distributeurs réapprovisionnés (savon, papier)", true),
          item("Miroirs et carrelage sans traces"),
          item("Sol lavé"),
        ],
      },
      {
        n: "Cuisine / espace pause",
        items: [
          item("Plan de travail, évier et tables désinfectés", true),
          item("Micro-ondes et façade du réfrigérateur"),
        ],
      },
      {
        n: "Circulations et accueil",
        items: [
          item("Sols aspirés ou balayés puis lavés"),
          item("Portes vitrées et traces de doigts"),
        ],
      },
      {
        n: "Sortie",
        items: [
          item("Tri des déchets sorti au local"),
          item("Lumières éteintes, fenêtres fermées", true),
          item("Alarme activée, porte verrouillée", true),
        ],
      },
    ],
    consommables: [
      { l: "Sacs poubelle 50 L", u: "unité" },
      { l: "Papier toilette", u: "rouleau" },
      { l: "Essuie-mains", u: "paquet" },
      { l: "Savon mains", u: "recharge" },
      { l: "Produit sol", u: "dose" },
    ],
  },
  {
    key: "parties-communes",
    label: "Parties communes",
    pieces: [
      {
        n: "Hall d'entrée",
        items: [
          item("Sol balayé puis lavé"),
          item("Vitres de la porte d'entrée"),
          item("Boîtes aux lettres et interphone dépoussiérés"),
        ],
      },
      {
        n: "Escaliers et paliers",
        items: [
          item("Marches et paliers balayés puis lavés"),
          item("Rampes et mains courantes désinfectées"),
        ],
      },
      { n: "Ascenseur", items: [item("Cabine, miroir et boutons nettoyés")] },
      {
        n: "Local poubelles",
        items: [
          item("Bacs sortis ou rentrés selon le jour de collecte", true),
          item("Sol du local lavé, odeurs contrôlées"),
        ],
      },
      {
        n: "Sortie",
        items: [
          item("Éclairage des communs vérifié (ampoule à signaler)"),
          item("Portes refermées", true),
        ],
      },
    ],
    consommables: [
      { l: "Sacs poubelle 100 L", u: "unité" },
      { l: "Produit sol", u: "dose" },
      { l: "Désinfectant surfaces", u: "dose" },
    ],
  },
  {
    key: "remise-en-etat",
    label: "Remise en état / fin de chantier",
    pieces: [
      {
        n: "Gros œuvre",
        items: [
          item("Gravats et emballages évacués", true),
          item("Traces de plâtre, peinture et colle retirées"),
        ],
      },
      {
        n: "Menuiseries et vitres",
        items: [
          item("Vitres, cadres et rails nettoyés"),
          item("Étiquettes et films de protection retirés"),
        ],
      },
      {
        n: "Sanitaires et cuisine",
        items: [
          item("Appareils sanitaires désinfectés", true),
          item("Meubles intérieurs et extérieurs nettoyés"),
        ],
      },
      {
        n: "Sols",
        items: [item("Sols aspirés puis lavés deux fois"), item("Plinthes et seuils nettoyés")],
      },
      {
        n: "Sortie",
        items: [
          item("Tour final avec le client ou le chef de chantier"),
          item("Clés rendues, accès refermés", true),
        ],
      },
    ],
    consommables: [
      { l: "Sacs gravats", u: "unité" },
      { l: "Décapant", u: "flacon" },
      { l: "Lame de grattoir", u: "unité" },
      { l: "Produit sol", u: "dose" },
    ],
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
