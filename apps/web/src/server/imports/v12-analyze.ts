import {
  type RecurrenceRule,
  addDays,
  dayKey,
  describeRule,
  isoWeekday,
  parseDay,
  recurrenceRuleSchema,
} from "@quercy/core";

/**
 * Lecture du fichier Excel « Pilotage automatique V12 » (prototype métier) : sites,
 * intervenants, tournées et passages déjà réalisés. Rien n'est inventé :
 * - le nom d'un site vient de la colonne « Nom du site », jamais de la ville ;
 * - les « 0 » et « À compléter » deviennent des champs vides, signalés ;
 * - la règle de récurrence est **proposée** d'après les colonnes de récurrence, jamais déduite
 *   des dates de passage (certaines ont été modifiées à la main) ; elle doit être validée.
 */

export type SheetData = { sheet: string; data: unknown[][] };

export interface V12Site {
  code: string;
  activity: string | null;
  activityLabel: string;
  client: string | null;
  name: string;
  address: string | null;
  city: string | null;
  frequency: string | null;
  startTime: string | null;
  durationMinutes: number | null;
  agent: string | null;
  tour: string | null;
  replacement1: string | null;
  replacement2: string | null;
  active: boolean;
  accessKeys: string | null;
  instructions: string | null;
  openingHours: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  /** Toutes les autres colonnes renseignées (fiche de site), par intitulé d'origine. */
  details: Record<string, string>;
  /** Colonnes « À compléter » : signalées, jamais inventées. */
  toComplete: string[];
  proposal: { rule: RecurrenceRule; effectiveFrom: string; description: string } | null;
  warnings: string[];
}

export interface V12Agent {
  code: string | null;
  name: string;
  status: string | null;
  activities: string | null;
  zone: string | null;
  hourlyCost: number | null;
  replacement1: string | null;
  replacement2: string | null;
  /** Le dirigeant est la personne qui importe. */
  isLeader: boolean;
}

export interface V12Tour {
  code: string;
  name: string | null;
  zone: string | null;
  agent: string | null;
  replacement: string | null;
}

export interface V12Passage {
  siteCode: string;
  date: string;
  status: "done" | "cancelled" | "access_impossible";
  plannedAgent: string | null;
  actualAgent: string | null;
  startTime: string | null;
  durationMinutes: number | null;
  observation: string | null;
}

export interface V12Analysis {
  sites: V12Site[];
  agents: V12Agent[];
  tours: V12Tour[];
  history: V12Passage[];
  warnings: string[];
}

/* ------------------------------------------------------------------ cellules */

const TO_COMPLETE = /^(à|a)\s+compl[ée]ter$/i;

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return null;
  const s = String(value).trim();
  if (s === "" || s === "0" || TO_COMPLETE.test(s)) return null;
  return s;
}

function number(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value !== 0) return value;
  const s = text(value);
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n !== 0 ? n : null;
}

/** Jour : date Excel, numéro de série Excel ou « JJ/MM/AAAA ». */
function day(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getUTCFullYear() > 1900 ? dayKey(value) : null;
  }
  if (typeof value === "number" && value > 20000 && value < 80000) {
    return dayKey(addDays(parseDay("1899-12-30"), Math.floor(value)));
  }
  const s = text(value);
  const fr = s?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2]!.padStart(2, "0")}-${fr[1]!.padStart(2, "0")}`;
  if (s && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

/** Heure : cellule horaire Excel (1899-12-30T14:00), fraction de jour ou « 14:00 ». */
function clock(value: unknown): string | null {
  let minutes: number | null = null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    minutes = value.getUTCHours() * 60 + value.getUTCMinutes();
  } else if (typeof value === "number" && value > 0 && value < 1) {
    minutes = Math.round(value * 24 * 60);
  } else {
    const m = text(value)?.match(/^(\d{1,2})[:h](\d{2})/);
    if (m) minutes = Number(m[1]) * 60 + Number(m[2]);
  }
  if (minutes === null || minutes <= 0 || minutes >= 24 * 60) return null;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

const yes = (value: unknown) => /^oui$/i.test(text(value) ?? "");

/* ------------------------------------------------------------------ feuilles */

/** Lignes d'une feuille, indexées par intitulé de colonne (ligne d'en-tête repérée). */
function rows(sheets: SheetData[], name: string, firstHeader: string) {
  const sheet = sheets.find((s) => s.sheet.trim().toLowerCase() === name.toLowerCase());
  if (!sheet) return null;
  const headerIndex = sheet.data.findIndex((r) => text(r?.[0]) === firstHeader);
  if (headerIndex < 0) return null;
  const headers = sheet.data[headerIndex]!.map((h) => (h === null ? "" : String(h).trim()));
  return sheet.data
    .slice(headerIndex + 1)
    .filter((r) => r && r.some((v) => v !== null && v !== ""))
    .map(
      (r) =>
        Object.fromEntries(headers.map((h, i) => [h, r[i] ?? null])) as Record<string, unknown>,
    );
}

/* ------------------------------------------------------------------ règles */

const WEEKDAYS: Record<string, number> = {
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  dimanche: 7,
};
const WEEKDAY_NAMES = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function weekdaysOf(value: string | null): number[] {
  if (!value) return [];
  const found = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z]+/)
    .map((w) => WEEKDAYS[w])
    .filter((d): d is number => Boolean(d));
  return [...new Set(found)].sort();
}

function weeksOf(value: string | null): (1 | 2 | 3 | 4 | 5 | -1)[] | null {
  if (!value || /chaque/i.test(value)) return null;
  if (/derni/i.test(value)) return [-1];
  const nums = (value.match(/\d/g) ?? []).map(Number).filter((n) => n >= 1 && n <= 5);
  return nums.length ? ([...new Set(nums)].sort() as (1 | 2 | 3 | 4 | 5)[]) : null;
}

/** N-ième occurrence de ce jour de la semaine dans son mois (1 à 5). */
const nthInMonth = (d: Date) => Math.ceil(d.getUTCDate() / 7) as 1 | 2 | 3 | 4 | 5;

/**
 * Règle proposée pour un site, à partir de ses colonnes de récurrence. Toute supposition est
 * signalée ; le responsable valide ou corrige avant toute génération.
 */
export function proposeRule(
  row: Record<string, unknown>,
  today: string,
): { proposal: V12Site["proposal"]; warnings: string[] } {
  const warnings: string[] = [];
  const type = (text(row["Type récurrence"]) ?? "").toLowerCase();
  const frequency = (text(row["Fréquence"]) ?? "").toLowerCase();
  const perPeriod = number(row["Passages / période"]);
  const interval = number(row["Intervalle (jours)"]);
  const weeksText = text(row["Semaine(s) du mois"]);
  const start = day(row["Date de début contrat"]);
  const effectiveFrom = start ?? today;
  if (!start) warnings.push("Date de début du contrat absente : la règle démarre aujourd'hui.");

  let weekdays = weekdaysOf(text(row["Jour(s) prévu(s)"]));
  if (weekdays.length === 0 && start) {
    weekdays = [isoWeekday(parseDay(start))];
    warnings.push(
      `Jour de passage non renseigné : ${WEEKDAY_NAMES[weekdays[0]!]} proposé d'après la date de début du contrat, à confirmer.`,
    );
  }

  let rule: RecurrenceRule | null = null;
  const weekly = (everyWeeks: number) =>
    weekdays.length ? ({ kind: "weekly", weekdays, everyWeeks } as const) : null;

  if (type.startsWith("hebdo") || /semaine$/.test(frequency) || /4 x \/ mois/.test(frequency)) {
    rule = weekly(interval === 14 ? 2 : 1);
  } else if (type.includes("2 semaines")) {
    rule = weekly(2);
  } else if (type.startsWith("mensuel") || /x \/ mois/.test(frequency)) {
    let weeks = weeksOf(weeksText);
    if (!weeks && (perPeriod === 2 || /2 x \/ mois/.test(frequency))) {
      weeks = [1, 3];
      warnings.push("Deux passages par mois : semaines 1 et 3 proposées, à confirmer.");
    }
    if (!weeks && start) {
      weeks = [nthInMonth(parseDay(start))];
      warnings.push(
        "Semaine du mois non renseignée : proposée d'après la date de début, à confirmer.",
      );
    }
    if (weekdays.length && weeks) rule = { kind: "monthly_weeks", weekdays, weeks, everyMonths: 1 };
  } else if (type.startsWith("ponctu")) {
    const when = day(row["Date prochain passage"]) ?? start;
    if (when) rule = { kind: "dates", dates: [when] };
    warnings.push("Prestation ponctuelle : une seule date proposée.");
  } else if (interval && interval >= 1) {
    rule = { kind: "interval_days", days: Math.round(interval) };
    warnings.push(
      `Tous les ${Math.round(interval)} jours d'après la colonne Intervalle, à confirmer.`,
    );
  }

  if (!rule) {
    warnings.push("Règle personnalisée ou incomplète : à définir avant validation.");
    return { proposal: null, warnings };
  }
  const parsed = recurrenceRuleSchema.parse(rule);
  return {
    proposal: { rule: parsed, effectiveFrom, description: describeRule(parsed) },
    warnings,
  };
}

const ACTIVITY_LABELS: Record<string, string> = {
  cage: "Cage d'escalier",
  vitre: "Vitrerie",
  bureau: "Bureaux",
  ponctuel: "Prestation ponctuelle",
};

/** Adresse « 165 rue Nationale, Cahors » → rue + ville ; « Catus » seul → ville. */
function splitAddress(value: string | null): { address: string | null; city: string | null } {
  if (!value) return { address: null, city: null };
  const comma = value.lastIndexOf(",");
  if (comma > 0)
    return {
      address: value.slice(0, comma).trim() || null,
      city: value.slice(comma + 1).trim() || null,
    };
  return /\d/.test(value) ? { address: value, city: null } : { address: null, city: value };
}

const SITE_COLUMNS_USED = new Set([
  "Code site",
  "Activité",
  "Client",
  "Nom du site",
  "Adresse",
  "Fréquence",
  "Heure habituelle",
  "Durée (min)",
  "Intervenant",
  "Tournée",
  "Remplaçant 1",
  "Remplaçant 2",
  "Actif",
  "Accès / clés",
  "Consignes particulières du site",
  "Horaires / accès autorisés",
  "Date de début contrat",
  "Date de fin contrat",
  // Lues pour proposer la règle de récurrence.
  "Type récurrence",
  "Passages / période",
  "Jour(s) prévu(s)",
  "Semaine(s) du mois",
  "Intervalle (jours)",
  // Calculées par l'Excel : jamais reprises.
  "Date prochain passage",
  "Date suivante suggérée",
]);

/* ------------------------------------------------------------------ analyse */

export function analyzeV12(sheets: SheetData[], today: string): V12Analysis {
  const warnings: string[] = [];
  const siteRows = rows(sheets, "Sites", "Code site");
  if (!siteRows) {
    return {
      sites: [],
      agents: [],
      tours: [],
      history: [],
      warnings: [
        "Feuille « Sites » introuvable (colonne « Code site ») : est-ce bien le fichier V12 ?",
      ],
    };
  }

  const sites: V12Site[] = [];
  for (const row of siteRows) {
    const code = text(row["Code site"]);
    const name = text(row["Nom du site"]);
    if (!code) continue;
    if (!name) {
      warnings.push(`Site ${code} ignoré : « Nom du site » vide.`);
      continue;
    }
    const activity = text(row["Activité"]);
    const toComplete = Object.entries(row)
      .filter(([, v]) => typeof v === "string" && TO_COMPLETE.test(v.trim()))
      .map(([k]) => k);
    const details: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      if (!key || SITE_COLUMNS_USED.has(key)) continue;
      const t = text(value) ?? (typeof value === "number" && value !== 0 ? String(value) : null);
      if (t) details[key] = t;
    }
    const { proposal, warnings: ruleWarnings } = proposeRule(row, today);
    const contractEnd = day(row["Date de fin contrat"]);
    sites.push({
      code,
      activity: activity?.toLowerCase() ?? null,
      activityLabel: ACTIVITY_LABELS[activity?.toLowerCase() ?? ""] ?? activity ?? "Prestation",
      client: text(row["Client"]),
      name,
      ...splitAddress(text(row["Adresse"])),
      frequency: text(row["Fréquence"]),
      startTime: clock(row["Heure habituelle"]),
      durationMinutes: number(row["Durée (min)"]),
      agent: text(row["Intervenant"]),
      tour: text(row["Tournée"]),
      replacement1: text(row["Remplaçant 1"]),
      replacement2: text(row["Remplaçant 2"]),
      active: text(row["Actif"]) ? yes(row["Actif"]) : true,
      accessKeys: text(row["Accès / clés"]),
      instructions: text(row["Consignes particulières du site"]),
      openingHours: text(row["Horaires / accès autorisés"]),
      contractStart: day(row["Date de début contrat"]),
      contractEnd,
      details,
      toComplete,
      proposal,
      warnings: ruleWarnings,
    });
  }

  const agents: V12Agent[] = (rows(sheets, "Intervenants", "Code agent") ?? []).flatMap((row) => {
    const name = text(row["Nom"]);
    if (!name) return [];
    const status = text(row["Statut"]);
    return [
      {
        code: text(row["Code agent"]),
        name,
        status,
        activities: text(row["Activités"]),
        zone: text(row["Zone"]),
        hourlyCost: number(row["Coût / h"]),
        replacement1: text(row["Remplaçant prioritaire"]),
        replacement2: text(row["Remplaçant n°2"]),
        isLeader: /dirigeant/i.test(status ?? "") || /^dirigeant$/i.test(name),
      },
    ];
  });
  // Un intervenant cité sur un site mais absent de la feuille Intervenants est ajouté.
  for (const s of sites)
    for (const n of [s.agent, s.replacement1, s.replacement2])
      if (n && !agents.some((a) => a.name.toLowerCase() === n.toLowerCase()))
        agents.push({
          code: null,
          name: n,
          status: null,
          activities: null,
          zone: null,
          hourlyCost: null,
          replacement1: null,
          replacement2: null,
          isLeader: /^dirigeant$/i.test(n),
        });

  const tours: V12Tour[] = (rows(sheets, "Tournées", "Code tournée") ?? []).flatMap((row) => {
    const code = text(row["Code tournée"]);
    return code
      ? [
          {
            code,
            name: text(row["Nom tournée"]),
            zone: text(row["Zone"]),
            agent: text(row["Agent principal"]),
            replacement: text(row["Remplaçant"]),
          },
        ]
      : [];
  });

  const STATUS: Record<string, V12Passage["status"]> = {
    fait: "done",
    annulé: "cancelled",
    annule: "cancelled",
    "accès impossible": "access_impossible",
    "acces impossible": "access_impossible",
  };
  const history: V12Passage[] = [];
  const followUp =
    rows(sheets, "Suivi interventions", "Date prévue") ??
    rows(sheets, "Passages", "Date prévue") ??
    [];
  for (const row of followUp) {
    const status = STATUS[(text(row["Statut"]) ?? "").toLowerCase()];
    const siteCode = text(row["Code site"]);
    const date = day(row["Date prévue"]);
    if (!status || !siteCode || !date) continue;
    if (!sites.some((s) => s.code === siteCode)) {
      warnings.push(`Passage du ${date} ignoré : site ${siteCode} inconnu.`);
      continue;
    }
    if (history.some((h) => h.siteCode === siteCode && h.date === date)) continue;
    history.push({
      siteCode,
      date,
      status,
      plannedAgent: text(row["Intervenant prévu"]),
      actualAgent: text(row["Intervenant réel"]),
      startTime: clock(row["Heure prévue"]),
      durationMinutes: number(row["Durée min"]),
      observation: text(row["Observation"]),
    });
  }
  if (history.some((h) => h.date > today))
    warnings.push("Des passages « faits » sont datés dans le futur : vérifiez-les après l'import.");

  return { sites, agents, tours, history, warnings };
}
