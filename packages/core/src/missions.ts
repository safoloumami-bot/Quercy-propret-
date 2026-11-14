/**
 * Fiches mission : bibliothèque de tâches par zone, fréquences, et tâches dues un jour donné.
 * Une fiche mission (par site, éventuellement par prestation) liste les tâches à cocher ; seules
 * celles qui sont dues ce jour-là s'affichent dans l'application terrain.
 */

import { isoWeekday } from "./recurrence-engine";

export const TASK_FREQUENCIES = [
  { value: "each_visit", label: "À chaque passage" },
  { value: "weekly", label: "Une fois par semaine" },
  { value: "monthly", label: "Une fois par mois" },
  { value: "quarterly", label: "Une fois par trimestre" },
] as const;
export type TaskFrequency = (typeof TASK_FREQUENCIES)[number]["value"];

export function taskFrequencyLabel(value: string): string {
  return TASK_FREQUENCIES.find((f) => f.value === value)?.label ?? value;
}

/** Méthode standard, reprise de la fiche mission de la V12. */
export const DEFAULT_PROCEDURE = [
  "Méthode standard : du haut vers le bas, du plus propre au plus sale, du fond vers la sortie.",
  "1. Aérer, vider les poubelles et ramasser les déchets.",
  "2. Dépoussiérer les points hauts, puis les surfaces et les points de contact (poignées, interrupteurs).",
  "3. Nettoyer et désinfecter les sanitaires.",
  "4. Aspirer ou balayer, puis laver les sols en reculant vers la sortie.",
  "5. Contrôler, prendre les photos demandées, refermer et signaler toute anomalie.",
].join("\n");

export interface LibraryTask {
  label: string;
  frequency: TaskFrequency;
  critical: boolean;
  photo: boolean;
}

const t = (
  label: string,
  frequency: TaskFrequency = "each_visit",
  opts: { critical?: boolean; photo?: boolean } = {},
): LibraryTask => ({
  label,
  frequency,
  critical: opts.critical ?? false,
  photo: opts.photo ?? false,
});

/** Bibliothèque de tâches, par zone. Chaque fiche mission y pioche et l'adapte. */
export const TASK_LIBRARY: { zone: string; tasks: LibraryTask[] }[] = [
  {
    zone: "Bureaux",
    tasks: [
      t("Vider les corbeilles et remplacer les sacs"),
      t("Dépoussiérer bureaux et plans de travail dégagés"),
      t("Désinfecter téléphones, claviers et souris", "weekly"),
      t("Nettoyer poignées, interrupteurs et points de contact", "each_visit", { critical: true }),
      t("Aspirer moquettes ou balayer les sols"),
      t("Laver les sols durs", "weekly"),
      t("Dépoussiérer rebords, plinthes et radiateurs", "monthly"),
      t("Nettoyer les traces sur les portes et cloisons vitrées", "weekly"),
    ],
  },
  {
    zone: "Ateliers",
    tasks: [
      t("Vider les poubelles et bacs de tri"),
      t("Balayer ou aspirer les allées de circulation"),
      t("Laver les sols à l'autolaveuse", "weekly"),
      t("Dégraisser les zones de passage et abords de machines", "monthly"),
      t("Nettoyer les points d'eau et lave-mains", "each_visit", { critical: true }),
      t("Dépoussiérer les étagères et rayonnages accessibles", "monthly"),
    ],
  },
  {
    zone: "Cuisine",
    tasks: [
      t("Désinfecter plans de travail, évier et tables", "each_visit", {
        critical: true,
        photo: true,
      }),
      t("Nettoyer façades, micro-ondes et électroménager"),
      t("Vider et désinfecter les poubelles", "each_visit", { critical: true }),
      t("Laver les sols"),
      t("Nettoyer l'intérieur du réfrigérateur", "weekly"),
      t("Détartrer bouilloire et machine à café", "monthly"),
      t("Dégraisser crédence et hotte", "monthly"),
    ],
  },
  {
    zone: "WC et sanitaires",
    tasks: [
      t("Désinfecter cuvettes, urinoirs et abattants", "each_visit", {
        critical: true,
        photo: true,
      }),
      t("Désinfecter lavabos, robinetterie et miroirs", "each_visit", { critical: true }),
      t("Réapprovisionner papier, savon et essuie-mains", "each_visit", { critical: true }),
      t("Vider les poubelles et poubelles hygiéniques", "each_visit", { critical: true }),
      t("Laver et désinfecter les sols"),
      t("Nettoyer portes, poignées et cloisons"),
      t("Détartrer cuvettes et robinetterie", "weekly"),
      t("Lessiver faïences et carrelages muraux", "monthly"),
    ],
  },
  {
    zone: "Vestiaires",
    tasks: [
      t("Désinfecter bancs, poignées et casiers (extérieur)"),
      t("Nettoyer et désinfecter les douches", "each_visit", { critical: true }),
      t("Vider les poubelles"),
      t("Laver et désinfecter les sols"),
      t("Détartrer douches et robinetterie", "weekly"),
    ],
  },
  {
    zone: "Escaliers et cages",
    tasks: [
      t("Balayer ou aspirer marches et paliers", "each_visit", { photo: true }),
      t("Laver marches et paliers"),
      t("Essuyer rampes et mains courantes", "each_visit", { critical: true }),
      t("Nettoyer portes palières et poignées", "weekly"),
      t("Dépoussiérer plinthes, compteurs et rebords", "monthly"),
      t("Nettoyer les vitres des paliers", "quarterly"),
    ],
  },
  {
    zone: "Halls",
    tasks: [
      t("Balayer et laver le sol du hall", "each_visit", { photo: true }),
      t("Nettoyer les vitres de la porte d'entrée", "each_visit", { critical: true }),
      t("Nettoyer boîtes aux lettres et interphone"),
      t("Secouer ou aspirer les tapis"),
      t("Dépoussiérer luminaires et rebords", "monthly"),
    ],
  },
  {
    zone: "Ascenseurs",
    tasks: [
      t("Nettoyer le sol de la cabine", "each_visit", { photo: true }),
      t("Nettoyer miroir, parois et boutons", "each_visit", { critical: true }),
      t("Nettoyer les portes palières d'ascenseur", "weekly"),
      t("Aspirer les rainures de seuil", "weekly"),
    ],
  },
  {
    zone: "Parkings",
    tasks: [
      t("Ramasser les déchets et dépôts"),
      t("Balayer les allées et rampes", "weekly"),
      t("Nettoyer les portes et sas d'accès", "weekly"),
      t("Laver les sols à l'autolaveuse", "quarterly"),
      t("Signaler les éclairages défectueux", "each_visit", { critical: true }),
    ],
  },
  {
    zone: "Vitres",
    tasks: [
      t("Vitres intérieures accessibles", "monthly", { photo: true }),
      t("Vitres extérieures accessibles sans risque", "quarterly", { photo: true }),
      t("Encadrements et rebords de fenêtres", "quarterly"),
      t("Portes vitrées et traces de doigts", "weekly"),
    ],
  },
  {
    zone: "Locaux poubelles",
    tasks: [
      t("Sortir et rentrer les conteneurs aux jours de collecte", "each_visit", {
        critical: true,
        photo: true,
      }),
      t("Balayer et laver le sol du local"),
      t("Laver et désinfecter les conteneurs", "monthly", { photo: true }),
      t("Signaler les encombrants déposés", "each_visit", { critical: true }),
    ],
  },
  {
    zone: "Extérieurs",
    tasks: [
      t("Ramasser papiers et déchets aux abords"),
      t("Balayer l'entrée, le perron et les accès"),
      t("Vider les corbeilles extérieures"),
      t("Désherber les accès", "monthly"),
      t("Nettoyer la signalétique et les plaques", "quarterly"),
    ],
  },
  {
    zone: "Salles de réunion",
    tasks: [
      t("Remettre en place tables et chaises"),
      t("Nettoyer tables et tableaux blancs"),
      t("Vider les corbeilles"),
      t("Aspirer ou laver les sols"),
      t("Désinfecter télécommandes et matériel partagé", "weekly"),
    ],
  },
  {
    zone: "Chambres",
    tasks: [
      t("Refaire les lits, linge propre et sans plis", "each_visit", {
        critical: true,
        photo: true,
      }),
      t("Dépoussiérer surfaces, poignées et luminaires"),
      t("Aspirer puis laver les sols"),
      t("Vider les corbeilles"),
      t("Aspirer sous les lits et derrière les meubles", "monthly"),
    ],
  },
  {
    zone: "Remise en état",
    tasks: [
      t("Décaper et protéger les sols", "quarterly", { photo: true }),
      t("Lessiver murs, portes et plinthes", "quarterly"),
      t("Nettoyer les luminaires et bouches d'aération", "quarterly"),
      t("Nettoyer l'intérieur des placards et rangements", "quarterly"),
      t("Évacuer les déchets et gravats", "each_visit", { critical: true, photo: true }),
    ],
  },
];

export const MISSION_ZONES = TASK_LIBRARY.map((z) => z.zone);

/* ----------------------------------------------------------- tâches dues */

const monday = (d: Date) => {
  const m = new Date(d);
  m.setUTCDate(m.getUTCDate() - (isoWeekday(d) - 1));
  return m.toISOString().slice(0, 10);
};
const PERIOD: Record<TaskFrequency, ((d: Date) => string) | null> = {
  each_visit: null,
  weekly: monday,
  monthly: (d) => d.toISOString().slice(0, 7),
  quarterly: (d) => `${d.getUTCFullYear()}-T${Math.floor(d.getUTCMonth() / 3) + 1}`,
};

/**
 * Une tâche est due si c'est la première visite de sa période (semaine ISO, mois, trimestre) :
 * aucun passage antérieur de la même mission dans la même période.
 */
export function taskDue(frequency: string, day: Date, previousVisits: Date[]): boolean {
  const key = PERIOD[frequency as TaskFrequency];
  if (!key) return true;
  const current = key(day);
  return !previousVisits.some((p) => p < day && key(p) === current);
}

/** Début de la plus longue période (trimestre) : au-delà, les passages antérieurs sont inutiles. */
export function dueLookbackStart(day: Date): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), Math.floor(day.getUTCMonth() / 3) * 3, 1));
}

/* ------------------------------------------------------ import / export Excel */

/** Colonnes du fichier Excel des tâches (export, puis réimport après retouche). */
export const MISSION_TASK_COLUMNS = ["Zone", "Tâche", "Fréquence", "Critique", "Photo obligatoire"];

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function parseFrequency(value: string): TaskFrequency | null {
  const v = norm(value);
  if (!v) return "each_visit";
  const exact = TASK_FREQUENCIES.find((f) => norm(f.label) === v || f.value === v);
  if (exact) return exact.value;
  if (/passage|chaque|toujours|quotid/.test(v)) return "each_visit";
  if (/hebdo|semaine/.test(v)) return "weekly";
  if (/trimestr/.test(v)) return "quarterly";
  if (/mensu|mois/.test(v)) return "monthly";
  return null;
}

const truthy = (v: string) => /^(oui|o|x|1|true|vrai|yes)$/.test(norm(v));

export interface ParsedMissionTasks {
  tasks: {
    zone: string;
    label: string;
    frequency: TaskFrequency;
    critical: boolean;
    photoRequired: boolean;
  }[];
  errors: string[];
}

/** Lit les lignes d'un fichier Excel des tâches (en-têtes souples, fréquences en clair). */
export function parseMissionTasks(headers: string[], rows: string[][]): ParsedMissionTasks {
  const find = (re: RegExp) => headers.findIndex((h) => re.test(norm(h)));
  const col = {
    zone: find(/^zone|piece|espace/),
    label: find(/^tache|libelle|intitule/),
    frequency: find(/frequence|periodicite/),
    critical: find(/critique/),
    photo: find(/photo/),
  };
  const errors: string[] = [];
  if (col.zone < 0 || col.label < 0) {
    errors.push("Colonnes « Zone » et « Tâche » introuvables dans la première ligne.");
    return { tasks: [], errors };
  }
  const tasks: ParsedMissionTasks["tasks"] = [];
  rows.forEach((row, i) => {
    const cell = (k: number) => (k >= 0 ? String(row[k] ?? "").trim() : "");
    const zone = cell(col.zone);
    const label = cell(col.label);
    if (!zone && !label) return;
    if (!zone || !label) {
      errors.push(`Ligne ${i + 2} : zone ou tâche manquante.`);
      return;
    }
    const frequency = parseFrequency(cell(col.frequency));
    if (!frequency) {
      errors.push(`Ligne ${i + 2} : fréquence « ${cell(col.frequency)} » non reconnue.`);
      return;
    }
    tasks.push({
      zone: zone.slice(0, 80),
      label: label.slice(0, 200),
      frequency,
      critical: truthy(cell(col.critical)),
      photoRequired: truthy(cell(col.photo)),
    });
  });
  return { tasks, errors };
}
