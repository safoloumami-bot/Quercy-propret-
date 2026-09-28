/** Différence champ par champ entre deux états, pour l'historique et le journal d'audit. */
export type ChangeSet = Record<string, { before: unknown; after: unknown }>;

function same(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (typeof a === "object" || typeof b === "object") {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }
  return a === b;
}

/**
 * Compare `before` et `after` sur les champs donnés (tous les champs de `after` par défaut)
 * et renvoie seulement ceux qui ont changé.
 */
export function diffChanges<T extends Record<string, unknown>>(
  before: Partial<T>,
  after: Partial<T>,
  fields: readonly (keyof T & string)[] = Object.keys(after) as (keyof T & string)[],
): ChangeSet {
  const changes: ChangeSet = {};
  for (const field of fields) {
    if (!(field in after)) continue;
    if (!same(before[field], after[field])) {
      changes[field] = { before: before[field] ?? null, after: after[field] ?? null };
    }
  }
  return changes;
}

/** Libellés lisibles des actions tracées dans le journal d'audit. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "organization.create": "a créé l'espace",
  "organization.update": "a modifié les réglages de l'espace",
  "organization.preferences.update": "a modifié l'apparence de l'espace",
  "organization.modules.update": "a changé les modules activés",
  "organization.export": "a exporté les données de l'espace",
  "member.join": "a rejoint l'espace",
  "member.role.update": "a changé le rôle d'un membre",
  "member.remove": "a retiré un membre",
  "member.leave": "a quitté l'espace",
  "invitation.create": "a invité une personne",
  "invitation.revoke": "a annulé une invitation",
  "role.create": "a créé un rôle",
  "role.update": "a modifié un rôle",
  "role.delete": "a supprimé un rôle",
  "team.create": "a créé une équipe",
  "team.update": "a modifié une équipe",
  "team.delete": "a supprimé une équipe",
  "record.create": "a créé la fiche",
  "record.update": "a modifié la fiche",
  "record.bulk_update": "a modifié plusieurs fiches",
  "record.delete": "a mis des fiches à la corbeille",
  "record.restore": "a restauré des fiches",
  "record.import": "a importé des fiches",
  "record.export": "a exporté des fiches",
  "custom_field.create": "a créé un champ personnalisé",
  "custom_field.update": "a modifié un champ personnalisé",
  "custom_field.delete": "a supprimé un champ personnalisé",
  "file.upload": "a ajouté un fichier",
  "file.delete": "a supprimé un fichier",
  "billing.plan.update": "a changé d'offre",
  "billing.cancel": "a résilié l'abonnement (fin de période)",
  "billing.resume": "a annulé la résiliation de l'abonnement",
  "support.impersonation.start": "a ouvert une session d'assistance (connexion « en tant que »)",
  "sales.lines.update": "a modifié les lignes",
  "sales.finalize": "a émis le document",
  "sales.send": "a envoyé le document par email",
  "sales.remind": "a relancé le client",
  "sales.status": "a changé le statut du document",
  "sales.convert": "a transformé le document",
  "sales.credit_note": "a créé un avoir",
  "sales.duplicate": "a dupliqué le document",
  "sales.recurring.create": "a créé une facturation récurrente",
  "sales.recurring.generate": "a généré une facture récurrente",
  "sales.payment.create": "a enregistré un paiement",
  "sales.payment.delete": "a supprimé un paiement",
  "sales.settings.update": "a modifié les paramètres de vente",
  "sales.quote.accepted_online": "a accepté le devis en ligne",
  "sales.invoice_time": "a facturé le temps passé",
  "crm.merge": "a fusionné des doublons",
  "report.create": "a créé un rapport",
  "report.update": "a modifié un rapport",
  "report.delete": "a supprimé un rapport",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
