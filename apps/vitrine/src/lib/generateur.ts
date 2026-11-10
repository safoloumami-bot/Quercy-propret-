import { directions, metiers, type Metier } from "./metiers";
import { luminance } from "./couleurs";

// Générateur de site « IA » simulé. Il lit la description, devine le secteur, le nom et la
// ville, puis compose un site. En production, cette fonction est remplacée par un appel à un
// modèle (ex. API Claude) qui renvoie la même structure JSON : l'interface ne change pas.

export type TypeSection =
  | "atouts" | "services" | "menu" | "tarifs" | "galerie" | "apropos" | "chiffres"
  | "etapes" | "horaires" | "faq" | "appel" | "contact";

export interface SectionSite {
  type: TypeSection;
  surtitre?: string;
  titre: string;
  texte?: string;
  cta?: string;
  items?: { titre: string; texte?: string; prix?: string; tag?: string }[];
}

/** Paires de polices : titres / texte courant. */
export type Typo = "elegante" | "editoriale" | "moderne" | "chaleureuse";
/** Mise en page du premier écran. */
export type Mise = "plein" | "partage" | "editorial";
/** Illustration générée pour les visuels (en attendant les vraies photos du client). */
export type Motif = "assiette" | "pain" | "arche" | "outil" | "elan" | "objet" | "cadre" | "colonne" | "vague" | "fleur";

export interface SiteGenere {
  nom: string;
  secteur: string;
  ville?: string;
  palette: { fond: string; texte: string; accent: string; doux: string };
  /** Conservé pour compatibilité ; `typo` est prioritaire. */
  police: "serif" | "sans";
  typo?: Typo;
  mise?: Mise;
  motif?: Motif;
  arrondi?: "net" | "doux" | "pilule";
  hero: { surtitre: string; titre: string; sousTitre: string; cta: string; ctaSecondaire?: string };
  infos?: { bandeau?: string; telephone?: string; email?: string; adresse?: string };
  sections: SectionSite[];
}

interface Modele {
  cle: string;
  motsCles: string[];
  nomParDefaut: string;
  palette: SiteGenere["palette"];
  typo: Typo;
  mise: Mise;
  motif: Motif;
  arrondi: NonNullable<SiteGenere["arrondi"]>;
  bandeau?: (ville?: string) => string;
  hero: (nom: string, ville?: string) => SiteGenere["hero"];
  sections: (nom: string, ville?: string) => SectionSite[];
}

const dansVille = (v?: string) => (v ? ` à ${v}` : "");
const serifs: Typo[] = ["elegante", "editoriale"];

// Les contenus sont des brouillons rédigés pour être modifiés : aucun avis client ni chiffre
// d'activité inventé. Les engagements (délais, garanties) sont à confirmer par le client.
const modeles: Modele[] = [
  {
    cle: "Boulangerie",
    motsCles: ["boulangerie", "boulanger", "pâtisserie", "patisserie", "viennoiserie", "pain"],
    nomParDefaut: "Au Pain Doré",
    palette: { fond: "#fbf6ee", texte: "#2e2014", accent: "#a8551f", doux: "#f2e6d4" },
    typo: "elegante",
    mise: "plein",
    motif: "pain",
    arrondi: "pilule",
    bandeau: () => "Ouvert du mardi au dimanche dès 6 h 30 · Commandez la veille avant 18 h",
    hero: (n, v) => ({ surtitre: `Artisan boulanger${dansVille(v)}`, titre: `${n}, pétri à la main chaque matin`, sousTitre: "Pains au levain, viennoiseries pur beurre et pâtisseries de saison. Commandez la veille, retirez le matin.", cta: "Commander en ligne", ctaSecondaire: "Voir nos pains" }),
    sections: () => [
      { type: "atouts", titre: "Ce qui fait la différence", items: [
        { titre: "Levain naturel", texte: "Une fermentation lente pour un pain qui a du goût et qui se garde." },
        { titre: "Farines de la région", texte: "Des meuniers proches, des blés choisis pour leur saveur." },
        { titre: "Pur beurre", texte: "Viennoiseries façonnées sur place, chaque nuit." },
      ] },
      { type: "menu", surtitre: "Au comptoir", titre: "Nos incontournables", items: [
        { titre: "Tradition au levain", texte: "Croûte craquante, mie alvéolée", prix: "1,40 €" },
        { titre: "Pain de campagne 800 g", texte: "Seigle et froment, 24 h de pousse", prix: "4,20 €" },
        { titre: "Croissant pur beurre", texte: "Feuilletage en trois tours", prix: "1,20 €" },
        { titre: "Pain au chocolat", texte: "Deux barres de chocolat noir", prix: "1,30 €" },
        { titre: "Tarte aux fruits de saison", texte: "Pâte sablée, crème d'amande", prix: "3,80 €" },
        { titre: "Flan pâtissier", texte: "Vanille de Madagascar", prix: "3,20 €" },
      ] },
      { type: "galerie", surtitre: "Le fournil", titre: "Sortis du four ce matin", items: [{ titre: "Le levain" }, { titre: "Les viennoiseries" }, { titre: "Les tartes" }, { titre: "Le fournil" }] },
      { type: "apropos", surtitre: "Notre histoire", titre: "Le temps, notre premier ingrédient", texte: "Farines locales, levain naturel et fermentation lente : nous prenons le temps qu'il faut. Chaque nuit, l'équipe façonne à la main ce que vous trouverez au comptoir le matin." },
      { type: "horaires", titre: "Horaires", items: [{ titre: "Mardi – Samedi", texte: "6 h 30 – 19 h 30" }, { titre: "Dimanche", texte: "7 h – 13 h" }, { titre: "Lundi", texte: "Fermé" }] },
      { type: "appel", titre: "Commandez la veille, c'est prêt le matin.", texte: "Réservez vos pains et gâteaux en ligne, retirez-les sans attendre.", cta: "Commander en ligne" },
      { type: "contact", surtitre: "Venir nous voir", titre: "Passer au fournil" },
    ],
  },
  {
    cle: "Restauration",
    motsCles: ["restaurant", "bistrot", "brasserie", "café", "cafe", "pizzeria", "traiteur", "cuisine", "food", "bar à vin"],
    nomParDefaut: "La Table du Marché",
    palette: { fond: "#fbf5ec", texte: "#2b1d14", accent: "#b4471f", doux: "#f1e2cf" },
    typo: "editoriale",
    mise: "plein",
    motif: "assiette",
    arrondi: "pilule",
    bandeau: () => "Service du mardi au samedi, midi et soir · Réservation conseillée le week-end",
    hero: (n, v) => ({ surtitre: `Cuisine de saison${dansVille(v)}`, titre: `${n}, le goût du vrai`, sousTitre: "Des produits locaux, une carte qui change avec le marché et une équipe qui aime recevoir.", cta: "Réserver une table", ctaSecondaire: "Voir la carte" }),
    sections: () => [
      { type: "atouts", titre: "Notre cuisine", items: [
        { titre: "Le marché d'abord", texte: "La carte suit les arrivages et change chaque semaine." },
        { titre: "Tout est fait maison", texte: "Du pain aux desserts, rien n'arrive tout prêt en cuisine." },
        { titre: "Des vins choisis", texte: "Une cave courte, des vignerons que nous connaissons." },
      ] },
      { type: "menu", surtitre: "Entrées, plats, desserts", titre: "La carte du moment", items: [
        { titre: "Velouté de potimarron", texte: "Noisettes torréfiées, huile de courge", prix: "9 €" },
        { titre: "Œuf parfait", texte: "Champignons des bois, crème de lard", prix: "11 €" },
        { titre: "Magret rôti", texte: "Purée de céleri, jus corsé", prix: "24 €" },
        { titre: "Dos de cabillaud", texte: "Beurre blanc, poireaux fondants", prix: "22 €" },
        { titre: "Tarte fine aux pommes", texte: "Crème crue, caramel au beurre salé", prix: "8 €" },
        { titre: "Mousse au chocolat", texte: "Grué de cacao, fleur de sel", prix: "8 €" },
      ] },
      { type: "galerie", surtitre: "L'ambiance", titre: "Une salle chaleureuse, une cuisine ouverte", items: [{ titre: "La salle" }, { titre: "La cuisine" }, { titre: "La terrasse" }, { titre: "La cave" }] },
      { type: "apropos", surtitre: "Notre histoire", titre: "Cuisiner simplement les bons produits", texte: "Tout a commencé par l'envie de travailler avec les fermes voisines. Chaque matin, le chef compose la carte selon les arrivages, et la salle vous accueille comme à la maison." },
      { type: "horaires", titre: "Horaires", items: [{ titre: "Mardi – Samedi", texte: "12 h – 14 h · 19 h – 22 h" }, { titre: "Dimanche", texte: "12 h – 15 h" }, { titre: "Lundi", texte: "Fermé" }] },
      { type: "appel", titre: "Une table vous attend.", texte: "Réservez en ligne en moins d'une minute.", cta: "Réserver une table" },
      { type: "contact", surtitre: "Nous trouver", titre: "Venir au restaurant" },
    ],
  },
  {
    cle: "Beauté & bien-être",
    motsCles: ["coiffure", "coiffeur", "salon", "beauté", "beaute", "esthétique", "esthetique", "spa", "massage", "barbier", "ongles", "onglerie", "institut"],
    nomParDefaut: "Atelier Lumière",
    palette: { fond: "#faf6f4", texte: "#2a2224", accent: "#9c5566", doux: "#f1e4e6" },
    typo: "elegante",
    mise: "partage",
    motif: "arche",
    arrondi: "pilule",
    bandeau: () => "Réservation en ligne 24 h/24 · Ouvert du mardi au samedi",
    hero: (n, v) => ({ surtitre: `Salon${dansVille(v)}`, titre: `Prenez soin de vous chez ${n}`, sousTitre: "Coupes, couleurs et soins sur mesure, dans un lieu calme pensé pour vous.", cta: "Prendre rendez-vous", ctaSecondaire: "Voir les prestations" }),
    sections: () => [
      { type: "atouts", titre: "L'atelier", items: [
        { titre: "Un diagnostic offert", texte: "Avant chaque prestation, on écoute et on conseille." },
        { titre: "Des produits choisis", texte: "Respectueux du cheveu, de la peau et de l'environnement." },
        { titre: "Un lieu apaisant", texte: "Lumière douce, thé offert, aucun rendez-vous à la chaîne." },
      ] },
      { type: "tarifs", surtitre: "Prestations", titre: "Nos soins et tarifs", items: [
        { titre: "Coupe & brushing", texte: "45 min · shampoing et soin inclus", prix: "45 €" },
        { titre: "Couleur végétale", texte: "1 h 30 · diagnostic compris", prix: "65 €" },
        { titre: "Soin profond", texte: "30 min · massage du cuir chevelu", prix: "30 €" },
        { titre: "Balayage", texte: "2 h · effet naturel", prix: "95 €" },
        { titre: "Coupe homme", texte: "30 min", prix: "28 €" },
        { titre: "Barbe", texte: "20 min · serviette chaude", prix: "20 €" },
      ] },
      { type: "etapes", surtitre: "Comment ça se passe", titre: "Votre rendez-vous", items: [
        { titre: "Réservez en ligne", texte: "Choisissez la prestation et le créneau qui vous conviennent." },
        { titre: "Diagnostic", texte: "On prend le temps de comprendre ce que vous souhaitez." },
        { titre: "Le soin", texte: "Une prestation sans précipitation, conseils inclus." },
      ] },
      { type: "galerie", surtitre: "Le salon", titre: "Un lieu pensé pour vous", items: [{ titre: "L'accueil" }, { titre: "Les bacs" }, { titre: "L'espace soin" }, { titre: "Les produits" }] },
      { type: "horaires", titre: "Horaires", items: [{ titre: "Mardi – Vendredi", texte: "9 h – 19 h" }, { titre: "Samedi", texte: "9 h – 17 h" }, { titre: "Dimanche – Lundi", texte: "Fermé" }] },
      { type: "appel", titre: "Un moment pour vous, cette semaine ?", cta: "Prendre rendez-vous" },
      { type: "contact", surtitre: "Nous trouver", titre: "Le salon" },
    ],
  },
  {
    cle: "Artisan",
    motsCles: ["plombier", "électricien", "electricien", "menuisier", "artisan", "maçon", "macon", "peintre", "couvreur", "chauffagiste", "rénovation", "renovation", "bâtiment", "batiment", "paysagiste", "jardinier", "nettoyage", "propreté", "serrurier"],
    nomParDefaut: "Durand & Fils",
    palette: { fond: "#f6f7f4", texte: "#18211d", accent: "#c4561b", doux: "#e8ebe4" },
    typo: "moderne",
    mise: "partage",
    motif: "outil",
    arrondi: "net",
    bandeau: () => "Urgence ? Intervention rapide, 6 jours sur 7 · Devis gratuit",
    hero: (n, v) => ({ surtitre: `Artisan qualifié${dansVille(v)}`, titre: `${n} : un travail soigné, des délais tenus`, sousTitre: "Devis gratuit et détaillé, prix annoncé à l'avance, chantier propre et garanti.", cta: "Demander un devis", ctaSecondaire: "Nos services" }),
    sections: () => [
      { type: "atouts", titre: "Nos engagements", items: [
        { titre: "Devis sous 48 h", texte: "Gratuit, détaillé, sans engagement." },
        { titre: "Prix ferme", texte: "Le prix du devis est celui de la facture." },
        { titre: "Garantie", texte: "Travaux assurés et garantis selon la réglementation." },
      ] },
      { type: "services", surtitre: "Ce que nous faisons", titre: "Nos services", items: [
        { titre: "Dépannage", texte: "Fuite, panne, urgence : on intervient vite." },
        { titre: "Installation", texte: "Du conseil à la mise en service, clé en main." },
        { titre: "Rénovation", texte: "Salle de bain, cuisine, mise aux normes." },
        { titre: "Entretien", texte: "Contrats annuels pour éviter les mauvaises surprises." },
        { titre: "Économies d'énergie", texte: "Équipements performants et aides disponibles." },
        { titre: "Conseil", texte: "Un avis honnête avant de vous lancer." },
      ] },
      { type: "etapes", surtitre: "Simple et clair", titre: "Comment ça marche", items: [
        { titre: "Vous décrivez", texte: "Par téléphone ou via le formulaire, photos à l'appui." },
        { titre: "Devis sous 48 h", texte: "Un prix ferme, détaillé ligne par ligne." },
        { titre: "Intervention", texte: "À la date convenue, chantier laissé propre." },
        { titre: "Suivi", texte: "Facture claire et garantie sur nos travaux." },
      ] },
      { type: "galerie", surtitre: "Réalisations", titre: "Nos chantiers récents", items: [{ titre: "Salle de bain", tag: "Rénovation" }, { titre: "Chaudière", tag: "Installation" }, { titre: "Cuisine", tag: "Rénovation" }, { titre: "Tableau électrique", tag: "Mise aux normes" }] },
      { type: "faq", surtitre: "Questions fréquentes", titre: "Vos questions", items: [
        { titre: "Le devis est-il vraiment gratuit ?", texte: "Oui, gratuit et sans engagement, déplacement compris dans notre zone d'intervention." },
        { titre: "Intervenez-vous en urgence ?", texte: "Oui, du lundi au samedi. Appelez-nous directement pour les urgences." },
        { titre: "Proposez-vous un paiement en plusieurs fois ?", texte: "Oui, pour les chantiers importants. Parlons-en lors du devis." },
      ] },
      { type: "appel", titre: "Un projet ? Votre devis sous 48 h.", cta: "Demander un devis" },
      { type: "contact", surtitre: "Contact", titre: "Parlons de votre projet" },
    ],
  },
  {
    cle: "Coaching & sport",
    motsCles: ["coach", "coaching", "sport", "fitness", "yoga", "pilates", "musculation", "nutrition", "running", "personal trainer", "salle de sport"],
    nomParDefaut: "Élan Coaching",
    palette: { fond: "#0f1412", texte: "#f1f4f0", accent: "#c6f432", doux: "#1a221e" },
    typo: "chaleureuse",
    mise: "editorial",
    motif: "elan",
    arrondi: "pilule",
    hero: (n, v) => ({ surtitre: `Coaching${dansVille(v)} et en ligne`, titre: "Devenez la version la plus forte de vous-même", sousTitre: `${n} vous accompagne avec des programmes adaptés à votre niveau, votre emploi du temps et vos objectifs.`, cta: "Séance découverte offerte", ctaSecondaire: "Voir les formules" }),
    sections: () => [
      { type: "atouts", titre: "La méthode", items: [
        { titre: "Sur mesure", texte: "Un programme construit pour vous, pas un plan générique." },
        { titre: "Progressif", texte: "Des objectifs atteignables, semaine après semaine." },
        { titre: "Suivi réel", texte: "Ajustements, conseils et motivation entre les séances." },
      ] },
      { type: "etapes", surtitre: "Comment on avance", titre: "De la première séance à l'objectif", items: [
        { titre: "Bilan", texte: "On mesure, on écoute, on fixe le cap." },
        { titre: "Programme", texte: "Un plan clair, semaine par semaine." },
        { titre: "Séances", texte: "En salle, en extérieur ou en visio." },
        { titre: "Suivi", texte: "On ajuste tant qu'il le faut." },
      ] },
      { type: "tarifs", surtitre: "Formules", titre: "Choisissez votre rythme", items: [
        { titre: "Séance individuelle", texte: "1 h, bilan inclus la première fois", prix: "50 €" },
        { titre: "Pack 10 séances", texte: "Valable 4 mois, suivi entre les séances", prix: "420 €", tag: "Le plus choisi" },
        { titre: "Suivi en ligne", texte: "Programme et échanges chaque semaine", prix: "79 €/mois" },
      ] },
      { type: "faq", surtitre: "Questions fréquentes", titre: "Avant de commencer", items: [
        { titre: "Faut-il un bon niveau pour commencer ?", texte: "Non. Le programme part de votre niveau actuel, quel qu'il soit." },
        { titre: "Où ont lieu les séances ?", texte: "En salle, en extérieur ou à domicile selon la formule choisie." },
        { titre: "La séance découverte engage-t-elle à quelque chose ?", texte: "Non, elle sert à faire connaissance et à définir vos objectifs." },
      ] },
      { type: "appel", titre: "On commence quand ?", texte: "La première séance est offerte.", cta: "Réserver ma séance" },
      { type: "contact", surtitre: "Contact", titre: "Parlons de vos objectifs" },
    ],
  },
  {
    cle: "Boutique en ligne",
    motsCles: ["boutique", "e-commerce", "ecommerce", "vente", "vendre", "produits", "shop", "magasin", "bijoux", "vêtements", "vetements", "cosmétiques", "cosmetiques", "créations", "creations", "céramique", "ceramique", "bougies"],
    nomParDefaut: "Maison Sable",
    palette: { fond: "#f7f4ee", texte: "#1f1b16", accent: "#2f5d50", doux: "#ebe5d9" },
    typo: "editoriale",
    mise: "editorial",
    motif: "objet",
    arrondi: "net",
    bandeau: () => "Livraison offerte dès 60 € · Retours gratuits sous 30 jours",
    hero: (n) => ({ surtitre: "Nouvelle collection", titre: `${n}, des pièces faites pour durer`, sousTitre: "Fabriqué en petites séries, expédié sous 48 h, retours gratuits pendant 30 jours.", cta: "Découvrir la boutique", ctaSecondaire: "Notre atelier" }),
    sections: () => [
      { type: "galerie", surtitre: "La sélection", titre: "Meilleures ventes", items: [{ titre: "Pièce n° 1", prix: "59 €" }, { titre: "Pièce n° 2", prix: "28 €" }, { titre: "Pièce n° 3", prix: "45 €" }, { titre: "Pièce n° 4", prix: "24 €" }] },
      { type: "atouts", titre: "Nos engagements", items: [
        { titre: "Fait main", texte: "Chaque pièce est fabriquée en petite série." },
        { titre: "Expédié sous 48 h", texte: "Emballage soigné, sans plastique." },
        { titre: "Retours gratuits", texte: "30 jours pour changer d'avis." },
      ] },
      { type: "apropos", surtitre: "L'atelier", titre: "Des objets qui ont une histoire", texte: "Nous dessinons et fabriquons chaque pièce dans notre atelier, avec des matières choisies pour durer. Pas de surproduction : de petites séries, renouvelées au fil des saisons." },
      { type: "faq", surtitre: "Questions fréquentes", titre: "Commander en confiance", items: [
        { titre: "Quels sont les délais de livraison ?", texte: "Expédition sous 48 h ouvrées, livraison en 2 à 4 jours en France." },
        { titre: "Comment retourner un article ?", texte: "Depuis votre compte, en un clic : l'étiquette de retour est offerte." },
        { titre: "Le paiement est-il sécurisé ?", texte: "Oui, par carte ou portefeuille numérique, sur une page chiffrée." },
      ] },
      { type: "appel", titre: "Les nouveautés en avant-première.", texte: "Une lettre par mois, pas plus.", cta: "S'inscrire" },
      { type: "contact", surtitre: "Service client", titre: "Une question ?" },
    ],
  },
  {
    cle: "Portfolio",
    motsCles: ["photographe", "photo", "portfolio", "designer", "graphiste", "illustrateur", "architecte", "artiste", "vidéaste", "videaste", "développeur", "developpeur", "freelance"],
    nomParDefaut: "Studio Clair",
    palette: { fond: "#ffffff", texte: "#111111", accent: "#2f4fd1", doux: "#f2f3f6" },
    typo: "moderne",
    mise: "editorial",
    motif: "cadre",
    arrondi: "net",
    hero: (n, v) => ({ surtitre: `Portfolio${dansVille(v)}`, titre: `${n}`, sousTitre: "Des projets visuels pensés avec soin, du premier croquis à la livraison finale.", cta: "Voir les projets", ctaSecondaire: "Me contacter" }),
    sections: () => [
      { type: "galerie", surtitre: "Travaux", titre: "Projets sélectionnés", items: [{ titre: "Projet 01", tag: "Identité" }, { titre: "Projet 02", tag: "Édition" }, { titre: "Projet 03", tag: "Web" }, { titre: "Projet 04", tag: "Photo" }, { titre: "Projet 05", tag: "Identité" }, { titre: "Projet 06", tag: "Photo" }] },
      { type: "services", surtitre: "Prestations", titre: "Ce que je propose", items: [
        { titre: "Direction artistique", texte: "Une ligne visuelle claire pour votre projet." },
        { titre: "Création", texte: "Du concept aux fichiers prêts à l'emploi." },
        { titre: "Accompagnement", texte: "Un interlocuteur unique, du début à la fin." },
      ] },
      { type: "apropos", surtitre: "À propos", titre: "Bonjour, je suis [votre prénom].", texte: "Indépendant, je travaille avec des marques, des studios et des institutions culturelles. J'aime les projets où l'on prend le temps de bien faire." },
      { type: "etapes", surtitre: "Méthode", titre: "Comment je travaille", items: [
        { titre: "Écoute", texte: "On définit ensemble le besoin et le budget." },
        { titre: "Pistes", texte: "Deux ou trois directions, présentées et argumentées." },
        { titre: "Livraison", texte: "Fichiers finaux, guide d'usage et suivi." },
      ] },
      { type: "appel", titre: "Un projet en tête ?", cta: "Écrivez-moi" },
      { type: "contact", surtitre: "Contact", titre: "Travaillons ensemble" },
    ],
  },
  {
    cle: "Conseil",
    motsCles: ["avocat", "cabinet", "conseil", "consultant", "comptable", "expert", "notaire", "agence", "immobilier", "assurance", "formation"],
    nomParDefaut: "Cabinet Valmont",
    palette: { fond: "#f5f6f8", texte: "#14213d", accent: "#8a6a3a", doux: "#e6e9ef" },
    typo: "editoriale",
    mise: "partage",
    motif: "colonne",
    arrondi: "net",
    hero: (n, v) => ({ surtitre: `Cabinet${dansVille(v)}`, titre: "Un accompagnement clair, des décisions sereines", sousTitre: `${n} conseille entreprises et particuliers avec rigueur et disponibilité.`, cta: "Prendre rendez-vous", ctaSecondaire: "Nos domaines" }),
    sections: () => [
      { type: "atouts", titre: "Notre approche", items: [
        { titre: "Disponibles", texte: "Un premier retour rapide et un interlocuteur dédié." },
        { titre: "Transparents", texte: "Honoraires annoncés avant toute intervention." },
        { titre: "Pédagogues", texte: "Des explications claires, sans jargon." },
      ] },
      { type: "services", surtitre: "Expertises", titre: "Domaines d'intervention", items: [
        { titre: "Entreprises", texte: "Création, contrats, gouvernance." },
        { titre: "Particuliers", texte: "Patrimoine, famille, immobilier." },
        { titre: "Contentieux", texte: "Négociation et représentation." },
        { titre: "Social", texte: "Relations avec les salariés, procédures." },
        { titre: "Fiscalité", texte: "Optimisation dans le respect des règles." },
        { titre: "Accompagnement", texte: "Un conseil dans la durée." },
      ] },
      { type: "etapes", surtitre: "Méthode", titre: "Comment nous travaillons", items: [
        { titre: "Premier échange", texte: "Nous écoutons votre situation, sans engagement." },
        { titre: "Proposition", texte: "Une stratégie et des honoraires clairs." },
        { titre: "Accompagnement", texte: "Un suivi régulier jusqu'à la résolution." },
      ] },
      { type: "faq", surtitre: "Questions fréquentes", titre: "Avant de nous consulter", items: [
        { titre: "Comment sont fixés les honoraires ?", texte: "Au forfait ou au temps passé, toujours annoncés par écrit avant de commencer." },
        { titre: "Peut-on vous consulter à distance ?", texte: "Oui, par visioconférence, avec le même suivi qu'au cabinet." },
      ] },
      { type: "appel", titre: "Parlons de votre situation.", cta: "Prendre rendez-vous" },
      { type: "contact", surtitre: "Contact", titre: "Premier rendez-vous" },
    ],
  },
  {
    cle: "Santé & soins",
    motsCles: ["kiné", "ostéopathe", "osteopathe", "psychologue", "infirmier", "infirmière", "sage-femme", "orthophoniste", "podologue", "diététicien", "dieteticien", "dentiste", "médecin", "medecin", "cabinet médical", "naturopathe", "sophrologue", "thérapeute", "therapeute"],
    nomParDefaut: "Cabinet Équilibre",
    palette: { fond: "#f6f8f7", texte: "#15302b", accent: "#2f7d6d", doux: "#e4eeeb" },
    typo: "moderne",
    mise: "partage",
    motif: "arche",
    arrondi: "pilule",
    hero: (n, v) => ({ surtitre: `Cabinet${dansVille(v)}`, titre: "Prendre soin de vous, à votre rythme", sousTitre: `${n} vous reçoit sur rendez-vous, avec du temps pour écouter et expliquer.`, cta: "Prendre rendez-vous", ctaSecondaire: "Les consultations" }),
    sections: () => [
      { type: "atouts", titre: "Le cabinet", items: [
        { titre: "Sur rendez-vous", texte: "En ligne ou par téléphone, avec des créneaux en soirée." },
        { titre: "Du temps pour vous", texte: "Une première consultation pour faire le point, sans précipitation." },
        { titre: "Un suivi clair", texte: "Des explications et des conseils à appliquer chez vous." },
      ] },
      { type: "services", surtitre: "Consultations", titre: "Pour quoi consulter ?", items: [
        { titre: "Douleurs", texte: "Dos, cervicales, articulations, tensions." },
        { titre: "Après une blessure", texte: "Retrouver mobilité et confiance." },
        { titre: "Prévention", texte: "Garder un corps en forme, au travail comme au sport." },
      ] },
      { type: "etapes", surtitre: "Comment ça se passe", titre: "Votre première consultation", items: [
        { titre: "Prise de rendez-vous", texte: "En ligne, en quelques clics." },
        { titre: "Bilan", texte: "On fait le point sur votre situation et vos attentes." },
        { titre: "Séance", texte: "Un accompagnement adapté, expliqué pas à pas." },
      ] },
      { type: "tarifs", surtitre: "Tarifs", titre: "Consultations", items: [
        { titre: "Première consultation", texte: "[Durée]", prix: "[Tarif]" },
        { titre: "Consultation de suivi", texte: "[Durée]", prix: "[Tarif]" },
      ] },
      { type: "faq", surtitre: "Questions fréquentes", titre: "Avant de venir", items: [
        { titre: "Combien de temps dure une consultation ?", texte: "[Indiquez la durée habituelle d'une séance.]" },
        { titre: "Les séances sont-elles remboursées ?", texte: "[Précisez les conditions de prise en charge par l'Assurance maladie et les mutuelles.]" },
        { titre: "Le cabinet est-il accessible ?", texte: "[Précisez l'accès, le stationnement et l'accessibilité.]" },
      ] },
      { type: "appel", titre: "Un créneau cette semaine ?", cta: "Prendre rendez-vous" },
      { type: "contact", surtitre: "Le cabinet", titre: "Nous trouver" },
    ],
  },
  {
    cle: "Hébergement",
    motsCles: ["chambre d'hôtes", "gîte", "gite", "hôtel", "hotel", "camping", "auberge", "location saisonnière", "location de vacances"],
    nomParDefaut: "La Maison des Prés",
    palette: { fond: "#f6f1e7", texte: "#2a241b", accent: "#6b7a3a", doux: "#ebe3d1" },
    typo: "elegante",
    mise: "plein",
    motif: "arche",
    arrondi: "doux",
    bandeau: () => "Réservez en direct : meilleur prix garanti",
    hero: (n, v) => ({ surtitre: `Séjours${dansVille(v)}`, titre: `${n}, une étape au calme`, sousTitre: "Des chambres confortables, un petit-déjeuner fait maison et un accueil attentif.", cta: "Réserver un séjour", ctaSecondaire: "Les chambres" }),
    sections: () => [
      { type: "atouts", titre: "Pourquoi séjourner ici", items: [
        { titre: "Petit-déjeuner maison", texte: "Pain frais, confitures et produits de la région." },
        { titre: "Au calme", texte: "Pour dormir vraiment, et repartir reposé." },
        { titre: "Accueil attentif", texte: "Des conseils pour découvrir les environs." },
      ] },
      { type: "tarifs", surtitre: "Les chambres", titre: "Choisissez votre chambre", items: [
        { titre: "Chambre Prairie", texte: "2 personnes · vue jardin", prix: "95 € / nuit" },
        { titre: "Chambre Tilleul", texte: "2 personnes · baignoire", prix: "110 € / nuit", tag: "Coup de cœur" },
        { titre: "Suite Familiale", texte: "4 personnes · deux pièces", prix: "150 € / nuit" },
      ] },
      { type: "galerie", surtitre: "En images", titre: "La maison", items: [{ titre: "Le jardin" }, { titre: "Les chambres" }, { titre: "Le petit-déjeuner" }, { titre: "Les environs" }] },
      { type: "apropos", surtitre: "L'histoire", titre: "Une maison ouverte", texte: "Nous avons restauré cette maison pour y accueillir des voyageurs comme nous aurions aimé l'être. [Racontez ici votre histoire.]" },
      { type: "faq", surtitre: "Infos pratiques", titre: "Bon à savoir", items: [
        { titre: "À quelle heure arriver et partir ?", texte: "Arrivée à partir de 16 h, départ avant 11 h. [À adapter.]" },
        { titre: "Les animaux sont-ils acceptés ?", texte: "[Précisez votre politique.]" },
        { titre: "Peut-on se garer sur place ?", texte: "[Précisez les possibilités de stationnement.]" },
      ] },
      { type: "appel", titre: "Quelques jours au calme ?", cta: "Réserver un séjour" },
      { type: "contact", surtitre: "Venir", titre: "Nous trouver" },
    ],
  },
];

const modeleDefaut: Modele = {
  cle: "Entreprise",
  motsCles: [],
  nomParDefaut: "Atelier Nord",
  palette: { fond: "#f8f8f6", texte: "#141716", accent: "#2f5d8a", doux: "#eceeea" },
  typo: "moderne",
  mise: "partage",
  motif: "vague",
  arrondi: "doux",
  hero: (n, v) => ({ surtitre: `Bienvenue${dansVille(v)}`, titre: `${n}, simplement mieux`, sousTitre: "Nous aidons nos clients à avancer plus vite, avec un service humain et des résultats concrets.", cta: "Nous contacter", ctaSecondaire: "Nos services" }),
  sections: () => [
    { type: "atouts", titre: "Pourquoi nous", items: [
      { titre: "À l'écoute", texte: "Nous partons de votre besoin réel." },
      { titre: "Réactifs", texte: "Une réponse rapide à chaque demande." },
      { titre: "Fiables", texte: "Des engagements tenus, du début à la fin." },
    ] },
    { type: "services", surtitre: "Services", titre: "Ce que nous faisons", items: [{ titre: "Conseil", texte: "Comprendre votre besoin et vos contraintes." }, { titre: "Réalisation", texte: "Livrer vite, et bien." }, { titre: "Suivi", texte: "Rester à vos côtés ensuite." }] },
    { type: "apropos", surtitre: "Qui sommes-nous", titre: "Une équipe à taille humaine", texte: "Passionnés par notre métier et attachés à la qualité, nous travaillons avec chaque client comme avec un partenaire." },
    { type: "appel", titre: "Un projet ? Parlons-en.", cta: "Nous contacter" },
    { type: "contact", surtitre: "Contact", titre: "Nous écrire" },
  ],
};

function majuscule(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function extraireNom(texte: string): string | undefined {
  const guillemets = texte.match(/[«"“']\s*([^»"”']{2,40})\s*[»"”']/);
  if (guillemets?.[1]) return guillemets[1].trim();
  const appele = texte.match(/(?:appel[ée]e?s?|nomm[ée]e?s?|s'appelle|qui s'appelle)\s+([A-ZÀ-Ÿ][\wÀ-ÿ'&-]*(?:\s+[A-ZÀ-Ÿ&][\wÀ-ÿ'&-]*){0,3})/);
  if (appele?.[1]) return appele[1].trim();
  return undefined;
}

function extraireVille(texte: string): string | undefined {
  const m = texte.match(/(?:^|\s)(?:à|a|sur|près de|pres de)\s+([A-ZÀ-Ÿ][a-zà-ÿ']+(?:[- ](?:(?:sur|en|le|la|les|de|du|des)[- ])?[A-ZÀ-Ÿ][a-zà-ÿ']+)*)/);
  return m?.[1];
}

const couleurs: Record<string, string> = {
  bleu: "#2f6fdb", rouge: "#d64545", vert: "#2f9e6a", jaune: "#e0b100", orange: "#e0782f",
  violet: "#7b5bd6", rose: "#d65b9a", noir: "#111111", turquoise: "#14b8a6", marron: "#8b5a3c", doré: "#b08d57", dore: "#b08d57",
};

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 24) || "contact";
}

const paletteSombre = (accent: string) => ({ fond: "#121413", texte: "#eef0ec", accent, doux: "#1c1f1d" });

/** Mot-clé présent en tant que mot (ou expression), au singulier ou au pluriel. */
function contient(texte: string, mot: string) {
  const echappe = mot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zà-ÿ])${echappe}(s|x)?([^a-zà-ÿ]|$)`).test(texte);
}

/** Mot présent sous une forme proche (chaleureux / chaleureuse, élégant / élégante…). */
function contientRacine(texte: string, mot: string) {
  const racine = mot.replace(/(x|e|s)$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zà-ÿ])${racine}[a-zà-ÿ]{0,4}([^a-zà-ÿ]|$)`).test(texte);
}

/** Pertinence d'une liste de mots-clés : longueur du mot-clé le plus long trouvé (0 si aucun). */
function pertinence(texte: string, mots: string[]) {
  return mots.reduce((max, m) => (m.length > max && contient(texte, m) ? m.length : max), 0);
}

function empreinte(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

// Détails de la description repris en points forts (remplacent les points génériques).
const detailsDescription: { mots: string[]; atout: { titre: string; texte: string } }[] = [
  { mots: ["bio", "biologique"], atout: { titre: "Bio", texte: "Des produits issus de l'agriculture biologique." } },
  { mots: ["vegan", "végan", "végétalien", "vegetalien"], atout: { titre: "100 % végétal", texte: "Aucun produit d'origine animale." } },
  { mots: ["sans gluten"], atout: { titre: "Sans gluten", texte: "Des options sans gluten, préparées avec soin." } },
  { mots: ["fait maison", "maison"], atout: { titre: "Fait maison", texte: "Tout est préparé sur place." } },
  { mots: ["local", "locaux", "circuit court", "producteurs"], atout: { titre: "Circuit court", texte: "Des producteurs proches, que nous connaissons." } },
  { mots: ["livraison", "livrer"], atout: { titre: "Livraison", texte: "Commandez en ligne, on vous livre." } },
  { mots: ["à emporter", "a emporter", "click and collect"], atout: { titre: "À emporter", texte: "Commandez, passez récupérer, c'est prêt." } },
  { mots: ["terrasse"], atout: { titre: "Terrasse", texte: "Aux beaux jours, installez-vous dehors." } },
  { mots: ["familial", "familiale", "en famille", "enfants"], atout: { titre: "En famille", texte: "Un accueil pensé aussi pour les enfants." } },
  { mots: ["urgence", "urgences", "24h/24", "24 h/24"], atout: { titre: "Urgences", texte: "Joignables rapidement en cas d'imprévu." } },
  { mots: ["domicile", "à domicile", "a domicile"], atout: { titre: "À domicile", texte: "Nous nous déplaçons chez vous." } },
];

export function genererSite(description: string): SiteGenere {
  const d = description.toLowerCase();
  const h = empreinte(d.trim());
  const choisir = <T,>(liste: T[], sel = 0): T => liste[(h + sel) % liste.length]!;

  // 1. Métier précis, sinon famille, sinon modèle général
  let metier: Metier | undefined;
  let meilleur = 0;
  for (const m of metiers) {
    const p = pertinence(d, m.motsCles);
    if (p > meilleur) [metier, meilleur] = [m, p];
  }
  let modele = metier ? modeles.find((m) => m.cle === metier!.famille) : undefined;
  if (!modele) {
    let best = 0;
    for (const m of modeles) {
      const p = pertinence(d, m.motsCles);
      if (p > best) [modele, best] = [m, p];
    }
  }
  modele ??= modeleDefaut;

  const ville = extraireVille(description);
  const nom = extraireNom(description) ?? metier?.nom ?? modele.nomParDefaut;
  const remplir = (t: string) => t.replaceAll("{nom}", nom).replaceAll("{ville}", ville ?? "").replaceAll("{aVille}", ville ? ` à ${ville}` : "");

  // 2. Textes du premier écran : variantes du métier, choisies selon la description
  const base = modele.hero(nom, ville);
  const hero: SiteGenere["hero"] = metier
    ? {
        surtitre: remplir(metier.surtitre ?? base.surtitre),
        titre: remplir(choisir(metier.titres)),
        sousTitre: remplir(choisir(metier.sousTitres, 1)),
        cta: metier.cta ?? base.cta,
        ctaSecondaire: metier.ctaSecondaire ?? base.ctaSecondaire,
      }
    : base;

  // 3. Sections de la famille, enrichies par le métier
  const sections = structuredClone(modele.sections(nom, ville));
  const avantAppel = (s: SectionSite) => {
    const i = sections.findIndex((x) => x.type === "appel" || x.type === "contact");
    sections.splice(i < 0 ? sections.length : i, 0, s);
  };
  if (metier?.liste) {
    const cible = sections.find((s) => s.type === metier!.liste!.cible);
    const nouvelle = { type: metier.liste.cible, surtitre: metier.liste.surtitre, titre: metier.liste.titre ?? cible?.titre ?? "Nos services", items: metier.liste.items };
    if (cible) Object.assign(cible, { ...nouvelle, surtitre: nouvelle.surtitre ?? cible.surtitre, texte: undefined });
    else sections.splice(1, 0, nouvelle);
  }
  if (metier?.galerie) {
    const g = sections.find((s) => s.type === "galerie");
    if (g) g.items = metier.galerie.map((titre) => ({ titre }));
    else avantAppel({ type: "galerie", surtitre: "En images", titre: "Un aperçu", items: metier.galerie.map((titre) => ({ titre })) });
  }
  const atouts = sections.find((s) => s.type === "atouts");
  if (atouts && metier?.atouts) atouts.items = structuredClone(metier.atouts);
  if (metier?.faq) {
    const f = sections.find((s) => s.type === "faq");
    if (f) f.items = metier.faq;
    else avantAppel({ type: "faq", surtitre: "Questions fréquentes", titre: "Vos questions", items: metier.faq });
  }
  if (metier?.apropos) {
    const a = sections.find((s) => s.type === "apropos");
    if (a) Object.assign(a, { texte: metier.apropos.texte, titre: metier.apropos.titre ?? a.titre });
  }
  if (metier?.appel) {
    const a = sections.find((s) => s.type === "appel");
    if (a) Object.assign(a, metier.appel);
  }

  // 4. Les détails de la description deviennent des points forts
  if (atouts?.items) {
    const trouves = detailsDescription.filter((x) => x.mots.some((m) => contient(d, m))).slice(0, 2);
    trouves.forEach((x, i) => {
      const pos = atouts.items!.length - 1 - i;
      if (pos >= 0 && !atouts.items!.some((a) => a.titre === x.atout.titre)) atouts.items![pos] = { ...x.atout };
    });
  }
  const annee = description.match(/depuis\s+(19\d{2}|20\d{2})/i)?.[1];
  if (annee && atouts?.items?.length) atouts.items[0] = { titre: `Depuis ${annee}`, texte: "Un savoir-faire transmis et entretenu au fil des années." };

  // 5. Ordre des sections légèrement varié
  const iGal = sections.findIndex((s) => s.type === "galerie");
  const iApr = sections.findIndex((s) => s.type === "apropos");
  if (iGal >= 0 && iApr >= 0 && h % 3 === 1) [sections[iGal], sections[iApr]] = [sections[iApr]!, sections[iGal]!];

  // 6. Direction artistique : selon le ton de la description, sinon variée d'une description à l'autre
  const famille = directions[modele.cle] ?? directions.Entreprise!;
  const candidates = [...(metier?.directions ?? []), ...famille];
  const scores = candidates.map((c) => c.tags.filter((t) => contientRacine(d, t)).length);
  const max = Math.max(...scores);
  const da = max > 0 ? candidates[scores.indexOf(max)]! : choisir(metier?.directions?.length ? metier.directions : famille, 2);

  const site: SiteGenere = {
    nom,
    secteur: metier?.cle ?? modele.cle,
    ville,
    palette: { ...da.palette },
    police: serifs.includes(da.typo) ? "serif" : "sans",
    typo: da.typo,
    mise: da.mise,
    motif: metier?.motif ?? modele.motif,
    arrondi: da.arrondi,
    hero,
    infos: {
      bandeau: metier?.bandeau ?? modele.bandeau?.(ville),
      telephone: "05 00 00 00 00",
      email: `contact@${slug(nom)}.fr`,
      adresse: ville ? `[Adresse], ${ville}` : "[Votre adresse]",
    },
    sections,
  };

  // Couleur demandée explicitement (« couleur dorée », « tons verts », « en bleu »), pas un
  // simple mot de la description (« blé noir », « espaces verts »).
  for (const [mot, hex] of Object.entries(couleurs)) {
    const m = mot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(couleurs?|tons?|teintes?|th[eè]me|palette|dominante|en)\\s+(?:[a-zà-ÿ]+\\s+){0,2}${m}(e|s|es)?([^a-zà-ÿ]|$)`).test(d)) site.palette.accent = hex;
  }
  const dejaSombre = luminance(site.palette.fond) < 0.2;
  if (/sombre|dark|nuit/.test(d) && !dejaSombre) site.palette = paletteSombre(site.palette.accent === "#111111" ? "#e8e4dc" : site.palette.accent);
  if (/\b(clair|lumineux)\b/.test(d) && dejaSombre) site.palette = { fond: "#fbfaf6", texte: "#14181a", accent: site.palette.accent, doux: "#eeece4" };
  return site;
}

// Modifications par chat. Renvoie le site modifié et une réponse à afficher.
export function modifierSite(site: SiteGenere, demande: string): { site: SiteGenere; reponse: string } {
  const d = demande.toLowerCase();
  const s: SiteGenere = structuredClone(site);

  for (const [mot, hex] of Object.entries(couleurs)) {
    if (d.includes(mot)) {
      s.palette.accent = hex;
      return { site: s, reponse: `C'est fait : la couleur principale est maintenant ${mot}. Boutons, liens et titres ont été mis à jour.` };
    }
  }
  if (/sombre|dark|nuit/.test(d)) {
    s.palette = paletteSombre(s.palette.accent);
    return { site: s, reponse: "Passage en thème sombre effectué, en gardant votre couleur d'accent." };
  }
  if (/clair|light/.test(d)) {
    s.palette = { fond: "#fbfaf6", texte: "#14181a", accent: s.palette.accent, doux: "#eeece4" };
    return { site: s, reponse: "Thème clair appliqué." };
  }
  const titre = demande.match(/titre\s*(?:en|:|par|à)?\s*[«"“]?([^»"”]+)[»"”]?/i);
  if (titre?.[1] && !/section/.test(d)) {
    s.hero.titre = titre[1].trim();
    return { site: s, reponse: `Nouveau titre principal : « ${s.hero.titre} ».` };
  }
  if (/tarif|prix/.test(d)) {
    s.sections.splice(Math.max(0, s.sections.length - 1), 0, { type: "tarifs", surtitre: "Tarifs", titre: "Nos formules", items: [{ titre: "Formule découverte", texte: "Pour commencer", prix: "29 €" }, { titre: "Formule complète", texte: "La plus demandée", prix: "79 €", tag: "Recommandée" }, { titre: "Sur mesure", texte: "Selon votre besoin", prix: "Sur devis" }] });
    return { site: s, reponse: "J'ai ajouté une section Tarifs avec trois formules, juste avant le contact. Cliquez sur un prix pour le modifier." };
  }
  if (/horaire/.test(d)) {
    s.sections.splice(Math.max(0, s.sections.length - 1), 0, { type: "horaires", titre: "Horaires", items: [{ titre: "Lundi – Vendredi", texte: "9h – 18h" }, { titre: "Samedi", texte: "10h – 16h" }] });
    return { site: s, reponse: "Section Horaires ajoutée." };
  }
  if (/galerie|photo|réalisation|realisation/.test(d)) {
    s.sections.splice(1, 0, { type: "galerie", surtitre: "Galerie", titre: "En images", items: [{ titre: "" }, { titre: "" }, { titre: "" }, { titre: "" }] });
    return { site: s, reponse: "Une galerie a été ajoutée sous l'en-tête. Glissez vos photos dedans pour remplacer les visuels d'exemple." };
  }
  if (/éditorial|editorial|magazine/.test(d)) {
    s.typo = "editoriale";
    s.police = "serif";
    return { site: s, reponse: "Typographie éditoriale appliquée : de grands titres à empattements, façon magazine." };
  }
  if (/serif|élégant|elegant|classique|chic/.test(d)) {
    s.typo = "elegante";
    s.police = "serif";
    return { site: s, reponse: "Typographie élégante appliquée, avec des titres à empattements doux." };
  }
  if (/chaleureu|convivial|fun/.test(d)) {
    s.typo = "chaleureuse";
    s.police = "sans";
    return { site: s, reponse: "Typographie plus chaleureuse appliquée, aux formes arrondies." };
  }
  if (/moderne|sans|minimal/.test(d)) {
    s.typo = "moderne";
    s.police = "sans";
    return { site: s, reponse: "Typographie moderne et sobre appliquée." };
  }
  if (/plein écran|plein ecran|grande image|immersif/.test(d)) {
    s.mise = "plein";
    return { site: s, reponse: "L'en-tête passe en pleine largeur, avec le titre sur l'image." };
  }
  if (/centr|magazine/.test(d)) {
    s.mise = "editorial";
    return { site: s, reponse: "L'en-tête est maintenant centré, avec une grande image en dessous." };
  }
  if (/deux colonnes|côte à côte|cote a cote/.test(d)) {
    s.mise = "partage";
    return { site: s, reponse: "L'en-tête passe en deux colonnes : le texte à gauche, l'image à droite." };
  }
  if (/carré|carre|angles droits/.test(d)) {
    s.arrondi = "net";
    return { site: s, reponse: "Boutons et cartes passent en angles nets." };
  }
  if (/arrondi|rond/.test(d)) {
    s.arrondi = "pilule";
    return { site: s, reponse: "Boutons et cartes sont maintenant arrondis." };
  }
  if (/faq|questions/.test(d)) {
    s.sections.splice(Math.max(0, s.sections.length - 1), 0, { type: "faq", surtitre: "Questions fréquentes", titre: "Vos questions", items: [{ titre: "[Première question]", texte: "[Votre réponse]" }, { titre: "[Deuxième question]", texte: "[Votre réponse]" }] });
    return { site: s, reponse: "Section « Questions fréquentes » ajoutée avant le contact. Remplacez les questions d'exemple par les vôtres." };
  }
  const suppr = d.match(/(?:supprime|retire|enlève|enleve)\s+(?:la\s+)?(?:section\s+)?(\w+)/);
  if (suppr?.[1]) {
    const avant = s.sections.length;
    s.sections = s.sections.filter((x) => !x.titre.toLowerCase().includes(suppr[1]!) && !x.type.includes(suppr[1]!));
    if (s.sections.length < avant) return { site: s, reponse: `Section « ${majuscule(suppr[1])} » retirée.` };
  }
  if (/bouton|cta/.test(d)) {
    const m = demande.match(/[«"“]([^»"”]+)[»"”]/);
    if (m?.[1]) {
      s.hero.cta = m[1];
      return { site: s, reponse: `Le bouton principal affiche maintenant « ${m[1]} ».` };
    }
  }
  return {
    site: s,
    reponse:
      "Je peux changer les couleurs (« passe en bleu »), le thème (« sombre »), le titre (« titre : … »), la typographie (« plus élégant », « éditorial », « moderne »), la mise en page (« grande image », « centré », « deux colonnes »), ajouter une section (tarifs, horaires, galerie, FAQ) ou en retirer une. Que souhaitez-vous ?",
  };
}

export const exemplesPrompts = [
  "Un site pour mon restaurant « Le Petit Quai » à Bordeaux, ambiance chaleureuse",
  "Un plombier chauffagiste à Toulouse qui veut recevoir des demandes de devis",
  "Une boutique en ligne de bijoux faits main, couleur dorée",
  "Le portfolio d'une photographe de mariage, thème sombre",
];
