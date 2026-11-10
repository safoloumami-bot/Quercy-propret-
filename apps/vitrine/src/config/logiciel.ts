// Le logiciel de gestion sebt (dépôt Quercy) : modules et offres, repris de
// packages/core/src/modules.ts et packages/core/src/billing.ts du dépôt Quercy.
// Gardez ces deux fichiers alignés quand les offres changent.

export type CategorieModule = "relation" | "finance" | "operations" | "personnes" | "plateforme";

export const categories: Record<CategorieModule, string> = {
  relation: "Relation client",
  finance: "Finance",
  operations: "Opérations",
  personnes: "Équipe",
  plateforme: "Plateforme",
};

export interface ModuleLogiciel {
  cle: string;
  nom: string;
  description: string;
  categorie: CategorieModule;
}

export const modules: ModuleLogiciel[] = [
  { cle: "crm", nom: "Contacts & CRM", description: "Entreprises, contacts, prospects et pipeline de ventes.", categorie: "relation" },
  { cle: "sales", nom: "Ventes & facturation", description: "Catalogue, devis, factures électroniques, avoirs et relances graduées.", categorie: "finance" },
  { cle: "purchases", nom: "Achats & dépenses", description: "Fournisseurs, bons de commande, factures reçues lues sans ressaisie, notes de frais.", categorie: "finance" },
  { cle: "inventory", nom: "Stocks & inventaire", description: "Articles, entrepôts, mouvements, alertes et valorisation.", categorie: "operations" },
  { cle: "projects", nom: "Projets & tâches", description: "Projets, tâches, Kanban, Gantt et suivi du temps.", categorie: "operations" },
  { cle: "cleaning", nom: "Nettoyage & interventions", description: "Sites clients, contrats d'entretien, planning des agents, pointage, signatures et contrôles qualité.", categorie: "operations" },
  { cle: "calendar", nom: "Agenda", description: "Calendrier partagé, rendez-vous et rappels.", categorie: "operations" },
  { cle: "support", nom: "Support client", description: "Tickets, priorités, SLA et réponses types.", categorie: "relation" },
  { cle: "hr", nom: "Ressources humaines", description: "Fiches employés, congés, planning et entretiens.", categorie: "personnes" },
  { cle: "treasury", nom: "Trésorerie & comptabilité", description: "Encaissements, rapprochement bancaire, prévisionnel et export FEC.", categorie: "finance" },
  { cle: "documents", nom: "Documents", description: "Dossiers, aperçus, versions et partage par lien.", categorie: "plateforme" },
  { cle: "automations", nom: "Automatisations", description: "Règles « quand… alors… » et journal d'exécution.", categorie: "plateforme" },
  { cle: "integrations", nom: "Intégrations", description: "API publique, webhooks et connecteurs.", categorie: "plateforme" },
];

/** Remise de l'engagement annuel et durée de l'essai Business (sans carte). */
export const remiseAnnuelle = 0.2;
export const joursEssai = 14;

export interface OffreLogiciel {
  cle: "gratuit" | "pro" | "business" | "entreprise";
  nom: string;
  accroche: string;
  /** Prix HT par utilisateur et par mois ; null = sur devis. */
  prixMensuel: number | null;
  points: string[];
  misEnAvant?: boolean;
  bouton: string;
}

export const offresLogiciel: OffreLogiciel[] = [
  {
    cle: "gratuit",
    nom: "Gratuit",
    accroche: "Pour démarrer seul.",
    prixMensuel: 0,
    points: ["1 utilisateur", "2 modules au choix", "1 Go de stockage", "50 crédits IA par mois"],
    bouton: "Commencer gratuitement",
  },
  {
    cle: "pro",
    nom: "Pro",
    accroche: "Pour les petites équipes.",
    prixMensuel: 15,
    points: ["Utilisateurs illimités", "6 modules au choix", "10 Go par utilisateur", "500 crédits IA par utilisateur et par mois"],
    bouton: "Choisir Pro",
  },
  {
    cle: "business",
    nom: "Business",
    accroche: "Tout sebt, sans limite de modules.",
    prixMensuel: 29,
    misEnAvant: true,
    points: ["Tous les modules", "Automatisations", "50 Go par utilisateur", "3 000 crédits IA par utilisateur et par mois"],
    bouton: `Essai gratuit ${joursEssai} jours`,
  },
  {
    cle: "entreprise",
    nom: "Entreprise",
    accroche: "Pour les grandes organisations.",
    prixMensuel: null,
    points: ["Tout Business", "Hébergement dédié possible", "Accompagnement et SLA", "Facturation sur devis"],
    bouton: "Nous contacter",
  },
];

export function prixParMois(o: OffreLogiciel, annuel: boolean) {
  if (o.prixMensuel === null) return null;
  return annuel ? Math.round(o.prixMensuel * (1 - remiseAnnuelle) * 100) / 100 : o.prixMensuel;
}

export const comparatifLogiciel: { label: string; valeurs: [string, string, string, string] }[] = [
  { label: "Utilisateurs", valeurs: ["1", "Illimités", "Illimités", "Illimités"] },
  { label: "Modules", valeurs: ["2 au choix", "6 au choix", "Tous", "Tous"] },
  { label: "Stockage", valeurs: ["1 Go", "10 Go par utilisateur", "50 Go par utilisateur", "200 Go par utilisateur"] },
  { label: "Crédits IA par mois", valeurs: ["50", "500 par utilisateur", "3 000 par utilisateur", "10 000 par utilisateur"] },
  { label: "Automatisations", valeurs: ["—", "—", "Oui", "Oui"] },
  { label: "Hébergement dédié", valeurs: ["—", "—", "—", "Possible"] },
  { label: "Accompagnement et SLA", valeurs: ["—", "—", "—", "Oui"] },
];

/** Corps de métier (repris de packages/core/src/trades.ts du dépôt Quercy, version courte). */
export interface MetierLogiciel {
  cle: string;
  nom: string;
  exemple: string;
  prestations: { nom: string; prix: string; tva: string }[];
  decennale: boolean;
  tvaTravaux: boolean;
  assistant: string;
}

export const metiersLogiciel: MetierLogiciel[] = [
  {
    cle: "cleaning", nom: "Nettoyage", exemple: "Bureaux, copropriétés, vitres, fins de chantier", decennale: false, tvaTravaux: false,
    prestations: [{ nom: "Entretien de bureaux", prix: "28 € / h", tva: "20 %" }, { nom: "Parties communes (passage)", prix: "90 €", tva: "20 %" }, { nom: "Nettoyage de vitres", prix: "4 € / m²", tva: "20 %" }],
    assistant: "Contrats d'entretien, passages planifiés et pointés, contrôles qualité.",
  },
  {
    cle: "plumbing", nom: "Plomberie", exemple: "Dépannage, sanitaires, chauffe-eau, chaudières, PAC", decennale: true, tvaTravaux: true,
    prestations: [{ nom: "Recherche de fuite", prix: "150 €", tva: "10 %" }, { nom: "Chaudière gaz à condensation", prix: "4 500 €", tva: "20 %" }, { nom: "Pompe à chaleur air/eau", prix: "12 000 €", tva: "5,5 %" }],
    assistant: "Sait qu'une chaudière fioul ou gaz est à 20 % depuis mars 2025, et qu'un dépannage au-delà de 150 € TTC exige un devis.",
  },
  {
    cle: "electrical", nom: "Électricité", exemple: "Dépannage, mise aux normes, rénovation", decennale: true, tvaTravaux: true,
    prestations: [{ nom: "Mise aux normes du tableau", prix: "1 200 €", tva: "10 %" }, { nom: "Création d'un point lumineux", prix: "120 €", tva: "10 %" }, { nom: "Recherche de panne", prix: "120 €", tva: "10 %" }],
    assistant: "Connaît la NF C 15-100 et rappelle l'attestation Consuel quand il le faut.",
  },
  {
    cle: "masonry", nom: "Maçonnerie", exemple: "Murs, dalles, ouvertures, extensions", decennale: true, tvaTravaux: true,
    prestations: [{ nom: "Ouverture de mur porteur", prix: "3 500 €", tva: "10 %" }, { nom: "Mur en parpaings", prix: "70 € / m²", tva: "10 %" }, { nom: "Évacuation des gravats", prix: "250 €", tva: "10 %" }],
    assistant: "Signale qu'un agrandissement de plus de 10 % de la surface repasse à 20 %.",
  },
  {
    cle: "painting", nom: "Peinture", exemple: "Peinture, papier peint, cloisons, ravalement", decennale: false, tvaTravaux: true,
    prestations: [{ nom: "Murs et plafonds (2 couches)", prix: "28 € / m²", tva: "10 %" }, { nom: "Cloison en plaques de plâtre", prix: "45 € / m²", tva: "10 %" }, { nom: "Ravalement de façade", prix: "60 € / m²", tva: "10 %" }],
    assistant: "Distingue la peinture décorative des travaux soumis à la décennale.",
  },
  {
    cle: "carpentry", nom: "Menuiserie", exemple: "Portes, fenêtres, agencement, parquets", decennale: true, tvaTravaux: true,
    prestations: [{ nom: "Porte intérieure posée", prix: "450 €", tva: "10 %" }, { nom: "Fenêtre double vitrage", prix: "900 €", tva: "5,5 %" }, { nom: "Dressing sur mesure", prix: "2 500 €", tva: "10 %" }],
    assistant: "Rappelle qu'un meuble livré sans pose est à 20 %.",
  },
  {
    cle: "roofing", nom: "Couverture", exemple: "Toitures, zinguerie, isolation des combles", decennale: true, tvaTravaux: true,
    prestations: [{ nom: "Recherche de fuite et bâchage", prix: "350 €", tva: "10 %" }, { nom: "Réfection en tuiles", prix: "120 € / m²", tva: "10 %" }, { nom: "Isolation des combles", prix: "40 € / m²", tva: "5,5 %" }],
    assistant: "Pense aux protections pour le travail en hauteur dans les devis.",
  },
  {
    cle: "landscaping", nom: "Paysage", exemple: "Création, entretien, taille, élagage", decennale: false, tvaTravaux: false,
    prestations: [{ nom: "Tonte et entretien", prix: "40 € / h", tva: "20 %" }, { nom: "Élagage d'arbre", prix: "450 €", tva: "20 %" }, { nom: "Création de massif", prix: "60 € / m²", tva: "20 %" }],
    assistant: "Connaît les règles des services à la personne pour les particuliers.",
  },
  {
    cle: "multiservice", nom: "Multiservice", exemple: "Petits travaux, serrurerie, dépannage", decennale: true, tvaTravaux: true,
    prestations: [{ nom: "Remplacement de serrure", prix: "180 €", tva: "10 %" }, { nom: "Petite intervention plomberie", prix: "120 €", tva: "10 %" }, { nom: "Montage de meubles", prix: "40 € / h", tva: "20 %" }],
    assistant: "Applique le bon taux selon que le travail touche ou non le logement.",
  },
];

/** Mots qui désignent chaque métier (version courte de TRADE_KEYWORDS du dépôt Quercy). */
const motsMetiers: Record<string, string[]> = {
  cleaning: ["nettoyage", "menage", "proprete", "vitrerie", "vitres", "entretien de bureaux", "parties communes", "desinfection"],
  plumbing: ["plombier", "plomberie", "chauffagiste", "chauffage", "chaudiere", "sanitaire", "salle de bain", "pompe a chaleur", "fuite", "climatisation"],
  electrical: ["electricien", "electricite", "electrique", "domotique", "borne de recharge", "photovoltaique", "alarme", "cablage"],
  masonry: ["macon", "maconnerie", "gros oeuvre", "beton", "terrassement", "extension", "batiment", "renovation complete"],
  painting: ["peintre", "peinture", "platrier", "plaquiste", "placo", "papier peint", "ravalement", "carreleur", "carrelage"],
  carpentry: ["menuisier", "menuiserie", "ebeniste", "agencement", "cuisiniste", "parquet", "fenetre", "dressing", "escalier"],
  roofing: ["couvreur", "couverture", "toiture", "toit", "charpente", "charpentier", "zinguerie", "gouttiere", "demoussage"],
  landscaping: ["paysagiste", "jardinier", "jardin", "espaces verts", "elagage", "tonte", "taille de haies"],
  multiservice: ["multiservice", "multiservices", "bricolage", "petits travaux", "serrurier", "serrurerie", "montage de meubles"],
};

/** Reconnaît le métier dans une phrase (« plombier à Toulouse » → plumbing), ou null. */
export function reconnaitreMetier(texte: string): string | null {
  const t = texte.toLowerCase().replace(/œ/g, "oe").normalize("NFD").replace(/[̀-ͯ]/g, "");
  let meilleur: string | null = null;
  let max = 0;
  for (const [cle, mots] of Object.entries(motsMetiers)) {
    const n = mots.filter((m) => new RegExp(`(^|[^a-z])${m}(s|x|es)?($|[^a-z])`).test(t)).length;
    if (n > max) [meilleur, max] = [cle, n];
  }
  return meilleur;
}
