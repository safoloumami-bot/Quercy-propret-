import type { Etat, Site, Deploiement, Sauvegarde } from "./types";
import { genererSite } from "./generateur";

export const uid = () => Math.random().toString(36).slice(2, 10);
export const ilYa = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
export const dansJours = (j: number) => new Date(Date.now() + j * 86_400_000).toISOString();

const courbe = (base: number, n = 7) => Array.from({ length: n }, (_, i) => Math.round(base * (0.75 + 0.5 * Math.abs(Math.sin(i * 1.7 + base)))));

function deploiements(branche: string, msgs: string[]): Deploiement[] {
  return msgs.map((m, i) => ({
    id: uid(),
    date: ilYa(60 * (i * 19 + 2)),
    branche: i === 1 ? "feat/nouvelle-carte" : branche,
    commit: Math.random().toString(16).slice(2, 9),
    message: m,
    statut: i === 2 ? "echec" : "reussi",
    dureeSec: 24 + i * 7,
    environnement: i === 1 ? "apercu" : "production",
  }));
}

function sauvegardes(n: number, taille: number): Sauvegarde[] {
  return Array.from({ length: n }, (_, i) => ({ id: uid(), date: ilYa(60 * 24 * i + 180), type: "auto" as const, tailleMo: Math.round(taille * (1 - i * 0.01)) }));
}

export function etatDemo(nom = "Camille Martin", email = "camille@boulangerie-martin.fr", entreprise = "Boulangerie Martin"): Etat {
  const vitrine: Site = {
    id: "site-boulangerie",
    nom: "Boulangerie Martin",
    type: "ia",
    domaine: "boulangerie-martin.fr",
    statut: "en_ligne",
    region: "Europe (Francfort)",
    creeLe: ilYa(60 * 24 * 120),
    pile: "Créateur IA",
    visites7j: courbe(420),
    stockageMo: 640,
    disponibilite: 99.99,
    tempsReponseMs: 162,
    scorePerf: 96,
    co2gParVisite: 0.18,
    deploiements: [],
    sauvegardes: sauvegardes(14, 640),
    variables: [],
    cache: true,
    preproduction: false,
    genere: genererSite("Un site pour ma boulangerie « Boulangerie Martin » à Cahors, pain au levain et viennoiseries"),
  };
  const app: Site = {
    id: "site-commandes",
    nom: "Commandes en ligne",
    type: "git",
    domaine: "commandes.boulangerie-martin.fr",
    statut: "en_ligne",
    region: "Europe (Francfort)",
    creeLe: ilYa(60 * 24 * 40),
    depot: "github.com/camille-martin/commandes",
    branche: "main",
    pile: "Next.js 15 · Node 22",
    visites7j: courbe(180),
    stockageMo: 1280,
    disponibilite: 99.95,
    tempsReponseMs: 210,
    scorePerf: 91,
    co2gParVisite: 0.24,
    deploiements: deploiements("main", ["Ajout du créneau de retrait du dimanche", "Nouvelle carte d'automne", "Mise à jour Stripe", "Correction du calcul de TVA", "Page de confirmation"]),
    sauvegardes: sauvegardes(30, 1280),
    variables: [
      { cle: "DATABASE_URL", valeur: "postgres://app:••••••@db.interne:5432/commandes" },
      { cle: "STRIPE_SECRET_KEY", valeur: "sk_live_••••••••••••" },
      { cle: "NODE_ENV", valeur: "production" },
    ],
    cache: true,
    preproduction: true,
  };
  const blog: Site = {
    id: "site-blog",
    nom: "Blog recettes",
    type: "wordpress",
    domaine: "recettes.boulangerie-martin.fr",
    statut: "en_ligne",
    region: "Europe (Paris)",
    creeLe: ilYa(60 * 24 * 300),
    pile: "WordPress 6.8 · PHP 8.4",
    visites7j: courbe(260),
    stockageMo: 3400,
    disponibilite: 99.9,
    tempsReponseMs: 480,
    scorePerf: 68,
    co2gParVisite: 0.61,
    deploiements: [],
    sauvegardes: sauvegardes(30, 3400),
    variables: [],
    cache: false,
    preproduction: false,
  };

  return {
    connecte: true,
    compte: { nom, email, entreprise, offreId: "pro", periode: "annuel", creditsIA: 412, plafondMensuel: 40, doubleAuth: false },
    sites: [vitrine, app, blog],
    domaines: [
      {
        id: uid(), nom: "boulangerie-martin.fr", statut: "actif", expire: dansJours(212), renouvellementAuto: true, protectionWhois: true, siteId: vitrine.id,
        dns: [
          { id: uid(), type: "A", nom: "@", valeur: "185.230.63.107", ttl: 3600 },
          { id: uid(), type: "CNAME", nom: "www", valeur: "boulangerie-martin.fr", ttl: 3600 },
          { id: uid(), type: "CNAME", nom: "commandes", valeur: "edge.sebt.cloud", ttl: 300 },
          { id: uid(), type: "CNAME", nom: "recettes", valeur: "edge.sebt.cloud", ttl: 300 },
          { id: uid(), type: "MX", nom: "@", valeur: "10 mx1.sebt.email", ttl: 3600 },
          { id: uid(), type: "MX", nom: "@", valeur: "20 mx2.sebt.email", ttl: 3600 },
          { id: uid(), type: "TXT", nom: "@", valeur: "v=spf1 include:_spf.sebt.email ~all", ttl: 3600 },
        ],
      },
      { id: uid(), nom: "martin-cahors.com", statut: "actif", expire: dansJours(18), renouvellementAuto: false, protectionWhois: true, dns: [{ id: uid(), type: "A", nom: "@", valeur: "185.230.63.107", ttl: 3600 }] },
    ],
    boites: [
      { id: uid(), adresse: "camille@boulangerie-martin.fr", quotaGo: 15, utiliseGo: 6.2 },
      { id: uid(), adresse: "commandes@boulangerie-martin.fr", quotaGo: 15, utiliseGo: 11.8 },
      { id: uid(), adresse: "contact@boulangerie-martin.fr", quotaGo: 15, utiliseGo: 0.4, redirection: "camille@boulangerie-martin.fr" },
    ],
    vps: [
      { id: "vps-1", nom: "atelier-n8n", offreId: "vps-s", image: "Ubuntu 24.04 + Docker", ip: "82.165.41.22", region: "Europe (Francfort)", statut: "actif", creeLe: ilYa(60 * 24 * 60), cpu: courbe(28, 24), ramUtiliseGo: 2.1 },
    ],
    factures: [
      { id: uid(), numero: "SIL-2026-0412", date: ilYa(60 * 24 * 2), libelle: "Offre Pro (annuel) · Houle S", montantHT: 101.7, statut: "payee" },
      { id: uid(), numero: "SIL-2026-0388", date: ilYa(60 * 24 * 32), libelle: "Houle S · domaine martin-cahors.com", montantHT: 18.8, statut: "payee" },
      { id: uid(), numero: "SIL-2026-0351", date: ilYa(60 * 24 * 62), libelle: "Houle S", montantHT: 6.9, statut: "payee" },
    ],
    actions: [
      { id: uid(), date: ilYa(60 * 26), cible: "boulangerie-martin.fr", titre: "Images converties en WebP", detail: "14 images, 41 Mo → 5,3 Mo. Temps de réponse : 1,9 s → 162 ms.", annulable: true },
      { id: uid(), date: ilYa(60 * 24 * 5), cible: "recettes.boulangerie-martin.fr", titre: "Mise à jour de sécurité", detail: "WordPress 6.8.2 → 6.8.3 et 3 extensions. Sauvegarde préalable créée.", annulable: false },
    ],
    notifications: [
      { id: uid(), date: ilYa(35), texte: "Le domaine martin-cahors.com expire dans 18 jours et n'est pas en renouvellement automatique.", ton: "alerte", lue: false },
      { id: uid(), date: ilYa(60 * 3), texte: "Déploiement réussi sur commandes.boulangerie-martin.fr (31 s).", ton: "ok", lue: false },
      { id: uid(), date: ilYa(60 * 26), texte: "L'agent a optimisé boulangerie-martin.fr : score de performance 41 → 96.", ton: "info", lue: true },
    ],
  };
}
