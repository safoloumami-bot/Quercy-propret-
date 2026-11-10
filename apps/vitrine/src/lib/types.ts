import type { SiteGenere } from "./generateur";

export type TypeSite = "ia" | "wordpress" | "git" | "docker" | "statique";
export type StatutSite = "en_ligne" | "deploiement" | "arrete" | "erreur";

export interface Deploiement {
  id: string;
  date: string;
  branche: string;
  commit: string;
  message: string;
  statut: "reussi" | "echec" | "en_cours";
  dureeSec: number;
  environnement: "production" | "preproduction" | "apercu";
}

export interface Sauvegarde {
  id: string;
  date: string;
  type: "auto" | "manuelle" | "avant_action";
  tailleMo: number;
  note?: string;
}

export interface Site {
  id: string;
  nom: string;
  type: TypeSite;
  domaine: string;
  statut: StatutSite;
  region: string;
  creeLe: string;
  depot?: string;
  branche?: string;
  pile: string; // ex. "Next.js", "WordPress 6.8", "PHP 8.4"
  visites7j: number[];
  stockageMo: number;
  disponibilite: number; // %
  tempsReponseMs: number;
  scorePerf: number;
  co2gParVisite: number;
  deploiements: Deploiement[];
  sauvegardes: Sauvegarde[];
  variables: { cle: string; valeur: string }[];
  cache: boolean;
  preproduction: boolean;
  genere?: SiteGenere;
}

export interface EnregistrementDns {
  id: string;
  type: "A" | "AAAA" | "CNAME" | "MX" | "TXT";
  nom: string;
  valeur: string;
  ttl: number;
}

export interface Domaine {
  id: string;
  nom: string;
  statut: "actif" | "en_attente" | "transfert";
  expire: string;
  renouvellementAuto: boolean;
  protectionWhois: boolean;
  siteId?: string;
  dns: EnregistrementDns[];
}

export interface BoiteMail {
  id: string;
  adresse: string;
  quotaGo: number;
  utiliseGo: number;
  redirection?: string;
}

export interface Vps {
  id: string;
  nom: string;
  offreId: string;
  image: string;
  ip: string;
  region: string;
  statut: "actif" | "arrete" | "creation";
  creeLe: string;
  cpu: number[]; // % sur 24 points
  ramUtiliseGo: number;
}

export interface Facture {
  id: string;
  numero: string;
  date: string;
  libelle: string;
  montantHT: number;
  statut: "payee" | "a_venir";
}

export interface ActionAgent {
  id: string;
  date: string;
  cible: string;
  titre: string;
  detail: string;
  annulable: boolean;
  annulee?: boolean;
}

export interface Notification {
  id: string;
  date: string;
  texte: string;
  ton: "info" | "ok" | "alerte";
  lue: boolean;
}

export interface Compte {
  nom: string;
  email: string;
  entreprise: string;
  offreId: "essentiel" | "pro" | "studio";
  periode: "mensuel" | "annuel";
  creditsIA: number;
  plafondMensuel: number;
  doubleAuth: boolean;
}

export interface Etat {
  connecte: boolean;
  compte: Compte;
  sites: Site[];
  domaines: Domaine[];
  boites: BoiteMail[];
  vps: Vps[];
  factures: Facture[];
  actions: ActionAgent[];
  notifications: Notification[];
}
