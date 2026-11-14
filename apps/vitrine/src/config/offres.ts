// Grille tarifaire. Les montants sont HT et indicatifs : ajustez-les selon vos coûts réels
// chez IONOS (serveurs, domaines, emails) et la marge visée. Une seule source de vérité :
// la landing, la page Tarifs et l'espace client lisent tous ce fichier.

export type Periode = "mensuel" | "annuel";

export interface OffreWeb {
  id: "essentiel" | "pro" | "studio";
  nom: string;
  pour: string;
  prixMensuel: number; // sans engagement
  prixAnnuel: number; // prix par mois si payé à l'année
  misEnAvant?: boolean;
  creditsIA: number; // par mois
  points: string[];
}

export const offresWeb: OffreWeb[] = [
  {
    id: "essentiel",
    nom: "Essentiel",
    pour: "Un site vitrine, un portfolio, un premier projet",
    prixMensuel: 4.9,
    prixAnnuel: 3.9,
    creditsIA: 150,
    points: [
      "1 site ou application",
      "25 Go de stockage NVMe",
      "5 boîtes mail pro (5 Go chacune)",
      "Sauvegardes quotidiennes, 14 jours d'historique",
      "Certificat SSL et CDN européen",
      "Créateur de site IA",
      "Domaine offert la 1re année (paiement annuel)",
    ],
  },
  {
    id: "pro",
    nom: "Pro",
    pour: "Les indépendants et PME qui font tourner plusieurs projets",
    prixMensuel: 9.9,
    prixAnnuel: 7.9,
    misEnAvant: true,
    creditsIA: 600,
    points: [
      "10 sites ou applications",
      "100 Go de stockage NVMe",
      "50 boîtes mail pro (15 Go chacune)",
      "Sauvegardes quotidiennes, 30 jours, plus à la demande",
      "Déploiement Git, Node.js, Python, PHP et Docker",
      "Préproduction en 1 clic et prévisualisation par branche",
      "Surveillance de disponibilité et page de statut",
      "Agent IA : diagnostic et corrections",
    ],
  },
  {
    id: "studio",
    nom: "Studio",
    pour: "Agences et freelances qui gèrent des sites clients",
    prixMensuel: 24.9,
    prixAnnuel: 19.9,
    creditsIA: 2500,
    points: [
      "Sites illimités (usage raisonnable)",
      "250 Go NVMe, 4 vCPU et 8 Go de RAM réservés",
      "Boîtes mail illimitées (25 Go chacune)",
      "Marque blanche : votre logo, votre domaine",
      "Accès client final et transfert de propriété",
      "Facturation de vos clients depuis sebt",
      "Support prioritaire, réponse humaine en moins d'1 h",
    ],
  },
];

export interface OffreVps {
  id: string;
  nom: string;
  vcpu: number;
  ramGo: number;
  disqueGo: number;
  traficTo: number;
  prixMensuel: number;
  misEnAvant?: boolean;
}

export const offresVps: OffreVps[] = [
  { id: "vps-s", nom: "Houle S", vcpu: 2, ramGo: 4, disqueGo: 80, traficTo: 4, prixMensuel: 6.9 },
  { id: "vps-m", nom: "Houle M", vcpu: 4, ramGo: 8, disqueGo: 160, traficTo: 8, prixMensuel: 12.9, misEnAvant: true },
  { id: "vps-l", nom: "Houle L", vcpu: 8, ramGo: 16, disqueGo: 320, traficTo: 16, prixMensuel: 24.9 },
  { id: "vps-xl", nom: "Houle XL", vcpu: 12, ramGo: 32, disqueGo: 640, traficTo: 32, prixMensuel: 46.9 },
];

export const inclusVps = [
  "Accès root et API publique",
  "Images Ubuntu, Debian, AlmaLinux, Docker et Coolify",
  "Snapshots manuels et sauvegarde hebdomadaire",
  "Protection anti-DDoS et pare-feu géré",
  "Terminal web avec assistant IA",
  "Facturation à l'heure, plafonnée au mois",
];

export const extensionsDomaines = [
  { ext: ".fr", prix: 7.9 },
  { ext: ".com", prix: 11.9 },
  { ext: ".eu", prix: 6.9 },
  { ext: ".io", prix: 39.0 },
  { ext: ".app", prix: 15.9 },
  { ext: ".shop", prix: 4.9 },
  { ext: ".studio", prix: 24.9 },
  { ext: ".net", prix: 13.9 },
];

export const comparatif: { categorie: string; lignes: { label: string; valeurs: [string, string, string] }[] }[] = [
  {
    categorie: "Hébergement",
    lignes: [
      { label: "Sites et applications", valeurs: ["1", "10", "Illimités"] },
      { label: "Stockage NVMe", valeurs: ["25 Go", "100 Go", "250 Go"] },
      { label: "Ressources réservées", valeurs: ["Partagées", "2 vCPU · 4 Go", "4 vCPU · 8 Go"] },
      { label: "Trafic", valeurs: ["Illimité", "Illimité", "Illimité"] },
      { label: "Node.js, Python, PHP", valeurs: ["PHP", "Oui", "Oui"] },
      { label: "Conteneurs Docker", valeurs: ["—", "Oui", "Oui"] },
      { label: "Déploiement Git", valeurs: ["—", "Oui", "Oui"] },
      { label: "Préproduction et prévisualisation", valeurs: ["—", "Oui", "Oui"] },
    ],
  },
  {
    categorie: "Sécurité et sauvegardes",
    lignes: [
      { label: "SSL automatique", valeurs: ["Oui", "Oui", "Oui"] },
      { label: "Sauvegardes", valeurs: ["Quotidiennes, 14 j", "Quotidiennes, 30 j", "Toutes les 6 h, 60 j"] },
      { label: "Pare-feu applicatif (WAF)", valeurs: ["Oui", "Oui", "Oui"] },
      { label: "Analyse antimalware", valeurs: ["Hebdomadaire", "Quotidienne", "Temps réel"] },
      { label: "Double authentification", valeurs: ["Oui", "Oui", "Oui"] },
    ],
  },
  {
    categorie: "Domaines et emails",
    lignes: [
      { label: "Domaine offert 1 an", valeurs: ["Annuel", "Annuel", "Annuel"] },
      { label: "Boîtes mail", valeurs: ["5", "50", "Illimitées"] },
      { label: "Anti-spam et antivirus", valeurs: ["Oui", "Oui", "Oui"] },
    ],
  },
  {
    categorie: "IA",
    lignes: [
      { label: "Crédits IA par mois", valeurs: ["150", "600", "2 500"] },
      { label: "Créateur de site IA", valeurs: ["Oui", "Oui", "Oui"] },
      { label: "Agent IA (diagnostic, corrections)", valeurs: ["Conseils", "Oui", "Oui + automatisations"] },
      { label: "Report des crédits non utilisés", valeurs: ["1 mois", "3 mois", "6 mois"] },
    ],
  },
  {
    categorie: "Agences",
    lignes: [
      { label: "Marque blanche", valeurs: ["—", "—", "Oui"] },
      { label: "Accès client final", valeurs: ["—", "—", "Oui"] },
      { label: "Membres de l'équipe", valeurs: ["1", "3", "Illimités"] },
    ],
  },
];

export function euros(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}
