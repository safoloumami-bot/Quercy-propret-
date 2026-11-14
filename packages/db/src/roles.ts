import { SYSTEM_ROLES, SYSTEM_ROLE_KEYS, SYSTEM_ROLE_LABELS } from "@quercy/core";

/** Rôles prédéfinis à créer dans chaque nouvel espace. */
export const SYSTEM_ROLE_SEEDS = SYSTEM_ROLE_KEYS.map((key) => ({
  systemKey: key,
  name: SYSTEM_ROLE_LABELS[key],
  permissions: SYSTEM_ROLES[key],
}));
