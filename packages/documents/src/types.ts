import type { DocumentKind, DocumentTotals } from "@quercy/core";

export interface PartyInfo {
  name: string;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  /** SIRET (vendeur) ou SIREN (client). */
  registration?: string | null;
  vatNumber?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface SellerInfo extends PartyInfo {
  iban?: string | null;
  bic?: string | null;
  vatExempt: boolean;
  footer?: string | null;
  latePenaltyText?: string | null;
  /** Assurance professionnelle (décennale), imprimée sur les devis et factures. */
  insuranceMention?: string | null;
  /** Mention de certification client quand une ligne est à 10 % ou 5,5 % (travaux). */
  renovationVatMention?: boolean;
}

export interface DocumentLine {
  description: string;
  quantity: number;
  unit?: string | null;
  unitPriceCents: number;
  discountPercent: number;
  vatRate: number;
  totalExclCents: number;
}

/** Tout ce qu'il faut pour produire le PDF (et le XML Factur-X) d'un document commercial. */
export interface DocumentData {
  kind: DocumentKind;
  number: string | null;
  issueDate: Date | null;
  dueDate: Date | null;
  subject?: string | null;
  notes?: string | null;
  paymentTermsDays: number;
  currency: string;
  seller: SellerInfo;
  buyer: PartyInfo & { contactName?: string | null };
  lines: DocumentLine[];
  totals: DocumentTotals;
  paidCents: number;
  dueCents: number;
  /** Avoir : numéro de la facture corrigée. */
  creditedInvoiceNumber?: string | null;
  /** Lien de paiement en ligne (facture). */
  paymentUrl?: string | null;
}
