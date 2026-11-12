import { z } from "zod";

/**
 * Reprise de l'historique des ventes (factures, avoirs, devis émis dans un autre logiciel).
 *
 * Fonctions pures, partagées entre le navigateur (lecture du fichier, correspondance des
 * colonnes, aperçu) et le serveur (contrôle avant enregistrement). Rien n'est inventé : un
 * montant manquant qu'on ne peut pas recalculer est une erreur, jamais un zéro.
 */

export type HistoryKind = "INVOICE" | "CREDIT_NOTE" | "QUOTE";

export type HistoryFieldKey =
  | "number"
  | "issueDate"
  | "dueDate"
  | "client"
  | "subject"
  | "totalExcl"
  | "tax"
  | "total"
  | "vatRate"
  | "paid"
  | "due"
  | "status"
  | "invoiceNumber";

export interface HistoryField {
  key: HistoryFieldKey;
  label: string;
  required?: boolean;
  /** Types de documents concernés (tous par défaut). */
  kinds?: HistoryKind[];
  hint?: string;
  /**
   * Intitulés de colonnes reconnus, déjà normalisés (minuscules, sans accent ni ponctuation).
   * Couvre les exports courants : Sellsy, Axonaut, Pennylane, EBP, Henrri, Tiime, Excel maison.
   */
  synonyms: string[];
}

export const HISTORY_FIELDS: HistoryField[] = [
  {
    key: "number",
    label: "Numéro",
    required: true,
    synonyms: [
      "numero",
      "num",
      "no",
      "n",
      "ndefacture",
      "numerofacture",
      "numerodefacture",
      "nfacture",
      "nofacture",
      "numfacture",
      "numeroavoir",
      "numerodavoir",
      "navoir",
      "numerodevis",
      "ndevis",
      "numdevis",
      "numeropiece",
      "piece",
      "ndepiece",
      "reference",
      "ref",
      "invoicenumber",
      "number",
      "documentnumber",
      "identifiant",
    ],
  },
  {
    key: "issueDate",
    label: "Date",
    required: true,
    synonyms: [
      "date",
      "datefacture",
      "datedefacture",
      "datefacturation",
      "dateemission",
      "datedemission",
      "datepiece",
      "datedocument",
      "datedevis",
      "datedudevis",
      "dateavoir",
      "datedelavoir",
      "invoicedate",
      "issuedate",
      "datedecreation",
      "creele",
    ],
  },
  {
    key: "dueDate",
    label: "Échéance",
    synonyms: [
      "echeance",
      "dateecheance",
      "datedecheance",
      "datelimitedepaiement",
      "datelimite",
      "duedate",
      "validite",
      "datedevalidite",
      "validjusquau",
    ],
  },
  {
    key: "client",
    label: "Client",
    required: true,
    hint: "Nom du client : retrouvé dans vos entreprises, ou créé.",
    synonyms: [
      "client",
      "nomclient",
      "nomduclient",
      "clientnom",
      "raisonsociale",
      "societe",
      "entreprise",
      "customer",
      "customername",
      "tiers",
      "nomdutiers",
      "destinataire",
      "denomination",
    ],
  },
  {
    key: "subject",
    label: "Objet",
    synonyms: ["objet", "libelle", "intitule", "titre", "designation", "description", "subject"],
  },
  {
    key: "totalExcl",
    label: "Montant HT",
    synonyms: [
      "totalht",
      "montantht",
      "ht",
      "totalhorstaxe",
      "totalhorstaxes",
      "montanthorstaxe",
      "montanthorstaxes",
      "netht",
      "totalnetht",
      "baseht",
      "subtotal",
      "amountexcltax",
      "totalexcltax",
    ],
  },
  {
    key: "tax",
    label: "Montant TVA",
    synonyms: ["tva", "montanttva", "totaltva", "taxe", "taxes", "tax", "vat", "vatamount"],
  },
  {
    key: "total",
    label: "Montant TTC",
    synonyms: [
      "totalttc",
      "montantttc",
      "ttc",
      "nettapayer",
      "netapayer",
      "totaltoutestaxes",
      "total",
      "montant",
      "montanttotal",
      "amount",
      "totalamount",
      "totalincltax",
    ],
  },
  {
    key: "vatRate",
    label: "Taux de TVA",
    hint: "Sert à calculer la TVA quand le fichier ne donne qu'un montant.",
    synonyms: ["tauxtva", "tauxdetva", "taux", "vatrate", "taxrate"],
  },
  {
    key: "paid",
    label: "Déjà payé",
    kinds: ["INVOICE"],
    synonyms: [
      "paye",
      "montantpaye",
      "regle",
      "montantregle",
      "encaisse",
      "montantencaisse",
      "dejaregle",
      "paid",
      "amountpaid",
    ],
  },
  {
    key: "due",
    label: "Reste à payer",
    kinds: ["INVOICE"],
    synonyms: [
      "resteapayer",
      "resteaencaisser",
      "restedu",
      "solde",
      "soldedu",
      "montantrestant",
      "due",
      "amountdue",
      "balance",
    ],
  },
  {
    key: "status",
    label: "Statut",
    hint: "Payée, en retard, accepté, refusé… : reconnu automatiquement.",
    synonyms: ["statut", "etat", "status", "statutdepaiement", "etatdupaiement"],
  },
  {
    key: "invoiceNumber",
    label: "Facture d'origine",
    kinds: ["CREDIT_NOTE"],
    hint: "Numéro de la facture annulée ou corrigée par l'avoir.",
    synonyms: [
      "facture",
      "factureorigine",
      "facturedorigine",
      "factureassociee",
      "facturerectifiee",
      "factureliee",
      "facturereference",
      "numerofactureorigine",
      "invoice",
      "relatedinvoice",
    ],
  },
];

export function historyFields(kind: HistoryKind): HistoryField[] {
  return HISTORY_FIELDS.filter((f) => !f.kinds || f.kinds.includes(kind));
}

export function normalizeHeader(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/€/g, "")
    .replace(/(^|[\s(])(eur|euros?)(?=$|[\s)])/g, "$1")
    .replace(/[^a-z0-9]/g, "");
}

const NOT_A_FIELD = /(intracom|siret|siren|telephone|mail|adresse|postal|ville|pays|iban|bic)/;

/**
 * Correspondance automatique des colonnes : intitulé exact d'abord, puis intitulé qui commence
 * par un synonyme (« Montant HT (€) », « Date de facture (jj/mm/aaaa) »). Une colonne ne sert
 * qu'à un champ, un champ qu'à une colonne.
 */
export function guessHistoryMapping(
  headers: string[],
  kind: HistoryKind,
): Record<number, HistoryFieldKey> {
  const fields = historyFields(kind);
  const normalized = headers.map(normalizeHeader);
  const mapping: Record<number, HistoryFieldKey> = {};
  const used = new Set<HistoryFieldKey>();
  const assign = (i: number, key: HistoryFieldKey) => {
    mapping[i] = key;
    used.add(key);
  };
  // 1. Intitulés exacts.
  normalized.forEach((h, i) => {
    if (!h) return;
    const field = fields.find((f) => !used.has(f.key) && f.synonyms.includes(h));
    if (field) assign(i, field.key);
  });
  // 2. Intitulés plus longs qui commencent par un synonyme (le plus long gagne). Les colonnes
  // d'identité (n° de TVA intracommunautaire, SIRET, coordonnées) ne sont jamais des montants.
  normalized.forEach((h, i) => {
    if (!h || mapping[i] || NOT_A_FIELD.test(h)) return;
    let best: { key: HistoryFieldKey; length: number } | null = null;
    for (const f of fields) {
      if (used.has(f.key)) continue;
      if (f.key === "number" && /client|commande|tiers/.test(h)) continue;
      for (const s of f.synonyms) {
        if (s.length >= 3 && h.startsWith(s) && (!best || s.length > best.length)) {
          best = { key: f.key, length: s.length };
        }
      }
    }
    if (best) assign(i, best.key);
  });
  return mapping;
}

/**
 * Montant en centimes : « 1 234,56 € », « 1.234,56 », « 1,234.56 », « -45 », « (45,00) ».
 * Renvoie null si la cellule est vide ou illisible.
 */
export function parseAmountCents(text: string | null | undefined): number | null {
  if (text === null || text === undefined) return null;
  let s = String(text).trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[\s  ']/g, "").replace(/[€$£]|eur$/gi, "");
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.endsWith("-")) {
    negative = !negative;
    s = s.slice(0, -1);
  }
  if (s.startsWith("+")) s = s.slice(1);
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // Le dernier séparateur est le séparateur décimal.
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    s = (s.match(/,/g)?.length ?? 0) > 1 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if ((s.match(/\./g)?.length ?? 0) > 1) {
    s = s.replace(/\./g, "");
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const cents = Math.round(Number(s) * 100);
  return negative ? -cents : cents;
}

/** Taux de TVA en pourcentage : « 20 », « 20 % », « 0,2 », « 5,5% ». */
export function parseVatRate(text: string | null | undefined): number | null {
  if (!text?.trim()) return null;
  const cleaned = text.replace("%", "").replace(",", ".").trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  const rate = n > 0 && n < 1 && !text.includes("%") ? n * 100 : n;
  return rate > 100 ? null : Math.round(rate * 100) / 100;
}

function isoDay(y: number, m: number, d: number): string | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Date au format AAAA-MM-JJ : jj/mm/aaaa (format français par défaut), jj-mm-aa, jj.mm.aaaa,
 * AAAA-MM-JJ (avec ou sans heure), ou numéro de série Excel. Null si illisible.
 */
export function parseHistoryDate(text: string | null | undefined): string | null {
  const s = text?.trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s);
  if (m) return isoDay(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})(?:\s.*)?$/.exec(s);
  if (m) {
    const year = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return isoDay(year, Number(m[2]), Number(m[1]));
  }
  // Numéro de série Excel (jours depuis le 30/12/1899), entre 1982 et 2064.
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = Math.floor(Number(s));
    if (serial > 30000 && serial < 60000) {
      return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000).toISOString().slice(0, 10);
    }
  }
  return null;
}

type StatusHint = "paid" | "unpaid" | "accepted" | "declined" | "sent" | null;

function statusHint(text: string | undefined): StatusHint {
  const s = normalizeHeader(text ?? "");
  if (!s) return null;
  if (/^(payee?s?|reglee?s?|soldee?s?|encaissee?s?|paid|acquittee?)/.test(s)) return "paid";
  if (/(refuse|perdu|annule|declined|lost|rejected)/.test(s)) return "declined";
  if (/(accepte|signe|gagne|valide|accepted|won)/.test(s)) return "accepted";
  if (/(impaye|nonpaye|enretard|retard|aregler|enattente|overdue|unpaid|due)/.test(s))
    return "unpaid";
  if (/(envoye|emise?|finalise|sent|issued|ouvert)/.test(s)) return "sent";
  return null;
}

export const historyRowSchema = z.object({
  number: z.string().trim().min(1).max(60),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  client: z.string().trim().min(1).max(200),
  subject: z.string().trim().max(300).nullable(),
  totalExclCents: z.number().int().min(0).max(10_000_000_000),
  taxCents: z.number().int().min(0).max(10_000_000_000),
  totalCents: z.number().int().min(0).max(10_000_000_000),
  /** Taux de TVA de la ligne de reprise, en %. */
  vatRate: z.number().min(0).max(100),
  paidCents: z.number().int().min(0).max(10_000_000_000),
  /** Devis : accepted, declined ou sent. */
  quoteStatus: z.enum(["sent", "accepted", "declined"]).nullable(),
  invoiceNumber: z.string().trim().max(60).nullable(),
});
export type HistoryRow = z.infer<typeof historyRowSchema>;

export interface HistoryRowError {
  /** Index de la ligne dans le fichier (0 = première ligne après les en-têtes). */
  row: number;
  messages: string[];
}

const COMMON_RATES = [20, 10, 8.5, 5.5, 2.1, 0];

/** Taux déduit des montants, arrondi au taux légal le plus proche s'il en est tout proche. */
function deducedRate(totalExcl: number, tax: number): number {
  if (totalExcl <= 0) return 0;
  const raw = (tax / totalExcl) * 100;
  const near = COMMON_RATES.find((r) => Math.abs(r - raw) < 0.15);
  return near ?? Math.round(raw * 100) / 100;
}

/**
 * Transforme les lignes du fichier (colonnes déjà associées aux champs) en documents
 * contrôlés. Les montants négatifs (avoirs dans la plupart des exports) sont pris en valeur
 * absolue. Les doublons de numéro dans le fichier sont signalés.
 */
export function normalizeHistoryRows(
  kind: HistoryKind,
  input: Partial<Record<HistoryFieldKey, string>>[],
): { rows: (HistoryRow & { line: number })[]; errors: HistoryRowError[] } {
  const rows: (HistoryRow & { line: number })[] = [];
  const errors: HistoryRowError[] = [];
  const seen = new Set<string>();

  input.forEach((raw, line) => {
    const get = (k: HistoryFieldKey) => raw[k]?.trim() ?? "";
    // Ligne entièrement vide (fin de fichier Excel) : ignorée sans erreur.
    if (Object.values(raw).every((v) => !v?.trim())) return;
    // Ligne de total en bas de tableau : ignorée sans erreur.
    if (!get("number") && /^total/i.test(get("client") || get("issueDate"))) return;

    const messages: string[] = [];
    const number = get("number");
    if (!number) messages.push("numéro manquant.");
    else if (seen.has(number)) messages.push(`numéro ${number} en double dans le fichier.`);

    const issueDate = parseHistoryDate(get("issueDate"));
    if (!issueDate)
      messages.push(get("issueDate") ? `date illisible (${get("issueDate")}).` : "date manquante.");
    const dueRaw = get("dueDate");
    const dueDate = parseHistoryDate(dueRaw);
    if (dueRaw && !dueDate) messages.push(`échéance illisible (${dueRaw}).`);

    const client = get("client");
    if (!client) messages.push("client manquant.");

    const abs = (v: number | null) => (v === null ? null : Math.abs(v));
    let ht = abs(parseAmountCents(get("totalExcl")));
    let tva = abs(parseAmountCents(get("tax")));
    let ttc = abs(parseAmountCents(get("total")));
    const rate = parseVatRate(get("vatRate"));
    for (const [k, v] of [
      ["totalExcl", ht],
      ["tax", tva],
      ["total", ttc],
    ] as const) {
      if (get(k) && v === null) messages.push(`montant illisible (${get(k)}).`);
    }
    if (ht !== null && ttc !== null && tva === null) tva = ttc - ht;
    else if (ht !== null && tva !== null && ttc === null) ttc = ht + tva;
    else if (ttc !== null && tva !== null && ht === null) ht = ttc - tva;
    else if (ht !== null && rate !== null && tva === null) {
      tva = Math.round((ht * rate) / 100);
      ttc = ht + tva;
    } else if (ttc !== null && rate !== null && ht === null) {
      ht = Math.round(ttc / (1 + rate / 100));
      tva = ttc - ht;
    }
    if (ht === null || tva === null || ttc === null) {
      if (!messages.some((m) => m.startsWith("montant illisible")))
        messages.push(
          "montants incomplets : il faut deux montants parmi HT, TVA et TTC (ou un montant et le taux de TVA).",
        );
    } else if (tva < 0) {
      messages.push("le montant TTC est inférieur au montant HT.");
    } else if (Math.abs(ht + tva - ttc) > 2) {
      messages.push("HT + TVA ne correspond pas au TTC.");
    }

    let paid = 0;
    const hint = statusHint(get("status"));
    if (kind === "INVOICE" && ttc !== null) {
      const paidAmount = abs(parseAmountCents(get("paid")));
      const dueAmount = abs(parseAmountCents(get("due")));
      if (paidAmount !== null) paid = paidAmount;
      else if (dueAmount !== null) paid = ttc - dueAmount;
      else if (hint === "paid") paid = ttc;
      paid = Math.min(Math.max(paid, 0), ttc);
    }

    if (messages.length > 0 || ht === null || tva === null || ttc === null) {
      errors.push({ row: line, messages });
      return;
    }
    seen.add(number);
    rows.push({
      line,
      number,
      issueDate: issueDate!,
      dueDate,
      client,
      subject: get("subject") || null,
      totalExclCents: ht,
      taxCents: tva,
      totalCents: ttc,
      vatRate: rate ?? deducedRate(ht, tva),
      paidCents: paid,
      quoteStatus:
        kind === "QUOTE"
          ? hint === "accepted"
            ? "accepted"
            : hint === "declined"
              ? "declined"
              : "sent"
          : null,
      invoiceNumber: kind === "CREDIT_NOTE" ? get("invoiceNumber") || null : null,
    });
  });
  return { rows, errors };
}

/** Étiquette posée sur chaque document repris : exclu des relances et de l'export FEC. */
export const HISTORY_TAG = "reprise";

/**
 * Numéro au format sebt (préfixe-année-séquence) : renvoie l'année et la séquence, pour que
 * la numérotation des prochains documents reprenne après les numéros importés.
 */
export function sebtSequence(
  number: string,
  prefix: string,
): { year: number; sequence: number } | null {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^${escaped}-(\\d{4})-(\\d+)$`).exec(number.trim());
  return m ? { year: Number(m[1]), sequence: Number(m[2]) } : null;
}
