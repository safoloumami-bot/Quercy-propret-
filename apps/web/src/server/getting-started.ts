import "server-only";

import { HISTORY_TAG, entityPath } from "@quercy/core";
import { prisma } from "@quercy/db";

import type { ResolvedWorkspace } from "./workspace";

export interface StartStep {
  key: string;
  title: string;
  description: string;
  href: string;
  action: string;
  done: boolean;
  optional?: boolean;
}

export interface GettingStarted {
  /** Démarrage d'activité : sebt est le premier outil de l'entreprise. */
  fresh: StartStep[];
  /** Changement d'outil : reprise des clients, du catalogue et de l'historique. */
  switching: StartStep[];
  /** L'espace contient déjà des données (le choix du parcours peut être deviné). */
  hasData: boolean;
  /** Des documents ont déjà été repris d'un autre logiciel. */
  imported: boolean;
}

/**
 * Premiers pas d'un espace, calculés sur ses vraies données : rien à cocher à la main, chaque
 * étape se valide d'elle-même dès que la chose est faite. Deux parcours : l'entreprise qui
 * démarre tout dans sebt, et celle qui arrive d'un autre logiciel.
 */
export async function gettingStarted(workspace: ResolvedWorkspace): Promise<GettingStarted | null> {
  const { organization } = workspace;
  if (!organization.modules.includes("sales")) return null;
  const organizationId = organization.id;
  const live = { organizationId, deletedAt: null };
  const [settings, products, companies, contacts, quotes, invoices, ownInvoices, history, members] =
    await Promise.all([
      prisma.salesSettings.findUnique({
        where: { organizationId },
        select: {
          legalName: true,
          siret: true,
          address: true,
          city: true,
          vatNumber: true,
          vatExempt: true,
          iban: true,
          stripeSecretKeyEnc: true,
        },
      }),
      prisma.product.count({ where: live }),
      prisma.company.count({ where: live }),
      prisma.contact.count({ where: live }),
      prisma.salesDocument.count({ where: { ...live, kind: "QUOTE" } }),
      prisma.salesDocument.count({ where: { ...live, kind: "INVOICE", number: { not: null } } }),
      prisma.salesDocument.count({
        where: {
          ...live,
          kind: "INVOICE",
          number: { not: null },
          NOT: { tags: { has: HISTORY_TAG } },
        },
      }),
      prisma.salesDocument.count({ where: { ...live, tags: { has: HISTORY_TAG } } }),
      prisma.membership.count({ where: { organizationId, deletedAt: null } }),
    ]);

  const legalDone = Boolean(
    settings?.legalName &&
    settings.siret &&
    settings.address &&
    settings.city &&
    (settings.vatNumber || settings.vatExempt),
  );
  const crm = organization.modules.includes("crm");
  const clients = companies + contacts;

  const legal: StartStep = {
    key: "legal",
    title: "Renseigner vos mentions légales",
    description:
      "Raison sociale, SIRET, adresse et TVA (ou franchise en base) : obligatoires sur chaque devis et facture.",
    href: "/ventes/parametres#legal",
    action: "Compléter",
    done: legalDone,
  };
  const bank: StartStep = {
    key: "bank",
    title: "Ajouter votre IBAN",
    description: "Imprimé sur vos factures pour que vos clients vous paient par virement.",
    href: "/ventes/parametres#payment",
    action: "Ajouter",
    done: Boolean(settings?.iban),
  };
  const catalog: StartStep = {
    key: "catalog",
    title: "Créer vos prestations et tarifs",
    description:
      "Vos services et produits avec leur prix : un devis se fait ensuite en trois clics.",
    href: entityPath("product"),
    action: "Créer",
    done: products > 0,
  };
  const client: StartStep = {
    key: "client",
    title: "Ajouter votre premier client",
    description: "Entreprise ou particulier : ses coordonnées se reportent sur vos documents.",
    href: crm ? entityPath("company") : entityPath("quote"),
    action: "Ajouter",
    done: clients > 0,
  };
  const quote: StartStep = {
    key: "quote",
    title: "Envoyer votre premier devis",
    description:
      "Par e-mail, avec un lien pour l'accepter en ligne. Il devient facture en un clic.",
    href: entityPath("quote"),
    action: "Faire un devis",
    done: quotes > 0,
  };
  const invoice: StartStep = {
    key: "invoice",
    title: "Émettre votre première facture",
    description:
      "Numérotée automatiquement sans trou, avec les mentions obligatoires et les relances en cas de retard.",
    href: entityPath("invoice"),
    action: "Facturer",
    done: ownInvoices > 0,
  };
  const online: StartStep = {
    key: "online",
    title: "Être payé en ligne par carte",
    description: "Un bouton « Payer » sur chaque facture, avec votre compte Stripe.",
    href: "/ventes/parametres#stripe",
    action: "Activer",
    done: Boolean(settings?.stripeSecretKeyEnc),
    optional: true,
  };
  const team: StartStep = {
    key: "team",
    title: "Inviter votre équipe ou votre comptable",
    description: "Chacun avec ses droits : le comptable consulte et exporte, sans rien modifier.",
    href: "/reglages/membres",
    action: "Inviter",
    done: members > 1,
    optional: true,
  };

  const switching: StartStep[] = [
    legal,
    ...(crm
      ? [
          {
            key: "import-clients",
            title: "Importer vos clients",
            description:
              "Le fichier clients de votre ancien logiciel ou de votre tableur (CSV ou Excel).",
            href: `${entityPath("company")}?importer=1`,
            action: "Importer",
            done: companies > 0,
          },
        ]
      : []),
    {
      key: "import-catalog",
      title: "Importer votre catalogue",
      description: "Vos prestations et tarifs, depuis un CSV ou un fichier Excel.",
      href: `${entityPath("product")}?importer=1`,
      action: "Importer",
      done: products > 0,
    },
    {
      key: "import-history",
      title: "Reprendre vos factures, avoirs et devis",
      description:
        "Depuis l'export de votre ancien logiciel ou vos PDF : numéros et dates d'origine conservés, aucun e-mail envoyé.",
      href: `${entityPath("invoice")}?importer=1`,
      action: "Reprendre",
      done: history > 0,
    },
    bank,
    { ...invoice, title: "Émettre votre première facture avec sebt" },
    online,
    team,
  ];

  return {
    fresh: [legal, bank, catalog, client, quote, invoice, online, team],
    switching,
    hasData: clients + products + quotes + invoices > 0,
    imported: history > 0,
  };
}
