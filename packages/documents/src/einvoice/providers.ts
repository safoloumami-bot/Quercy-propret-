import type { EInvoiceStatus } from "./lifecycle";

/**
 * Raccordement à une plateforme agréée (PA). Chaque plateforme a sa propre API : un
 * connecteur traduit ces trois opérations. Le « bac à sable » simule une plateforme pour
 * découvrir le parcours sans rien transmettre.
 */
export interface OutgoingEInvoice {
  number: string;
  buyerSiren: string | null;
  xml: string;
  pdf: Uint8Array;
}

export interface ProviderStatus {
  ref: string;
  status: EInvoiceStatus;
  message?: string;
}

export interface IncomingFile {
  ref: string;
  bytes: Uint8Array;
}

export interface EInvoicingProvider {
  key: string;
  label: string;
  /** Rien n'est réellement transmis (essai). */
  simulated: boolean;
  send(invoice: OutgoingEInvoice): Promise<ProviderStatus>;
  /** Statuts à jour des factures transmises (références de la plateforme). */
  statuses(
    refs: { ref: string; status: string; sentAt: Date }[],
    now: Date,
  ): Promise<ProviderStatus[]>;
  /** Factures reçues depuis la dernière synchronisation. */
  incoming(since: Date | null): Promise<IncomingFile[]>;
}

/** Progression simulée : un statut de plus par jour, jusqu'à « mise à disposition ». */
const SANDBOX_STEPS: EInvoiceStatus[] = ["deposited", "issued", "received", "made_available"];

export const sandboxProvider: EInvoicingProvider = {
  key: "sandbox",
  label: "Bac à sable (essai, rien n'est transmis)",
  simulated: true,
  async send(invoice) {
    return {
      ref: `SBX-${invoice.number}-${Date.now().toString(36)}`,
      status: "deposited",
      message: "Déposée sur la plateforme d'essai.",
    };
  },
  async statuses(refs, now) {
    return refs.map(({ ref, status, sentAt }) => {
      const days = Math.floor((now.getTime() - sentAt.getTime()) / 86_400_000);
      const target = SANDBOX_STEPS[Math.min(SANDBOX_STEPS.length - 1, Math.max(0, days))]!;
      const current = SANDBOX_STEPS.indexOf(status as EInvoiceStatus);
      return {
        ref,
        status: SANDBOX_STEPS.indexOf(target) > current ? target : (status as EInvoiceStatus),
      };
    });
  },
  async incoming() {
    return [];
  },
};

export const EINVOICING_PROVIDERS: Record<string, EInvoicingProvider> = {
  sandbox: sandboxProvider,
};

export function einvoicingProvider(key: string | null | undefined): EInvoicingProvider | null {
  return key ? (EINVOICING_PROVIDERS[key] ?? null) : null;
}
