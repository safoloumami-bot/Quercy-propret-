import { describe, expect, it } from "vitest";

import {
  defaultWebsiteContent,
  websiteChecklist,
  websiteContentSchema,
  websiteDomainSchema,
  websiteFileIds,
  websiteSlugSchema,
} from "../website";

describe("Site web", () => {
  const base = defaultWebsiteContent({
    name: "Durand Plomberie",
    phone: "05 65 00 00 00",
    city: "Cahors",
    tradeLabel: "Plomberie et chauffage",
    legalName: "Durand SARL",
    siret: "12345678900012",
  });

  it("le contenu de départ est valide et reprend ce que l'on sait de l'entreprise", () => {
    expect(websiteContentSchema.safeParse(base).success).toBe(true);
    expect(base.hero.title).toBe("Plomberie et chauffage à Cahors");
    expect(base.contact.phone).toBe("05 65 00 00 00");
    expect(base.legal.publisher).toContain("SIRET 12345678900012");
    expect(base.hours.days).toHaveLength(7);
    expect(base.hours.days.find((d) => d.day === "sun")?.closed).toBe(true);
  });

  it("la liste « à compléter » guide sans bloquer", () => {
    expect(websiteChecklist(base)).toContain("Une photo d'accueil");
    const complete = {
      ...base,
      hero: { ...base.hero, image: { fileId: "f1", alt: "" } },
      about: { ...base.about, text: "Depuis 2008." },
      gallery: { ...base.gallery, images: [{ fileId: "f2", alt: "" }] },
    };
    expect(websiteChecklist(complete)).toEqual([]);
  });

  it("recense les images utilisées (seules celles-là sont servies publiquement)", () => {
    const c = {
      ...base,
      logo: { fileId: "logo", alt: "" },
      gallery: {
        title: "",
        images: [
          { fileId: "a", alt: "" },
          { fileId: "a", alt: "" },
        ],
      },
    };
    expect(websiteFileIds(c).sort()).toEqual(["a", "logo"]);
  });

  it("adresses et domaines", () => {
    expect(websiteSlugSchema.parse("Durand-Plomberie")).toBe("durand-plomberie");
    expect(websiteSlugSchema.safeParse("-x").success).toBe(false);
    expect(websiteDomainSchema.parse("www.Durand-Plomberie.fr")).toBe("www.durand-plomberie.fr");
    expect(websiteDomainSchema.safeParse("durand").success).toBe(false);
    expect(websiteDomainSchema.safeParse("https://durand.fr").success).toBe(false);
  });

  it("refuse un email de contact invalide", () => {
    expect(
      websiteContentSchema.safeParse({
        ...base,
        contact: { ...base.contact, email: "pas-un-email" },
      }).success,
    ).toBe(false);
  });
});
