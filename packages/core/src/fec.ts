/**
 * Fichier des écritures comptables (FEC, article A47 A-1 du LPF) : ventes, avoirs, achats et
 * encaissements, au format texte tabulé attendu par l'administration et les logiciels comptables.
 */

export interface FecSale {
  kind: "INVOICE" | "CREDIT_NOTE";
  number: string;
  issueDate: Date;
  customerId: string | null;
  customerName: string;
  totalExclCents: number;
  taxCents: number;
  totalCents: number;
}

export interface FecPurchase {
  number: string | null;
  id: string;
  issueDate: Date;
  supplierId: string;
  supplierName: string;
  totalExclCents: number;
  vatCents: number;
  totalCents: number;
}

export interface FecPayment {
  date: Date;
  amountCents: number;
  documentNumber: string;
  customerId: string | null;
  customerName: string;
  method: string;
}

export const FEC_COLUMNS = [
  "JournalCode",
  "JournalLib",
  "EcritureNum",
  "EcritureDate",
  "CompteNum",
  "CompteLib",
  "CompAuxNum",
  "CompAuxLib",
  "PieceRef",
  "PieceDate",
  "EcritureLib",
  "Debit",
  "Credit",
  "EcritureLet",
  "DateLet",
  "ValidDate",
  "Montantdevise",
  "Idevise",
] as const;

function fecDate(d: Date): string {
  return d.toISOString().slice(0, 10).replaceAll("-", "");
}

function amount(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2).replace(".", ",");
}

/** Texte sans tabulation ni retour à la ligne (séparateurs du fichier). */
function clean(value: string): string {
  return value.replace(/[\t\r\n|]+/g, " ").trim();
}

function auxiliary(prefix: string, id: string | null): string {
  return id ? `${prefix}${id.slice(-8).toUpperCase()}` : `${prefix}DIVERS`;
}

interface Line {
  journal: ["VE" | "HA" | "BQ", string];
  num: string;
  date: Date;
  account: [string, string];
  aux?: [string, string];
  piece: string;
  label: string;
  debit: number;
  credit: number;
}

/** Construit le FEC d'un exercice ; les écritures sont équilibrées pièce par pièce. */
export function buildFec(input: {
  sales: FecSale[];
  purchases: FecPurchase[];
  payments: FecPayment[];
}): string {
  const lines: Line[] = [];
  let seq = 0;
  const next = (journal: string) => `${journal}${String(++seq).padStart(6, "0")}`;

  for (const s of [...input.sales].sort((a, b) => a.issueDate.getTime() - b.issueDate.getTime())) {
    const credit = s.kind === "CREDIT_NOTE";
    const num = next("VE");
    const journal: Line["journal"] = ["VE", "Journal des ventes"];
    const label = `${credit ? "Avoir" : "Facture"} ${s.number} ${s.customerName}`;
    const base = { journal, num, date: s.issueDate, piece: s.number, label };
    const client: [string, string] = [auxiliary("C", s.customerId), s.customerName];
    // Facture : client au débit, produit et TVA au crédit ; avoir : l'inverse.
    const entry = (cents: number, debitSide: boolean) =>
      debitSide !== credit
        ? { debit: Math.abs(cents), credit: 0 }
        : { debit: 0, credit: Math.abs(cents) };
    lines.push({
      ...base,
      account: ["411000", "Clients"],
      aux: client,
      ...entry(s.totalCents, true),
    });
    lines.push({
      ...base,
      account: ["706000", "Prestations de services"],
      ...entry(s.totalExclCents, false),
    });
    if (s.taxCents)
      lines.push({ ...base, account: ["445710", "TVA collectée"], ...entry(s.taxCents, false) });
  }

  for (const p of [...input.purchases].sort(
    (a, b) => a.issueDate.getTime() - b.issueDate.getTime(),
  )) {
    const num = next("HA");
    const piece = p.number ?? p.id.slice(-8).toUpperCase();
    const base = {
      journal: ["HA", "Journal des achats"] as Line["journal"],
      num,
      date: p.issueDate,
      piece,
      label: `Facture ${piece} ${p.supplierName}`,
    };
    lines.push({
      ...base,
      account: ["606000", "Achats non stockés de matières et fournitures"],
      debit: p.totalExclCents,
      credit: 0,
    });
    if (p.vatCents)
      lines.push({
        ...base,
        account: ["445660", "TVA déductible sur autres biens et services"],
        debit: p.vatCents,
        credit: 0,
      });
    lines.push({
      ...base,
      account: ["401000", "Fournisseurs"],
      aux: [auxiliary("F", p.supplierId), p.supplierName],
      debit: 0,
      credit: p.totalCents,
    });
  }

  for (const p of [...input.payments].sort((a, b) => a.date.getTime() - b.date.getTime())) {
    const num = next("BQ");
    const base = {
      journal: ["BQ", "Journal de banque"] as Line["journal"],
      num,
      date: p.date,
      piece: p.documentNumber,
      label: `Règlement ${p.documentNumber} ${p.customerName}`,
    };
    lines.push({ ...base, account: ["512000", "Banque"], debit: p.amountCents, credit: 0 });
    lines.push({
      ...base,
      account: ["411000", "Clients"],
      aux: [auxiliary("C", p.customerId), p.customerName],
      debit: 0,
      credit: p.amountCents,
    });
  }

  const rows = lines.map((l) =>
    [
      l.journal[0],
      l.journal[1],
      l.num,
      fecDate(l.date),
      l.account[0],
      l.account[1],
      l.aux ? l.aux[0] : "",
      l.aux ? clean(l.aux[1]) : "",
      clean(l.piece),
      fecDate(l.date),
      clean(l.label),
      amount(l.debit),
      amount(l.credit),
      "",
      "",
      fecDate(l.date),
      "",
      "",
    ].join("\t"),
  );
  return `${[FEC_COLUMNS.join("\t"), ...rows].join("\r\n")}\r\n`;
}
