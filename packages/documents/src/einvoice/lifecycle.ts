/**
 * Cycle de vie d'une facture électronique (réforme française : émission obligatoire pour les
 * PME au 1er septembre 2027, réception obligatoire pour toutes depuis le 1er septembre 2026).
 * Les statuts « déposée », « rejetée », « refusée » et « encaissée » sont obligatoires ; les
 * autres sont transmis quand la plateforme agréée les fournit.
 */
export const EINVOICE_STATUSES = [
  { key: "pending", label: "À transmettre", tone: "neutral", final: false },
  { key: "deposited", label: "Déposée", tone: "info", final: false },
  { key: "issued", label: "Émise par la plateforme", tone: "info", final: false },
  { key: "received", label: "Reçue par la plateforme", tone: "info", final: false },
  { key: "made_available", label: "Mise à disposition", tone: "info", final: false },
  { key: "in_hand", label: "Prise en charge", tone: "info", final: false },
  { key: "approved", label: "Approuvée", tone: "success", final: false },
  { key: "partially_approved", label: "Approuvée partiellement", tone: "warning", final: false },
  { key: "disputed", label: "En litige", tone: "warning", final: false },
  { key: "suspended", label: "Suspendue", tone: "warning", final: false },
  { key: "completed", label: "Complétée", tone: "info", final: false },
  { key: "payment_sent", label: "Paiement transmis", tone: "success", final: false },
  { key: "cashed", label: "Encaissée", tone: "success", final: true },
  { key: "refused", label: "Refusée", tone: "danger", final: true },
  { key: "rejected", label: "Rejetée", tone: "danger", final: true },
  { key: "error", label: "Erreur de transmission", tone: "danger", final: false },
] as const;

export type EInvoiceStatus = (typeof EINVOICE_STATUSES)[number]["key"];

export function einvoiceStatus(key: string) {
  return EINVOICE_STATUSES.find((s) => s.key === key) ?? EINVOICE_STATUSES[0];
}

export function isFinalStatus(key: string): boolean {
  return einvoiceStatus(key).final;
}

export interface EInvoiceEvent {
  status: string;
  at: string;
  message?: string;
}
