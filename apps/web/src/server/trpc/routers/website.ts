import {
  defaultWebsiteContent,
  websiteChecklist,
  websiteContentSchema,
  websiteDomainSchema,
  websiteFileIds,
  websiteSlugSchema,
  websiteThemeSchema,
} from "@quercy/core";
import { Prisma, prisma } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "../../env";
import { signedFileUrl } from "../../storage";
import { tradePresetFor } from "../../trade-presets";
import { availableSlug, parseContent, parseTheme, siteUrl } from "../../website";
import { authorize, createTRPCRouter, orgProcedure, recordAudit } from "../init";

function requireModule(ctx: { workspace: { organization: { modules: string[] } } }) {
  if (!ctx.workspace.organization.modules.includes("website"))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Activez le module « Site web » dans les réglages de l'espace.",
    });
}

/** Liens d'aperçu (signés, temporaires) des images utilisées dans le brouillon. */
async function previewUrls(organizationId: string, ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const files = await prisma.storedFile.findMany({
    where: { id: { in: ids }, organizationId, entityType: "website", deletedAt: null },
    select: { id: true, storageKey: true, name: true, mimeType: true },
  });
  const entries = await Promise.all(
    files.map(async (f) => [f.id, await signedFileUrl(f)] as const),
  );
  return Object.fromEntries(entries);
}

export const websiteRouter = createTRPCRouter({
  /** Le site de l'espace (null s'il n'a pas encore été créé). */
  get: orgProcedure.query(async ({ ctx }) => {
    requireModule(ctx);
    authorize(ctx, "website", "view");
    const site = await ctx.db.website.findFirst();
    const canEdit =
      !ctx.workspace.billing.readOnly &&
      (ctx.workspace.role.permissions.website?.update ?? null) !== null;
    if (!site) return { site: null, canEdit, sitesDomain: env().SITES_DOMAIN };
    const draft = parseContent(site.draft);
    if (!draft)
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Contenu du site illisible." });
    const published = site.published ? parseContent(site.published) : null;
    return {
      canEdit,
      sitesDomain: env().SITES_DOMAIN,
      site: {
        slug: site.slug,
        url: siteUrl(site.slug),
        domains: site.domains,
        theme: parseTheme(site.theme),
        draft,
        publishedAt: site.publishedAt,
        isPublished: Boolean(published),
        hasChanges: JSON.stringify(published) !== JSON.stringify(draft),
        checklist: websiteChecklist(draft),
        images: await previewUrls(ctx.organizationId, websiteFileIds(draft)),
      },
    };
  }),

  /** Crée le site, prérempli avec ce que le logiciel sait déjà de l'entreprise. */
  create: orgProcedure.mutation(async ({ ctx }) => {
    requireModule(ctx);
    authorize(ctx, "website", "create", "Votre rôle ne permet pas de créer le site.");
    const existing = await ctx.db.website.findFirst({ select: { slug: true } });
    if (existing) return { slug: existing.slug };
    const [settings, trade] = await Promise.all([
      ctx.db.salesSettings.findUnique({ where: { organizationId: ctx.organizationId } }),
      tradePresetFor(ctx.workspace.organization.trade),
    ]);
    const name = ctx.workspace.organization.name;
    const content = defaultWebsiteContent({
      name,
      phone: settings?.phone,
      email: settings?.email,
      address: settings?.address,
      postalCode: settings?.postalCode,
      city: settings?.city,
      tradeLabel: ctx.workspace.organization.trade ? trade.label : null,
      legalName: settings?.legalName,
      siret: settings?.siret,
    });
    const slug = await availableSlug(name);
    const accent = ctx.workspace.organization.preferences.accentColor;
    await ctx.db.website.create({
      data: {
        organizationId: ctx.organizationId,
        slug,
        draft: content,
        theme: websiteThemeSchema.parse(accent ? { accent } : {}),
      },
    });
    await recordAudit(ctx, { action: "website.create", entityType: "website", metadata: { slug } });
    return { slug };
  }),

  /** Enregistre le brouillon (rien n'est visible tant qu'il n'est pas publié). */
  save: orgProcedure
    .input(z.object({ content: websiteContentSchema, theme: websiteThemeSchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      requireModule(ctx);
      authorize(ctx, "website", "update", "Votre rôle ne permet pas de modifier le site.");
      const site = await ctx.db.website.findFirst({ select: { id: true } });
      if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Créez d'abord le site." });
      // Seules les images envoyées par cet espace pour son site sont acceptées.
      const ids = websiteFileIds(input.content);
      if (ids.length) {
        const owned = await ctx.db.storedFile.count({
          where: { id: { in: ids }, entityType: "website", deletedAt: null },
        });
        if (owned !== ids.length)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Une image est introuvable : renvoyez-la.",
          });
      }
      await ctx.db.website.update({
        where: { id: site.id },
        data: { draft: input.content, ...(input.theme ? { theme: input.theme } : {}) },
      });
      return { ok: true };
    }),

  /** Met en ligne le brouillon. */
  publish: orgProcedure.mutation(async ({ ctx }) => {
    requireModule(ctx);
    authorize(ctx, "website", "update", "Votre rôle ne permet pas de publier le site.");
    const site = await ctx.db.website.findFirst();
    if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Créez d'abord le site." });
    const draft = parseContent(site.draft);
    if (!draft) throw new TRPCError({ code: "BAD_REQUEST", message: "Contenu du site incomplet." });
    const now = new Date();
    await ctx.db.website.update({
      where: { id: site.id },
      data: { published: draft, publishedAt: now, publishedById: ctx.user.id },
    });
    await recordAudit(ctx, {
      action: "website.publish",
      entityType: "website",
      metadata: { slug: site.slug },
    });
    return { url: siteUrl(site.slug), publishedAt: now };
  }),

  /** Retire le site de la circulation (le brouillon est conservé). */
  unpublish: orgProcedure.mutation(async ({ ctx }) => {
    requireModule(ctx);
    authorize(ctx, "website", "update");
    await ctx.db.website.updateMany({ data: { published: Prisma.DbNull, publishedAt: null } });
    await recordAudit(ctx, { action: "website.unpublish", entityType: "website" });
    return { ok: true };
  }),

  /** Change l'adresse du site (<adresse>.<domaine des sites>). */
  setSlug: orgProcedure
    .input(z.object({ slug: websiteSlugSchema }))
    .mutation(async ({ ctx, input }) => {
      requireModule(ctx);
      authorize(ctx, "website", "admin", "Seuls les administrateurs changent l'adresse du site.");
      const taken = await prisma.website.findUnique({
        where: { slug: input.slug },
        select: { organizationId: true },
      });
      if (taken && taken.organizationId !== ctx.organizationId)
        throw new TRPCError({ code: "CONFLICT", message: "Cette adresse est déjà prise." });
      await ctx.db.website.updateMany({ data: { slug: input.slug } });
      await recordAudit(ctx, {
        action: "website.update",
        entityType: "website",
        metadata: { slug: input.slug },
      });
      return { url: siteUrl(input.slug) };
    }),

  /** Rattache un nom de domaine personnel (le réglage DNS est fait ensuite). */
  addDomain: orgProcedure
    .input(z.object({ domain: websiteDomainSchema }))
    .mutation(async ({ ctx, input }) => {
      requireModule(ctx);
      authorize(ctx, "website", "admin", "Seuls les administrateurs gèrent les domaines du site.");
      if (input.domain.endsWith(`.${env().SITES_DOMAIN}`))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Utilisez « Adresse du site » pour ce domaine.",
        });
      const used = await prisma.website.findFirst({
        where: { domains: { has: input.domain }, NOT: { organizationId: ctx.organizationId } },
        select: { id: true },
      });
      if (used)
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ce domaine est déjà rattaché à un autre site.",
        });
      const site = await ctx.db.website.findFirst({ select: { id: true, domains: true } });
      if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Créez d'abord le site." });
      if (site.domains.length >= 5)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cinq domaines au plus par site." });
      if (!site.domains.includes(input.domain))
        await ctx.db.website.update({
          where: { id: site.id },
          data: { domains: [...site.domains, input.domain] },
        });
      await recordAudit(ctx, {
        action: "website.update",
        entityType: "website",
        metadata: { domainAdded: input.domain },
      });
      return { ok: true };
    }),

  removeDomain: orgProcedure
    .input(z.object({ domain: z.string().max(253) }))
    .mutation(async ({ ctx, input }) => {
      requireModule(ctx);
      authorize(ctx, "website", "admin");
      const site = await ctx.db.website.findFirst({ select: { id: true, domains: true } });
      if (!site) return { ok: true };
      await ctx.db.website.update({
        where: { id: site.id },
        data: { domains: site.domains.filter((d) => d !== input.domain) },
      });
      await recordAudit(ctx, {
        action: "website.update",
        entityType: "website",
        metadata: { domainRemoved: input.domain },
      });
      return { ok: true };
    }),
});
