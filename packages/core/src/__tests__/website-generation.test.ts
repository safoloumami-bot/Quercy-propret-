import { describe, expect, it } from "vitest";

import {
  type WebsiteGeneration,
  applyWebsiteGeneration,
  defaultWebsiteContent,
  websiteThemeSchema,
} from "../website";

const generation: WebsiteGeneration = {
  hero: {
    eyebrow: "Coiffure à Figeac",
    title: "  Un salon chaleureux  ",
    subtitle: "",
    ctaLabel: "",
  },
  about: { title: "Le salon", text: "x".repeat(4000) },
  services: {
    title: "Prestations",
    intro: "",
    items: [
      { name: "Coupe", description: "Shampoing et coiffage.", price: "" },
      { name: " ", description: "vide", price: "" },
    ],
  },
  galleryTitle: "Le salon en photos",
  hoursNote: "",
  area: "",
  seo: { title: "Coiffeur à Figeac", description: "Salon de coiffure à Figeac." },
  sections: ["services", "services", "contact"],
  theme: { accent: "rouge", font: "serif" },
};

describe("site rédigé par l'assistant", () => {
  const current = defaultWebsiteContent({ name: "Salon Mona", phone: "05 65 00 00 42" });
  const theme = websiteThemeSchema.parse({});

  it("remplace les textes, garde les coordonnées et borne les longueurs", () => {
    const r = applyWebsiteGeneration(current, theme, generation, { catalogItems: 0 });
    expect(r.content.hero.title).toBe("Un salon chaleureux");
    expect(r.content.about.text).toHaveLength(3000);
    expect(r.content.contact.phone).toBe("05 65 00 00 42");
    expect(r.content.services.items.map((i) => i.name)).toEqual(["Coupe"]);
    expect(r.content.services.fromCatalog).toBe(false);
    expect(r.content.sections).toEqual(["services", "contact"]);
    // Couleur invalide : la couleur actuelle est gardée.
    expect(r.theme.accent).toBe(theme.accent);
    expect(r.theme.font).toBe("serif");
  });

  it("garde le catalogue quand l'entreprise en a un", () => {
    const r = applyWebsiteGeneration(current, theme, generation, { catalogItems: 4 });
    expect(r.content.services.fromCatalog).toBe(current.services.fromCatalog);
  });
});
