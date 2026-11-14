import { marque } from "@/config/marque";

/** Insère des données structurées (schema.org) lisibles par Google et les assistants IA. */
function JsonLd({ donnees }: { donnees: Record<string, unknown> }) {
  // « < » échappé : un texte ne peut pas refermer la balise script.
  const json = JSON.stringify(donnees).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/** Questions fréquentes : les mêmes textes que ceux affichés dans la page. */
export function DonneesFaq({ questions }: { questions: readonly (readonly string[])[] }) {
  return (
    <JsonLd
      donnees={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: questions.map(([q, r]) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: r },
        })),
      }}
    />
  );
}

/** L'éditeur et le logiciel, pour la page d'accueil. */
export function DonneesLogiciel() {
  return (
    <>
      <JsonLd
        donnees={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: marque.nom,
          url: marque.urlSite,
          logo: `${marque.urlSite}/apple-touch-icon.png`,
          email: marque.emailSupport,
        }}
      />
      <JsonLd
        donnees={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: marque.nom,
          description: marque.accroche,
          url: marque.urlSite,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web, Windows, macOS, Linux",
          inLanguage: "fr",
          offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", description: "Offre gratuite sans limite de durée" },
        }}
      />
    </>
  );
}
