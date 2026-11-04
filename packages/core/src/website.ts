import { z } from "zod";

/**
 * Site web d'une entreprise, modifiable depuis son espace (module « Site web »).
 * Le contenu est structuré : l'entreprise change photos, textes, horaires et prestations,
 * jamais la mise en page (le site garde un rendu professionnel). Un brouillon est modifié,
 * puis publié ; le site public n'affiche que la version publiée.
 */

/** Sous-domaine du site : minuscules, chiffres et tirets (« dupont-plomberie »). */
export const websiteSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, {
    error: "Adresse : 3 à 40 caractères, minuscules, chiffres et tirets.",
  });

/** Nom de domaine personnel (« dupont-plomberie.fr », « www.atelier-mona.com »). */
export const websiteDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/, {
    error: "Nom de domaine invalide (ex. : dupont-plomberie.fr).",
  });

/** Image du site : identifiant du fichier envoyé (servi publiquement) et texte alternatif. */
export const websiteImageSchema = z.object({
  fileId: z.string().min(1).max(40),
  alt: z.string().trim().max(200).default(""),
});
export type WebsiteImage = z.infer<typeof websiteImageSchema>;

const text = (max: number) => z.string().trim().max(max).default("");

export const WEEK_DAYS = [
  { key: "mon", label: "Lundi" },
  { key: "tue", label: "Mardi" },
  { key: "wed", label: "Mercredi" },
  { key: "thu", label: "Jeudi" },
  { key: "fri", label: "Vendredi" },
  { key: "sat", label: "Samedi" },
  { key: "sun", label: "Dimanche" },
] as const;

const hourSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Heure au format 08:30." });

export const openingDaySchema = z.object({
  day: z.enum(WEEK_DAYS.map((d) => d.key) as [string, ...string[]]),
  closed: z.boolean().default(false),
  /** Une ou deux plages (matin et après-midi). */
  slots: z
    .array(z.object({ from: hourSchema, to: hourSchema }))
    .max(2)
    .default([]),
});

export const WEBSITE_SECTIONS = [
  { key: "about", label: "Présentation" },
  { key: "services", label: "Prestations" },
  { key: "gallery", label: "Photos" },
  { key: "news", label: "Actualités" },
  { key: "hours", label: "Horaires" },
  { key: "contact", label: "Contact" },
] as const;
export type WebsiteSectionKey = (typeof WEBSITE_SECTIONS)[number]["key"];

export const websiteContentSchema = z.object({
  name: z.string().trim().min(1, { error: "Nom de l'entreprise requis." }).max(80),
  logo: websiteImageSchema.nullable().default(null),
  hero: z
    .object({
      eyebrow: text(80),
      title: z.string().trim().min(1, { error: "Titre de l'accueil requis." }).max(120),
      subtitle: text(300),
      ctaLabel: text(40),
      image: websiteImageSchema.nullable().default(null),
    })
    .default({ eyebrow: "", title: "Bienvenue", subtitle: "", ctaLabel: "", image: null }),
  about: z
    .object({
      title: text(120),
      text: text(3000),
      image: websiteImageSchema.nullable().default(null),
    })
    .default({ title: "", text: "", image: null }),
  services: z
    .object({
      title: text(120),
      intro: text(500),
      /** Reprend les articles du catalogue (prix et descriptions à jour). */
      fromCatalog: z.boolean().default(true),
      showPrices: z.boolean().default(true),
      /** Catégories du catalogue affichées (vide : toutes). */
      categories: z.array(z.string().trim().max(60)).max(20).default([]),
      items: z
        .array(
          z.object({
            name: z.string().trim().min(1).max(120),
            description: text(500),
            price: text(40),
          }),
        )
        .max(40)
        .default([]),
    })
    .default({
      title: "",
      intro: "",
      fromCatalog: true,
      showPrices: true,
      categories: [],
      items: [],
    }),
  gallery: z
    .object({ title: text(120), images: z.array(websiteImageSchema).max(40).default([]) })
    .default({ title: "", images: [] }),
  news: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        title: z.string().trim().min(1).max(160),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        text: text(3000),
        image: websiteImageSchema.nullable().default(null),
      }),
    )
    .max(50)
    .default([]),
  hours: z
    .object({ note: text(300), days: z.array(openingDaySchema).max(7).default([]) })
    .default({ note: "", days: [] }),
  contact: z
    .object({
      phone: text(40),
      email: z.union([z.literal(""), z.email({ error: "Email invalide." })]).default(""),
      address: text(200),
      postalCode: text(12),
      city: text(80),
      area: text(200),
      /** Formulaire de contact : les messages arrivent dans le logiciel. */
      form: z.boolean().default(true),
    })
    .default({ phone: "", email: "", address: "", postalCode: "", city: "", area: "", form: true }),
  social: z
    .object({ facebook: text(200), instagram: text(200), linkedin: text(200) })
    .default({ facebook: "", instagram: "", linkedin: "" }),
  /** Sections affichées, dans l'ordre. */
  sections: z
    .array(
      z.enum(WEBSITE_SECTIONS.map((s) => s.key) as [WebsiteSectionKey, ...WebsiteSectionKey[]]),
    )
    .max(WEBSITE_SECTIONS.length)
    .default(["about", "services", "gallery", "hours", "contact"]),
  seo: z
    .object({ title: text(70), description: text(160) })
    .default({ title: "", description: "" }),
  /** Mentions légales : éditeur, hébergeur (obligatoires). */
  legal: z.object({ publisher: text(400), host: text(300) }).default({ publisher: "", host: "" }),
});
export type WebsiteContent = z.infer<typeof websiteContentSchema>;
export type WebsiteContentInput = z.input<typeof websiteContentSchema>;

/** Apparence : choisie par l'équipe à la création (couleurs et typographie de l'aperçu). */
export const websiteThemeSchema = z.object({
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#C9A97C"),
  background: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#FBF8F2"),
  text: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#1F1B16"),
  soft: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#F1E6D3"),
  font: z.enum(["sans", "serif"]).default("sans"),
  radius: z.enum(["net", "doux", "pilule"]).default("doux"),
});
export type WebsiteTheme = z.infer<typeof websiteThemeSchema>;

/** Contenu de départ, à partir des informations déjà connues de l'entreprise. */
export function defaultWebsiteContent(input: {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  tradeLabel?: string | null;
  legalName?: string | null;
  siret?: string | null;
}): WebsiteContent {
  const city = input.city?.trim() ?? "";
  return websiteContentSchema.parse({
    name: input.name,
    hero: {
      eyebrow: input.tradeLabel ?? "",
      title: input.tradeLabel && city ? `${input.tradeLabel} à ${city}` : input.name,
      subtitle: "Présentez ici votre entreprise en une ou deux phrases.",
      ctaLabel: "Nous contacter",
      image: null,
    },
    about: { title: "Qui sommes-nous", text: "", image: null },
    services: { title: "Nos prestations" },
    gallery: { title: "Nos réalisations", images: [] },
    hours: {
      note: "",
      days: WEEK_DAYS.map((d) => ({
        day: d.key,
        closed: d.key === "sat" || d.key === "sun",
        slots:
          d.key === "sat" || d.key === "sun"
            ? []
            : [
                { from: "08:00", to: "12:00" },
                { from: "14:00", to: "18:00" },
              ],
      })),
    },
    contact: {
      phone: input.phone ?? "",
      email: input.email ?? "",
      address: input.address ?? "",
      postalCode: input.postalCode ?? "",
      city,
      area: "",
      form: true,
    },
    legal: {
      publisher: [input.legalName ?? input.name, input.siret ? `SIRET ${input.siret}` : ""]
        .filter(Boolean)
        .join(" · "),
      host: "",
    },
  });
}

/** Ce qu'il manque avant de publier (le site reste publiable, ce sont des conseils). */
export function websiteChecklist(content: WebsiteContent): string[] {
  const missing: string[] = [];
  if (!content.hero.image) missing.push("Une photo d'accueil");
  if (!content.about.text) missing.push("Le texte de présentation");
  if (!content.contact.phone && !content.contact.email) missing.push("Un téléphone ou un email");
  if (!content.legal.publisher) missing.push("Les mentions légales (éditeur du site)");
  if (content.sections.includes("gallery") && content.gallery.images.length === 0)
    missing.push("Des photos de réalisations");
  return missing;
}

/** Identifiants des fichiers utilisés par un contenu (pour servir publiquement ces seules images). */
export function websiteFileIds(content: WebsiteContent): string[] {
  const ids = [
    content.logo,
    content.hero.image,
    content.about.image,
    ...content.gallery.images,
    ...content.news.map((n) => n.image),
  ]
    .filter((i): i is WebsiteImage => Boolean(i))
    .map((i) => i.fileId);
  return [...new Set(ids)];
}
