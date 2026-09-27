import { z } from "zod";

export const THEMES = ["light", "dark", "system"] as const;
export const themeSchema = z.enum(THEMES);
export type Theme = z.infer<typeof themeSchema>;

export const LOCALES = ["fr", "en"] as const;
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

export const DATE_FORMATS = ["dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd"] as const;
export const dateFormatSchema = z.enum(DATE_FORMATS);

export const DENSITIES = ["compact", "normal", "comfortable"] as const;
export const densitySchema = z.enum(DENSITIES);
export type Density = z.infer<typeof densitySchema>;

/** Couleur hexadécimale #RRGGBB. */
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Couleur attendue au format #RRGGBB");

export const DEFAULT_ACCENT = "#0F6E5E";

export const organizationPreferencesSchema = z.object({
  locale: localeSchema.default("fr"),
  currency: z.string().length(3).toUpperCase().default("EUR"),
  timezone: z.string().min(1).default("Europe/Paris"),
  dateFormat: dateFormatSchema.default("dd/MM/yyyy"),
  accentColor: hexColorSchema.default(DEFAULT_ACCENT),
});
export type OrganizationPreferences = z.infer<typeof organizationPreferencesSchema>;

export const userPreferencesSchema = z.object({
  theme: themeSchema.default("system"),
  locale: localeSchema.optional(),
  timezone: z.string().optional(),
  dateFormat: dateFormatSchema.optional(),
  density: densitySchema.default("normal"),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

/** Préférences effectives : celles de l'utilisateur priment sur celles de l'entreprise. */
export function effectivePreferences(org: OrganizationPreferences, user: UserPreferences) {
  return {
    theme: user.theme,
    density: user.density,
    accentColor: org.accentColor,
    currency: org.currency,
    locale: user.locale ?? org.locale,
    timezone: user.timezone ?? org.timezone,
    dateFormat: user.dateFormat ?? org.dateFormat,
  };
}
