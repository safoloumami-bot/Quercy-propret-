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
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
