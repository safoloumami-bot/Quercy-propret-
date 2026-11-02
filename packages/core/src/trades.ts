import { z } from "zod";

import type { ModuleKey } from "./modules";

/**
 * Corps de métier : un préréglage choisi à la création de l'espace (ou plus tard dans les
 * réglages) qui adapte le logiciel au métier de l'entreprise :
 * - modules conseillés ;
 * - catalogue de prestations types (prix indicatifs, unité, taux de TVA le plus courant) ;
 * - mentions des devis et factures (assurance décennale, TVA réduite des travaux) ;
 * - contexte donné à l'assistant IA (vocabulaire, règles du métier).
 *
 * Les prix sont des ordres de grandeur à ajuster par l'entreprise. Les règles citées
 * (TVA, décennale) sont à jour en 2026 ; l'entreprise reste responsable de leur application.
 */

export const TRADE_KEYS = [
  "cleaning",
  "plumbing",
  "electrical",
  "masonry",
  "painting",
  "carpentry",
  "roofing",
  "landscaping",
  "multiservice",
] as const;
export const tradeKeySchema = z.enum(TRADE_KEYS);
export type TradeKey = z.infer<typeof tradeKeySchema>;

/** Unités du catalogue (voir Product.unit). */
export type CatalogUnit = "unit" | "hour" | "day" | "flat" | "sqm" | "kg";

export interface CatalogItem {
  name: string;
  unit: CatalogUnit;
  /** Prix HT indicatif, en euros. */
  unitPrice: number;
  /** Taux de TVA le plus courant pour cette prestation (« 20 », « 10 », « 5.5 »). */
  vatRate: "20" | "10" | "5.5";
  category: string;
  description?: string;
}

export interface TradeDefinition {
  key: TradeKey;
  label: string;
  /** Une ligne pour l'assistant d'accueil. */
  hint: string;
  /** Secteur d'activité correspondant (voir INDUSTRIES). */
  industry: "cleaning" | "construction";
  modules: ModuleKey[];
  catalog: CatalogItem[];
  /** Assurance décennale obligatoire pour l'essentiel des travaux du métier. */
  decennial: boolean;
  /** Travaux dans des logements : TVA réduite de 10 % ou 5,5 % possible. */
  renovationVat: boolean;
  /** Ce que l'assistant IA doit savoir de ce métier. */
  assistant: string;
}

const TVA_TRAVAUX =
  "TVA des travaux dans un logement : 10 % pour l'amélioration, l'entretien et la rénovation d'un logement achevé depuis plus de deux ans ; 5,5 % pour les travaux d'amélioration de la performance énergétique (isolation, pompe à chaleur, fenêtres performantes…) ; 20 % pour le neuf, les locaux professionnels, l'agrandissement de plus de 10 % de la surface, et la fourniture ou l'installation d'une chaudière à combustible fossile depuis le 1er mars 2025. Depuis février 2025, l'attestation client (Cerfa) est remplacée par une mention que le client certifie sur le devis ou la facture.";
const DECENNALE =
  "Les devis et factures doivent indiquer l'assurance décennale (coordonnées de l'assureur, couverture géographique), avec l'attestation d'assurance jointe.";
const DEVIS_DEPANNAGE =
  "Pour un dépannage ou une réparation à domicile, un devis détaillé est obligatoire au-delà de 150 € TTC.";

export const TRADES: Record<TradeKey, TradeDefinition> = {
  cleaning: {
    key: "cleaning",
    label: "Nettoyage et propreté",
    hint: "Bureaux, copropriétés, vitres, fins de chantier",
    industry: "cleaning",
    modules: ["crm", "sales", "cleaning", "calendar", "hr", "inventory"],
    decennial: false,
    renovationVat: false,
    catalog: [
      {
        name: "Entretien de bureaux",
        unit: "hour",
        unitPrice: 28,
        vatRate: "20",
        category: "Entretien courant",
      },
      {
        name: "Nettoyage des parties communes (passage)",
        unit: "flat",
        unitPrice: 90,
        vatRate: "20",
        category: "Entretien courant",
      },
      {
        name: "Sortie et rentrée des conteneurs",
        unit: "flat",
        unitPrice: 15,
        vatRate: "20",
        category: "Entretien courant",
      },
      {
        name: "Nettoyage de vitres",
        unit: "sqm",
        unitPrice: 4,
        vatRate: "20",
        category: "Vitrerie",
      },
      {
        name: "Remise en état après travaux",
        unit: "sqm",
        unitPrice: 6,
        vatRate: "20",
        category: "Remise en état",
      },
      {
        name: "Shampouinage de moquette",
        unit: "sqm",
        unitPrice: 5,
        vatRate: "20",
        category: "Remise en état",
      },
    ],
    assistant:
      "Entreprise de nettoyage et de propreté. Les prestations récurrentes sont des contrats d'entretien rattachés à des sites clients, avec des passages planifiés et pointés par les agents (module Nettoyage et interventions). Clients typiques : entreprises, syndics de copropriété, commerces. Vocabulaire : passage, site, cahier des charges, contrôle qualité, fin de chantier, remise en état. TVA à 20 % pour les clients professionnels ; pour le ménage chez des particuliers, le taux et le crédit d'impôt dépendent de la déclaration de l'entreprise en services à la personne.",
  },
  plumbing: {
    key: "plumbing",
    label: "Plomberie et chauffage",
    hint: "Dépannage, sanitaires, chauffe-eau, chaudières, PAC",
    industry: "construction",
    modules: ["crm", "sales", "projects", "calendar", "purchases", "inventory"],
    decennial: true,
    renovationVat: true,
    catalog: [
      {
        name: "Déplacement et diagnostic",
        unit: "flat",
        unitPrice: 60,
        vatRate: "10",
        category: "Dépannage",
        description: "TVA 10 % : logement de plus de 2 ans (sinon 20 %).",
      },
      {
        name: "Main-d'œuvre plomberie",
        unit: "hour",
        unitPrice: 55,
        vatRate: "10",
        category: "Dépannage",
      },
      {
        name: "Recherche de fuite",
        unit: "flat",
        unitPrice: 150,
        vatRate: "10",
        category: "Dépannage",
      },
      {
        name: "Débouchage de canalisation",
        unit: "flat",
        unitPrice: 150,
        vatRate: "10",
        category: "Dépannage",
      },
      {
        name: "Remplacement de mitigeur",
        unit: "flat",
        unitPrice: 180,
        vatRate: "10",
        category: "Sanitaires",
      },
      {
        name: "Remplacement de chauffe-eau électrique 200 L",
        unit: "flat",
        unitPrice: 1200,
        vatRate: "10",
        category: "Eau chaude",
      },
      {
        name: "Entretien annuel de chaudière",
        unit: "flat",
        unitPrice: 140,
        vatRate: "10",
        category: "Chauffage",
      },
      {
        name: "Chaudière gaz à condensation (fourniture et pose)",
        unit: "flat",
        unitPrice: 4500,
        vatRate: "20",
        category: "Chauffage",
        description:
          "Taux normal obligatoire depuis le 1er mars 2025 pour les chaudières à combustible fossile.",
      },
      {
        name: "Pompe à chaleur air/eau (fourniture et pose)",
        unit: "flat",
        unitPrice: 12000,
        vatRate: "5.5",
        category: "Chauffage",
        description: "5,5 % si les critères de performance énergétique sont remplis.",
      },
    ],
    assistant: `Plombier-chauffagiste : dépannages, sanitaires, eau chaude, chauffage. ${TVA_TRAVAUX} ${DECENNALE} ${DEVIS_DEPANNAGE} Pour les aides à la rénovation énergétique (MaPrimeRénov', CEE), le client doit faire appel à une entreprise RGE.`,
  },
  electrical: {
    key: "electrical",
    label: "Électricité",
    hint: "Dépannage, mise aux normes, rénovation, domotique",
    industry: "construction",
    modules: ["crm", "sales", "projects", "calendar", "purchases", "inventory"],
    decennial: true,
    renovationVat: true,
    catalog: [
      {
        name: "Déplacement et diagnostic",
        unit: "flat",
        unitPrice: 60,
        vatRate: "10",
        category: "Dépannage",
        description: "TVA 10 % : logement de plus de 2 ans (sinon 20 %).",
      },
      {
        name: "Main-d'œuvre électricité",
        unit: "hour",
        unitPrice: 50,
        vatRate: "10",
        category: "Dépannage",
      },
      {
        name: "Recherche et réparation de panne",
        unit: "flat",
        unitPrice: 120,
        vatRate: "10",
        category: "Dépannage",
      },
      {
        name: "Mise aux normes du tableau électrique",
        unit: "flat",
        unitPrice: 1200,
        vatRate: "10",
        category: "Mise aux normes",
      },
      {
        name: "Création d'un point lumineux",
        unit: "unit",
        unitPrice: 120,
        vatRate: "10",
        category: "Installation",
      },
      {
        name: "Ajout d'une prise de courant",
        unit: "unit",
        unitPrice: 90,
        vatRate: "10",
        category: "Installation",
      },
      {
        name: "Visiophone (fourniture et pose)",
        unit: "unit",
        unitPrice: 450,
        vatRate: "10",
        category: "Installation",
      },
    ],
    assistant: `Électricien : dépannages, mises aux normes (NF C 15-100), rénovation et installations neuves. ${TVA_TRAVAUX} ${DECENNALE} ${DEVIS_DEPANNAGE} Une installation neuve ou entièrement rénovée nécessite souvent une attestation de conformité (Consuel) avant la mise en service.`,
  },
  masonry: {
    key: "masonry",
    label: "Maçonnerie et gros œuvre",
    hint: "Murs, dalles, ouvertures, extensions, rénovation",
    industry: "construction",
    modules: ["crm", "sales", "projects", "purchases", "calendar", "documents"],
    decennial: true,
    renovationVat: true,
    catalog: [
      {
        name: "Main-d'œuvre maçonnerie",
        unit: "hour",
        unitPrice: 48,
        vatRate: "10",
        category: "Main-d'œuvre",
        description: "TVA 10 % : logement de plus de 2 ans (sinon 20 %).",
      },
      {
        name: "Ouverture de mur porteur (avec IPN)",
        unit: "flat",
        unitPrice: 3500,
        vatRate: "10",
        category: "Gros œuvre",
      },
      {
        name: "Mur en parpaings",
        unit: "sqm",
        unitPrice: 70,
        vatRate: "10",
        category: "Gros œuvre",
      },
      {
        name: "Dalle béton",
        unit: "sqm",
        unitPrice: 85,
        vatRate: "10",
        category: "Gros œuvre",
        description: "20 % si elle agrandit la surface de plus de 10 %.",
      },
      { name: "Enduit de façade", unit: "sqm", unitPrice: 55, vatRate: "10", category: "Façade" },
      {
        name: "Évacuation des gravats",
        unit: "flat",
        unitPrice: 250,
        vatRate: "10",
        category: "Chantier",
      },
    ],
    assistant: `Maçon : gros œuvre, ouvertures, extensions, façades. ${TVA_TRAVAUX} ${DECENNALE} Les travaux qui touchent la structure ou agrandissent le bâti peuvent nécessiter une déclaration préalable ou un permis de construire ; c'est au client de les obtenir, mais il est utile de le lui rappeler.`,
  },
  painting: {
    key: "painting",
    label: "Peinture et plâtrerie",
    hint: "Peinture, papier peint, cloisons, ravalement",
    industry: "construction",
    modules: ["crm", "sales", "projects", "purchases", "calendar"],
    decennial: false,
    renovationVat: true,
    catalog: [
      {
        name: "Préparation des supports (enduit, ponçage)",
        unit: "sqm",
        unitPrice: 12,
        vatRate: "10",
        category: "Peinture",
        description: "TVA 10 % : logement de plus de 2 ans (sinon 20 %).",
      },
      {
        name: "Peinture murs et plafonds (2 couches)",
        unit: "sqm",
        unitPrice: 28,
        vatRate: "10",
        category: "Peinture",
      },
      {
        name: "Pose de papier peint",
        unit: "sqm",
        unitPrice: 30,
        vatRate: "10",
        category: "Revêtements",
      },
      {
        name: "Cloison en plaques de plâtre",
        unit: "sqm",
        unitPrice: 45,
        vatRate: "10",
        category: "Plâtrerie",
      },
      {
        name: "Ravalement de façade",
        unit: "sqm",
        unitPrice: 60,
        vatRate: "10",
        category: "Façade",
      },
      {
        name: "Main-d'œuvre peinture",
        unit: "hour",
        unitPrice: 42,
        vatRate: "10",
        category: "Main-d'œuvre",
      },
    ],
    assistant: `Peintre et plâtrier : peinture intérieure, revêtements, cloisons, ravalement. ${TVA_TRAVAUX} La peinture purement décorative n'est en général pas soumise à l'assurance décennale, contrairement aux cloisons, à l'isolation ou à certains ravalements : dans ce cas, la mention de l'assurance doit figurer sur les devis et factures.`,
  },
  carpentry: {
    key: "carpentry",
    label: "Menuiserie et agencement",
    hint: "Portes, fenêtres, cuisines, dressings, parquets",
    industry: "construction",
    modules: ["crm", "sales", "projects", "purchases", "inventory", "calendar"],
    decennial: true,
    renovationVat: true,
    catalog: [
      {
        name: "Main-d'œuvre menuiserie",
        unit: "hour",
        unitPrice: 50,
        vatRate: "10",
        category: "Main-d'œuvre",
        description: "TVA 10 % : logement de plus de 2 ans (sinon 20 %).",
      },
      {
        name: "Porte intérieure (fourniture et pose)",
        unit: "unit",
        unitPrice: 450,
        vatRate: "10",
        category: "Menuiserie intérieure",
      },
      {
        name: "Fenêtre double vitrage (fourniture et pose)",
        unit: "unit",
        unitPrice: 900,
        vatRate: "5.5",
        category: "Menuiserie extérieure",
        description:
          "5,5 % si elle remplace une fenêtre existante et remplit les critères de performance énergétique.",
      },
      {
        name: "Parquet massif (pose)",
        unit: "sqm",
        unitPrice: 75,
        vatRate: "10",
        category: "Sols",
      },
      {
        name: "Dressing sur mesure",
        unit: "flat",
        unitPrice: 2500,
        vatRate: "10",
        category: "Agencement",
      },
      {
        name: "Escalier en bois",
        unit: "flat",
        unitPrice: 4500,
        vatRate: "10",
        category: "Agencement",
      },
    ],
    assistant: `Menuisier : menuiseries intérieures et extérieures, agencement sur mesure, sols. ${TVA_TRAVAUX} ${DECENNALE} Un meuble livré sans pose relève du taux normal de 20 %.`,
  },
  roofing: {
    key: "roofing",
    label: "Couverture et charpente",
    hint: "Toitures, zinguerie, fuites, isolation des combles",
    industry: "construction",
    modules: ["crm", "sales", "projects", "purchases", "calendar"],
    decennial: true,
    renovationVat: true,
    catalog: [
      {
        name: "Recherche de fuite et bâchage",
        unit: "flat",
        unitPrice: 350,
        vatRate: "10",
        category: "Dépannage",
        description: "TVA 10 % : logement de plus de 2 ans (sinon 20 %).",
      },
      {
        name: "Réfection de toiture en tuiles",
        unit: "sqm",
        unitPrice: 120,
        vatRate: "10",
        category: "Couverture",
      },
      {
        name: "Gouttière zinc (mètre linéaire)",
        unit: "unit",
        unitPrice: 65,
        vatRate: "10",
        category: "Zinguerie",
      },
      {
        name: "Démoussage et traitement hydrofuge",
        unit: "sqm",
        unitPrice: 25,
        vatRate: "10",
        category: "Entretien",
      },
      {
        name: "Isolation des combles perdus",
        unit: "sqm",
        unitPrice: 40,
        vatRate: "5.5",
        category: "Isolation",
        description: "5,5 % si les critères de performance énergétique sont remplis.",
      },
      {
        name: "Main-d'œuvre couverture",
        unit: "hour",
        unitPrice: 50,
        vatRate: "10",
        category: "Main-d'œuvre",
      },
    ],
    assistant: `Couvreur et charpentier : toitures, zinguerie, charpente, isolation des combles. ${TVA_TRAVAUX} ${DECENNALE} Les interventions en hauteur imposent des protections collectives (échafaudage, garde-corps) à prévoir dans le devis.`,
  },
  landscaping: {
    key: "landscaping",
    label: "Paysage et espaces verts",
    hint: "Création, entretien, taille, élagage",
    industry: "construction",
    modules: ["crm", "sales", "projects", "calendar", "purchases"],
    decennial: false,
    renovationVat: false,
    catalog: [
      {
        name: "Tonte et entretien de pelouse",
        unit: "hour",
        unitPrice: 40,
        vatRate: "20",
        category: "Entretien",
      },
      {
        name: "Taille de haies",
        unit: "hour",
        unitPrice: 42,
        vatRate: "20",
        category: "Entretien",
      },
      { name: "Élagage d'arbre", unit: "flat", unitPrice: 450, vatRate: "20", category: "Élagage" },
      {
        name: "Création de massif",
        unit: "sqm",
        unitPrice: 60,
        vatRate: "20",
        category: "Création",
      },
      {
        name: "Gazon en rouleau (fourniture et pose)",
        unit: "sqm",
        unitPrice: 18,
        vatRate: "20",
        category: "Création",
      },
      {
        name: "Évacuation des déchets verts",
        unit: "flat",
        unitPrice: 90,
        vatRate: "20",
        category: "Chantier",
      },
    ],
    assistant:
      "Paysagiste : création et entretien de jardins et d'espaces verts. Clients : particuliers, copropriétés, entreprises, collectivités. L'entretien de jardin chez un particulier peut ouvrir droit à un crédit d'impôt et à un taux de TVA réduit si l'entreprise est déclarée en services à la personne ; sinon, TVA à 20 %. Les ouvrages maçonnés (murets, terrasses) peuvent relever de l'assurance décennale.",
  },
  multiservice: {
    key: "multiservice",
    label: "Multiservice et dépannage",
    hint: "Petits travaux, serrurerie, montage, entretien",
    industry: "construction",
    modules: ["crm", "sales", "calendar", "projects", "inventory"],
    decennial: true,
    renovationVat: true,
    catalog: [
      {
        name: "Déplacement",
        unit: "flat",
        unitPrice: 45,
        vatRate: "10",
        category: "Dépannage",
        description: "TVA 10 % : logement de plus de 2 ans (sinon 20 %).",
      },
      {
        name: "Main-d'œuvre petits travaux",
        unit: "hour",
        unitPrice: 45,
        vatRate: "10",
        category: "Dépannage",
      },
      {
        name: "Remplacement de serrure",
        unit: "flat",
        unitPrice: 180,
        vatRate: "10",
        category: "Serrurerie",
      },
      {
        name: "Petite intervention de plomberie",
        unit: "flat",
        unitPrice: 120,
        vatRate: "10",
        category: "Plomberie",
      },
      {
        name: "Pose d'étagères ou de fixations",
        unit: "unit",
        unitPrice: 35,
        vatRate: "10",
        category: "Pose",
      },
      {
        name: "Montage de meubles",
        unit: "hour",
        unitPrice: 40,
        vatRate: "20",
        category: "Montage",
        description: "Le montage de mobilier ne relève pas des travaux dans le logement.",
      },
    ],
    assistant: `Entreprise multiservice : petits travaux, dépannages et entretien chez les particuliers et les entreprises. ${TVA_TRAVAUX} ${DECENNALE} ${DEVIS_DEPANNAGE}`,
  },
};

/** Mention de l'assurance décennale proposée par défaut (à compléter par l'entreprise). */
export const DEFAULT_INSURANCE_MENTION =
  "Assurance professionnelle : responsabilité civile décennale souscrite auprès de [nom et adresse de l'assureur], contrat n° [numéro], couverture géographique : [France métropolitaine]. Attestation d'assurance jointe.";

/**
 * Mention de certification par le client pour les taux réduits de TVA des travaux
 * (loi de finances pour 2025, qui remplace les attestations Cerfa 1300-SD et 1301-SD).
 * Ajoutée automatiquement aux devis et factures qui comportent une ligne à 10 % ou 5,5 %.
 */
export const RENOVATION_VAT_MENTION =
  "TVA à taux réduit : en acceptant ce document, le client certifie que les travaux portent sur des locaux à usage d'habitation achevés depuis plus de deux ans et qu'ils remplissent les conditions d'application du taux de 10 % (article 279-0 bis du CGI) ou de 5,5 % (article 278-0 bis A du CGI). Il conserve un exemplaire de ce document.";

export function tradeDefinition(key: string | null | undefined): TradeDefinition | null {
  const parsed = tradeKeySchema.safeParse(key);
  return parsed.success ? TRADES[parsed.data] : null;
}
