import { z } from "zod";

import type { MODULE_KEYS } from "./modules";
import { moduleKeySchema } from "./modules";
import { permissionMatrixSchema, systemRoleKeySchema } from "./permissions";
import {
  dateFormatSchema,
  densitySchema,
  hexColorSchema,
  localeSchema,
  themeSchema,
} from "./preferences";

/** Secteurs proposés à l'accueil ; ils servent à présélectionner des modules. */
export const INDUSTRIES = [
  {
    value: "services",
    label: "Services aux entreprises",
    modules: ["crm", "sales", "projects", "calendar"],
  },
  {
    value: "cleaning",
    label: "Propreté et entretien",
    modules: ["crm", "sales", "calendar", "hr"],
  },
  {
    value: "construction",
    label: "Bâtiment et artisanat",
    modules: ["crm", "sales", "purchases", "projects"],
  },
  {
    value: "retail",
    label: "Commerce et négoce",
    modules: ["crm", "sales", "inventory", "purchases"],
  },
  {
    value: "agency",
    label: "Agence, conseil, freelance",
    modules: ["crm", "sales", "projects", "documents"],
  },
  {
    value: "software",
    label: "Logiciel et SaaS",
    modules: ["crm", "sales", "support", "projects"],
  },
  {
    value: "industry",
    label: "Industrie et production",
    modules: ["purchases", "inventory", "sales", "projects"],
  },
  { value: "other", label: "Autre activité", modules: ["crm", "sales"] },
] as const satisfies readonly {
  value: string;
  label: string;
  modules: readonly (typeof MODULE_KEYS)[number][];
}[];

export const industrySchema = z.enum(INDUSTRIES.map((i) => i.value) as [string, ...string[]]);

export const COMPANY_SIZES = [
  { value: "1", label: "Juste moi" },
  { value: "2-10", label: "2 à 10 personnes" },
  { value: "11-50", label: "11 à 50 personnes" },
  { value: "51-200", label: "51 à 200 personnes" },
  { value: "201+", label: "Plus de 200 personnes" },
] as const;

export const companySizeSchema = z.enum(COMPANY_SIZES.map((s) => s.value) as [string, ...string[]]);

export const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD"] as const;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Adresse email invalide." }));

export const passwordSchema = z
  .string()
  .min(10, { error: "10 caractères minimum." })
  .max(128, { error: "128 caractères maximum." });

export const personNameSchema = z
  .string()
  .trim()
  .min(2, { error: "Indiquez au moins 2 caractères." })
  .max(80, { error: "80 caractères maximum." });

export const organizationNameSchema = z
  .string()
  .trim()
  .min(2, { error: "Indiquez au moins 2 caractères." })
  .max(80, { error: "80 caractères maximum." });

/** Rôles proposés à l'invitation (le rôle Propriétaire se transmet, il ne s'invite pas). */
export const invitableRoleSchema = z.string().min(1);

export const inviteSchema = z.object({
  emails: z
    .array(emailSchema)
    .min(1, { error: "Ajoutez au moins une adresse." })
    .max(20, { error: "20 invitations maximum à la fois." }),
  roleId: invitableRoleSchema,
});

export const createOrganizationSchema = z.object({
  name: organizationNameSchema,
  industry: industrySchema,
  size: companySizeSchema,
  modules: z.array(moduleKeySchema).min(1, { error: "Activez au moins un module." }),
  accentColor: hexColorSchema,
  invitations: z
    .array(z.object({ email: emailSchema, systemRole: systemRoleKeySchema.exclude(["owner"]) }))
    .max(20)
    .default([]),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z.object({
  name: organizationNameSchema,
  industry: industrySchema.nullable(),
  size: companySizeSchema.nullable(),
  currency: z.enum(CURRENCIES),
  timezone: z.string().min(1).max(64),
  dateFormat: dateFormatSchema,
  locale: localeSchema,
});

export const roleInputSchema = z.object({
  name: z.string().trim().min(2, { error: "Indiquez au moins 2 caractères." }).max(40),
  description: z.string().trim().max(200).optional(),
  permissions: permissionMatrixSchema,
});

export const teamInputSchema = z.object({
  name: z.string().trim().min(2, { error: "Indiquez au moins 2 caractères." }).max(40),
  color: hexColorSchema.nullable().optional(),
  leadUserId: z.string().min(1).nullable().optional(),
  memberIds: z.array(z.string().min(1)).max(500).default([]),
});

export const profileSchema = z.object({
  name: personNameSchema,
});

export const userPreferencesInputSchema = z.object({
  theme: themeSchema.optional(),
  density: densitySchema.optional(),
});

/** Slug d'URL à partir d'un nom (« Dupont & Fils » → « dupont-fils »). */
export function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "espace"
  );
}
