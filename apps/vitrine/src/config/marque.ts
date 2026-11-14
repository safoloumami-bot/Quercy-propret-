// Tout ce qui définit la marque est ici : changer de nom ou de slogan se fait dans ce fichier.

export const marque = {
  nom: "sebt",
  domaine: "sebt.cloud",
  slogan: "Toute votre entreprise, en moins de temps.",
  accroche:
    "Clients, devis, factures, plannings, stocks et trésorerie dans un seul logiciel, avec un assistant IA qui agit seulement avec votre accord.",
  emailSupport: "bonjour@sebt.cloud",
  emailCommercial: "commercial@sebt.cloud",
  annee: 2026,
  /**
   * Adresse de l'application de gestion (le dépôt Quercy déployé). Réglable sans toucher au
   * code avec NEXT_PUBLIC_URL_LOGICIEL ; par défaut, l'adresse Render en attendant
   * app.sebt.cloud.
   */
  /** Adresse publique de cette vitrine (liens de partage, sitemap). Réglable avec NEXT_PUBLIC_URL_SITE. */
  urlSite: (process.env.NEXT_PUBLIC_URL_SITE || "https://sebt.onrender.com").replace(/\/$/, ""),
  urlLogiciel: (process.env.NEXT_PUBLIC_URL_LOGICIEL || "https://sebt-t5gw.onrender.com").replace(/\/$/, ""),
} as const;

export const liensLogiciel = {
  essai: `${marque.urlLogiciel}/inscription`,
  connexion: `${marque.urlLogiciel}/connexion`,
  contact: `mailto:${marque.emailCommercial}`,
} as const;

/** Menu du site public (logiciel de gestion). */
export const navigation = [
  { label: "Modules", href: "/#modules" },
  { label: "Assistant IA", href: "/#assistant" },
  { label: "Application terrain", href: "/#terrain" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "Sites et applis", href: "/sites" },
] as const;

/** Menu des pages « Sites et applis » (réalisation sur devis). */
export const navigationSites = [
  { label: "Aperçu gratuit", href: "/sites#createur" },
  { label: "Sur mesure", href: "/sites#sur-mesure" },
  { label: "Questions", href: "/sites#questions" },
  { label: "Logiciel de gestion", href: "/" },
] as const;
