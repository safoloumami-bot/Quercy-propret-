// Métiers précis et directions artistiques du créateur de sites.
// Chaque métier rattaché à une famille (voir `generateur.ts`) remplace les contenus génériques
// de sa famille : titres, carte ou prestations, galerie, engagements, FAQ.
// Placeholders dans les textes : {nom}, {ville}, {aVille} (« à Lyon » ou rien).

import type { Mise, Motif, SectionSite, SiteGenere, TypeSection, Typo } from "./generateur";

type Item = NonNullable<SectionSite["items"]>[number];

export interface Direction {
  /** Mots de la description qui orientent vers cette direction. */
  tags: string[];
  palette: SiteGenere["palette"];
  typo: Typo;
  mise: Mise;
  arrondi: NonNullable<SiteGenere["arrondi"]>;
}

export interface Metier {
  cle: string;
  famille: string;
  motsCles: string[];
  nom: string;
  motif?: Motif;
  surtitre?: string;
  titres: string[];
  sousTitres: string[];
  cta?: string;
  ctaSecondaire?: string;
  bandeau?: string;
  /** Liste principale : remplace les éléments de la première section du type `cible`. */
  liste?: { cible: TypeSection; surtitre?: string; titre?: string; items: Item[] };
  galerie?: string[];
  atouts?: Item[];
  faq?: Item[];
  apropos?: { titre?: string; texte: string };
  appel?: { titre: string; texte?: string; cta?: string };
  /** Directions propres au métier, prioritaires sur celles de la famille. */
  directions?: Direction[];
}

/* ---------- Directions artistiques par famille ---------- */

const d = (tags: string[], fond: string, texte: string, accent: string, doux: string, typo: Typo, mise: Mise, arrondi: Direction["arrondi"]): Direction => ({
  tags,
  palette: { fond, texte, accent, doux },
  typo,
  mise,
  arrondi,
});

export const directions: Record<string, Direction[]> = {
  Boulangerie: [
    d(["chaleureux", "traditionnel", "familial", "artisanal"], "#fbf6ee", "#2e2014", "#a8551f", "#f2e6d4", "elegante", "plein", "pilule"),
    d(["moderne", "minimal", "épuré", "epure"], "#f7f5f0", "#1c1a17", "#a8742a", "#ece7dc", "moderne", "editorial", "net"),
    d(["chic", "luxe", "élégant", "elegant", "haut de gamme", "raffiné", "raffine"], "#1d1714", "#f3ebe0", "#d9a35b", "#2a221d", "editoriale", "plein", "net"),
  ],
  Restauration: [
    d(["chaleureux", "convivial", "traditionnel", "familial", "bistrot"], "#fbf5ec", "#2b1d14", "#b4471f", "#f1e2cf", "editoriale", "plein", "pilule"),
    d(["gastronomique", "chic", "luxe", "élégant", "elegant", "raffiné", "raffine", "étoilé", "etoile"], "#12110f", "#f1ece4", "#c8a46a", "#1c1a17", "elegante", "plein", "net"),
    d(["moderne", "frais", "healthy", "végétal", "vegetal", "minimal"], "#f6f4ee", "#18201c", "#2f6b4f", "#e8ece3", "moderne", "partage", "doux"),
  ],
  "Beauté & bien-être": [
    d(["doux", "féminin", "feminin", "chaleureux", "cocooning"], "#faf6f4", "#2a2224", "#9c5566", "#f1e4e6", "elegante", "partage", "pilule"),
    d(["nature", "zen", "bio", "naturel", "spa", "détente", "detente"], "#f3f1ea", "#1f2620", "#5f7a5a", "#e6e8dc", "elegante", "plein", "pilule"),
    d(["moderne", "urbain", "masculin", "vintage", "rétro", "retro", "brut"], "#151515", "#eeeae3", "#c98b4a", "#1f1e1c", "editoriale", "editorial", "net"),
  ],
  Artisan: [
    d(["moderne", "rapide", "dynamique"], "#f6f7f4", "#18211d", "#c4561b", "#e8ebe4", "moderne", "partage", "net"),
    d(["sérieux", "serieux", "confiance", "traditionnel", "familial"], "#f4f6f8", "#13202e", "#1f5fa8", "#e4e9ef", "moderne", "partage", "doux"),
    d(["nature", "jardin", "écologique", "ecologique", "durable", "bois"], "#f5f6f0", "#1b2418", "#3f7a3a", "#e6ebdd", "chaleureuse", "plein", "doux"),
  ],
  "Coaching & sport": [
    d(["énergie", "energie", "intense", "dynamique", "sport"], "#0f1412", "#f1f4f0", "#c6f432", "#1a221e", "chaleureuse", "editorial", "pilule"),
    d(["zen", "doux", "bien-être", "bien etre", "yoga", "calme"], "#f6f3ee", "#2a2622", "#b0703f", "#ebe4da", "elegante", "partage", "pilule"),
    d(["performance", "moderne", "premium"], "#0e1424", "#eef2f8", "#4c8dff", "#182036", "moderne", "plein", "doux"),
  ],
  "Boutique en ligne": [
    d(["classique", "intemporel", "durable"], "#f7f4ee", "#1f1b16", "#2f5d50", "#ebe5d9", "editoriale", "editorial", "net"),
    d(["chaleureux", "artisanal", "fait main", "coloré", "colore"], "#f8f1ea", "#2a1d17", "#b5532f", "#efe2d6", "chaleureuse", "partage", "pilule"),
    d(["luxe", "chic", "élégant", "elegant", "précieux", "precieux"], "#111111", "#f1efe9", "#c9a96e", "#1b1b1a", "elegante", "editorial", "net"),
  ],
  Portfolio: [
    d(["moderne", "minimal", "épuré", "epure"], "#ffffff", "#111111", "#2f4fd1", "#f2f3f6", "moderne", "editorial", "net"),
    d(["éditorial", "editorial", "classique", "artistique", "poétique", "poetique"], "#f4f0e8", "#1b1a17", "#9b3d2b", "#e9e3d7", "editoriale", "editorial", "net"),
    d(["sombre", "cinéma", "cinema", "nuit", "contraste"], "#0f0f10", "#ececea", "#e8e4dc", "#1a1a1c", "moderne", "plein", "net"),
  ],
  Conseil: [
    d(["classique", "prestige", "traditionnel"], "#f5f6f8", "#14213d", "#8a6a3a", "#e6e9ef", "editoriale", "partage", "net"),
    d(["durable", "humain", "proche", "familial"], "#f5f5f1", "#16241f", "#2e5c4b", "#e5e9e3", "elegante", "partage", "doux"),
    d(["moderne", "digital", "tech", "startup"], "#ffffff", "#111827", "#3a4fd1", "#f1f2f6", "moderne", "editorial", "doux"),
  ],
  "Santé & soins": [
    d(["doux", "humain", "rassurant"], "#f6f8f7", "#15302b", "#2f7d6d", "#e4eeeb", "moderne", "partage", "pilule"),
    d(["nature", "zen", "bien-être", "bien etre", "holistique"], "#f6f2ec", "#2b241f", "#8a6a4a", "#ece4d8", "elegante", "partage", "pilule"),
    d(["moderne", "clair", "sportif"], "#ffffff", "#0f1c2e", "#2b6cb0", "#eef3f8", "moderne", "editorial", "doux"),
  ],
  Hébergement: [
    d(["campagne", "nature", "authentique", "chaleureux"], "#f6f1e7", "#2a241b", "#6b7a3a", "#ebe3d1", "elegante", "plein", "doux"),
    d(["mer", "plage", "littoral", "océan", "ocean"], "#f4f6f5", "#14262e", "#2a6f86", "#e3ecee", "editoriale", "plein", "pilule"),
    d(["chic", "luxe", "boutique", "design"], "#14120f", "#f2ede4", "#c7a36b", "#1f1c18", "editoriale", "plein", "net"),
  ],
  Entreprise: [
    d(["moderne", "sobre"], "#f8f8f6", "#141716", "#2f5d8a", "#eceeea", "moderne", "partage", "doux"),
    d(["chaleureux", "humain", "local"], "#f7f4ef", "#221d18", "#a4572e", "#ece4d8", "chaleureuse", "partage", "pilule"),
    d(["tech", "digital", "sombre", "innovant"], "#101214", "#eceeef", "#6aa7ff", "#1a1d21", "moderne", "editorial", "doux"),
  ],
};

/* ---------- Métiers ---------- */

const it = (titre: string, texte = "", prix = "", tag = ""): Item => ({ titre, texte: texte || undefined, prix: prix || undefined, tag: tag || undefined });

// Ordre important : les métiers les plus précis d'abord.
export const metiers: Metier[] = [
  /* --- Restauration --- */
  {
    cle: "Crêperie", famille: "Restauration", motsCles: ["crêperie", "creperie", "crêpe", "crepe", "galette", "sarrasin", "blé noir"],
    nom: "Ty Krampouezh", motif: "assiette", surtitre: "Crêperie{aVille}",
    titres: ["Le blé noir tourné à la commande", "Des galettes comme en Bretagne{aVille}", "{nom}, galettes et cidre fermier"],
    sousTitres: ["Galettes au sarrasin, crêpes au beurre salé et cidre fermier, servis dans une salle où l'on prend son temps.", "Sarrasin moulu à la meule, billig en fonte et caramel maison : la crêpe dans les règles."],
    cta: "Réserver une table", ctaSecondaire: "Voir la carte",
    liste: { cible: "menu", surtitre: "Galettes, crêpes, cidres", titre: "La carte", items: [
      it("La complète", "Jambon, emmental, œuf miroir", "9,50 €"), it("L'andouille", "Andouille, pommes fondues, moutarde à l'ancienne", "12,50 €"),
      it("La forestière", "Champignons, crème, lardons, persil", "12 €"), it("Beurre-sucre", "Beurre demi-sel, sucre de canne", "4,50 €"),
      it("Caramel maison", "Caramel au beurre salé, fleur de sel", "6 €"), it("Bolée de cidre", "Brut ou doux, cidre fermier", "3,80 €"),
    ] },
    galerie: ["La billig", "Les galettes", "La salle", "Le cidre"],
    directions: [d(["breton", "bretagne", "mer", "traditionnel", "chaleureux"], "#f4efe6", "#1d2a33", "#1f5f8b", "#e7e0d2", "chaleureuse", "partage", "doux"), d(["moderne", "minimal"], "#f7f5f2", "#1a1a1a", "#2c4f7c", "#ebe8e2", "moderne", "editorial", "net")],
    atouts: [it("Sarrasin breton", "Une farine de blé noir moulue à la meule de pierre."), it("Tournées à la commande", "Chaque galette sort de la billig pour vous."), it("Cidre fermier", "Brut ou doux, servi à la bolée.")],
    appel: { titre: "Une galette ce soir ?", texte: "Réservez, ou passez prendre à emporter.", cta: "Réserver" },
  },
  {
    cle: "Pizzeria", famille: "Restauration", motsCles: ["pizzeria", "pizza", "italien", "italienne", "trattoria", "pasta", "pâtes fraîches"],
    nom: "Forno Rosso", motif: "assiette", surtitre: "Pizzeria{aVille}",
    titres: ["Pâte maturée 48 h, four à bois", "La vraie pizza napolitaine{aVille}", "{nom}, la pizza comme à Naples"],
    sousTitres: ["Une pâte qui repose deux jours, une mozzarella fior di latte et un four à bois qui monte à 450 °C.", "Pizzas napolitaines, antipasti et tiramisu maison. Sur place, à emporter ou en livraison."],
    cta: "Commander", ctaSecondaire: "Voir la carte", bandeau: "Sur place, à emporter ou en livraison · Ouvert 7 j/7 le soir",
    liste: { cible: "menu", surtitre: "Pizze, antipasti, dolci", titre: "La carte", items: [
      it("Margherita", "Tomate San Marzano, fior di latte, basilic", "10 €"), it("Diavola", "Salami piquant, mozzarella, origan", "13 €"),
      it("Quattro formaggi", "Gorgonzola, parmesan, mozzarella, taleggio", "14 €"), it("Burrata", "Burrata, tomates confites, roquette", "15 €"),
      it("Antipasti misti", "Charcuterie, légumes grillés, focaccia", "12 €"), it("Tiramisù della casa", "Mascarpone, café, cacao", "7 €"),
    ] },
    galerie: ["Le four à bois", "La pâte", "Les pizze", "La salle"],
    directions: [d(["chaleureux", "traditionnel", "familial", "napolitain"], "#fbf3ea", "#2a1a14", "#c23b22", "#f3e3d2", "editoriale", "plein", "pilule"), d(["moderne", "urbain"], "#f5f1ea", "#1c1a17", "#d2482d", "#ebe4d9", "chaleureuse", "editorial", "doux")],
    atouts: [it("Pâte maturée 48 h", "Plus légère et plus digeste."), it("Four à bois", "Une cuisson courte à très haute température."), it("Produits italiens", "Farine, tomates et fromages importés d'Italie.")],
    appel: { titre: "Une pizza ce soir ?", texte: "Commandez en ligne, prête en 20 minutes.", cta: "Commander" },
  },
  {
    cle: "Restaurant japonais", famille: "Restauration", motsCles: ["japonais", "sushi", "ramen", "izakaya", "maki", "japon"],
    nom: "Komorebi", motif: "assiette", surtitre: "Cuisine japonaise{aVille}",
    titres: ["Le Japon, assiette après assiette", "{nom}, sushis et ramen faits minute"],
    sousTitres: ["Poisson tranché à la commande, bouillons mijotés douze heures et riz assaisonné au vinaigre maison.", "Une cuisine japonaise précise et généreuse, au comptoir ou en salle."],
    cta: "Réserver", ctaSecondaire: "Voir la carte",
    liste: { cible: "menu", surtitre: "Sushis, ramen, petites assiettes", titre: "La carte", items: [
      it("Assortiment de sushis", "8 nigiris, chef's choice", "19 €"), it("Ramen tonkotsu", "Bouillon de porc, chashu, œuf mariné", "16 €"),
      it("Gyozas", "Porc et chou, sauce ponzu", "8 €"), it("Chirashi saumon", "Riz vinaigré, saumon, avocat, sésame", "17 €"),
      it("Karaage", "Poulet frit mariné au gingembre", "9 €"), it("Mochi glacé", "Matcha, sésame noir ou yuzu", "6 €"),
    ] },
    galerie: ["Le comptoir", "Les sushis", "Les ramen", "La salle"],
    atouts: [it("Coupé à la commande", "Le poisson est tranché au moment de servir."), it("Bouillons maison", "Mijotés douze heures, chaque jour."), it("Riz assaisonné", "Au vinaigre de riz préparé sur place.")],
    directions: [d(["sombre", "chic", "élégant", "elegant"], "#121212", "#efebe4", "#c2413a", "#1d1c1b", "elegante", "plein", "net"), d(["clair", "minimal", "zen"], "#f6f4ef", "#1a1a18", "#b8352f", "#ebe8e0", "moderne", "editorial", "net")],
  },
  {
    cle: "Burger", famille: "Restauration", motsCles: ["burger", "smash", "street food", "food truck", "foodtruck", "snack"],
    nom: "Big Smash", motif: "assiette", surtitre: "Burgers{aVille}",
    titres: ["Des burgers sans détour", "{nom} : smash, frites, c'est tout"],
    sousTitres: ["Bœuf haché du jour, pain brioché du boulanger d'à côté et frites coupées sur place.", "Une carte courte, des produits frais, un service rapide."],
    cta: "Commander", ctaSecondaire: "Voir la carte", bandeau: "Sur place ou à emporter · Commande en ligne, prête en 15 min",
    liste: { cible: "menu", surtitre: "Burgers, sides, boissons", titre: "La carte", items: [
      it("Le Classique", "Double smash, cheddar, oignons, pickles", "11 €"), it("Le Fumé", "Bacon, sauce barbecue maison, oignons frits", "13 €"),
      it("Le Veggie", "Galette de pois chiches, feta, sauce yaourt", "12 €"), it("Frites maison", "Coupées et cuites deux fois", "4 €"),
      it("Onion rings", "Panure à la bière", "5 €"), it("Milkshake", "Vanille, chocolat ou caramel", "6 €"),
    ] },
    galerie: ["La plancha", "Les burgers", "Les frites", "Le comptoir"],
    atouts: [it("Viande du jour", "Hachée le matin chez notre boucher."), it("Pain brioché", "Livré chaque jour par le boulanger voisin."), it("Frites maison", "Coupées sur place, cuites deux fois.")],
    directions: [d(["fun", "coloré", "colore", "pop"], "#fff4e0", "#1f140c", "#e2412b", "#ffe6bd", "chaleureuse", "editorial", "pilule"), d(["sombre", "urbain", "street"], "#141210", "#f4efe6", "#f2b230", "#1f1c19", "chaleureuse", "plein", "doux")],
  },
  {
    cle: "Café", famille: "Restauration", motsCles: ["salon de thé", "coffee shop", "coffee", "brunch", "torréfacteur", "café de quartier", "cafe de quartier", "barista"],
    nom: "Le Comptoir Lumière", motif: "assiette", surtitre: "Café et brunch{aVille}",
    titres: ["Un bon café, et le temps de le boire", "{nom}, café de spécialité et brunch maison"],
    sousTitres: ["Cafés de spécialité, pâtisseries du jour et brunch le week-end, dans une salle lumineuse.", "On torréfie avec soin, on cuisine maison et on vous laisse travailler tranquille."],
    cta: "Voir la carte", ctaSecondaire: "Réserver un brunch", bandeau: "Brunch samedi et dimanche · Wifi et prises pour travailler",
    liste: { cible: "menu", surtitre: "Cafés, douceurs, brunch", titre: "La carte", items: [
      it("Cafés de spécialité", "Espresso, filtre ou flat white", "dès 2,20 €"), it("Croissant pur beurre", "Feuilleté chaque matin", "1,80 €"),
      it("Café en grains · 250 g", "Torréfié avec soin, moulu à la demande", "9 €"), it("Chaï latte", "Épices infusées maison", "4,50 €"),
      it("Cookie du jour", "Beurre noisette, chocolat noir", "3 €"), it("Brunch complet", "Œufs, pain au levain, granola, jus pressé", "22 €"),
    ] },
    galerie: ["Le comptoir", "Les cafés", "Le brunch", "La salle"],
    atouts: [it("Café de spécialité", "Des grains sélectionnés et torréfiés avec soin."), it("Fait maison", "Pâtisseries et brunch préparés sur place."), it("Pour travailler", "Wifi, prises et bonne lumière.")],
    directions: [d(["chaleureux", "cosy", "cocooning"], "#f7f0e6", "#2b2018", "#8c5a3c", "#ede1d1", "chaleureuse", "partage", "pilule"), d(["moderne", "minimal", "lumineux"], "#f8f7f4", "#1b1b19", "#3d6b5a", "#ecebe5", "moderne", "editorial", "doux")],
  },
  {
    cle: "Bar à vin", famille: "Restauration", motsCles: ["bar à vin", "bar a vin", "cave à manger", "cave a manger", "caviste", "vins nature", "bar à cocktails", "cocktail"],
    nom: "La Grappe", motif: "assiette", surtitre: "Bar à vin{aVille}",
    titres: ["Des vins vivants et de quoi grignoter", "{nom}, la cave où l'on reste dîner"],
    sousTitres: ["Une sélection de vignerons qu'on connaît, au verre ou à la bouteille, et des assiettes à partager.", "Vins nature, fromages affinés et charcuterie fine, jusqu'à tard."],
    cta: "Réserver", ctaSecondaire: "Voir la carte",
    liste: { cible: "menu", surtitre: "Au verre, à partager", titre: "La carte", items: [
      it("Verre du moment", "Blanc, rouge ou orange, selon l'arrivage", "6 €"), it("Bouteille du vigneron", "Sélection à la cave", "dès 28 €"),
      it("Planche mixte", "Fromages affinés, charcuterie fine", "18 €"), it("Burrata", "Huile d'olive, citron, poivre", "11 €"),
      it("Rillettes maison", "Pain grillé, cornichons", "8 €"), it("Tartelette chocolat", "Ganache, fleur de sel", "7 €"),
    ] },
    galerie: ["La cave", "Le comptoir", "Les planches", "La salle"],
    atouts: [it("Vignerons choisis", "Des domaines que nous connaissons et visitons."), it("Au verre", "Une dizaine de références ouvertes chaque soir."), it("À partager", "Des assiettes simples pour accompagner.")],
    directions: [d(["sombre", "intime", "chic"], "#16100f", "#f2e9e2", "#a8323e", "#211817", "editoriale", "plein", "net"), d(["clair", "convivial", "chaleureux"], "#f7f1ea", "#2a1a19", "#8c2f3a", "#ede1d6", "editoriale", "partage", "pilule")],
  },
  {
    cle: "Restaurant végétarien", famille: "Restauration", motsCles: ["végétarien", "vegetarien", "vegan", "végan", "végétal", "vegetal", "healthy", "bowl"],
    nom: "Racines", motif: "assiette", surtitre: "Cuisine végétale{aVille}",
    titres: ["Des légumes qui ont du caractère", "{nom}, la cuisine végétale gourmande"],
    sousTitres: ["Une cuisine 100 % végétale, de saison et généreuse, qui ne donne jamais l'impression de manquer de quelque chose.", "Bowls, plats du jour et desserts maison, à base de produits locaux."],
    cta: "Réserver", ctaSecondaire: "Voir la carte",
    liste: { cible: "menu", surtitre: "Bowls, plats, desserts", titre: "La carte", items: [
      it("Bowl de saison", "Céréales, légumes rôtis, houmous, graines", "14 €"), it("Curry de lentilles", "Lait de coco, riz basmati, coriandre", "15 €"),
      it("Burger végétal", "Galette de haricots noirs, frites de patate douce", "16 €"), it("Soupe du jour", "Selon le marché", "7 €"),
      it("Cheesecake cru", "Noix de cajou, fruits rouges", "7 €"), it("Kombucha maison", "Gingembre ou hibiscus", "4,50 €"),
    ] },
    galerie: ["Les bowls", "La cuisine", "Le marché", "La salle"],
    atouts: [it("100 % végétal", "Une cuisine sans produits animaux, sans rien sacrifier au goût."), it("De saison", "La carte suit les récoltes."), it("Local", "Des maraîchers de la région.")],
    directions: [d(["frais", "moderne", "healthy"], "#f4f6ef", "#1b2a1e", "#3e7d3e", "#e5ecdc", "chaleureuse", "partage", "pilule"), d(["chaleureux", "terre", "naturel"], "#f6f0e6", "#2a2118", "#b5612f", "#ece2d2", "elegante", "plein", "doux")],
  },
  {
    cle: "Traiteur", famille: "Restauration", motsCles: ["traiteur", "buffet", "cocktail dînatoire", "mariage traiteur", "plateaux repas"],
    nom: "Maison Saveurs", motif: "assiette", surtitre: "Traiteur{aVille}",
    titres: ["Vos réceptions, sans souci en cuisine", "{nom}, traiteur pour vos événements"],
    sousTitres: ["Cocktails, buffets et repas assis pour vos mariages, séminaires et fêtes de famille, de 10 à 300 invités.", "Une cuisine de saison, livrée et servie, pour recevoir sans courir."],
    cta: "Demander un devis", ctaSecondaire: "Nos formules",
    liste: { cible: "menu", surtitre: "Formules", titre: "Pour chaque occasion", items: [
      it("Plateau repas", "Entrée, plat, dessert, livré au bureau", "18 € / pers."), it("Cocktail dînatoire", "12 pièces salées et sucrées", "29 € / pers."),
      it("Buffet froid", "Salades, terrines, viandes froides", "26 € / pers."), it("Repas assis", "Menu en trois services, service compris", "dès 55 € / pers."),
      it("Pièce montée", "Choux, nougatine, décor au choix", "dès 6 € / pers."), it("Location vaisselle", "Assiettes, verres, nappes", "sur devis"),
    ] },
    galerie: ["Les pièces cocktail", "Les buffets", "Le service", "La cuisine"],
    atouts: [it("Sur mesure", "Un menu construit avec vous, selon vos invités."), it("De 10 à 300 invités", "Du petit comité au grand mariage."), it("Clé en main", "Livraison, installation et service.")],
    faq: [it("Combien de temps à l'avance réserver ?", "Idéalement deux mois pour un mariage, deux semaines pour un cocktail d'entreprise."), it("Gérez-vous les allergies et régimes ?", "Oui : sans gluten, végétarien, sans porc… précisez-le à la commande."), it("Le service est-il inclus ?", "Il est proposé en option, avec un maître d'hôtel pour 25 invités.")],
  },

  /* --- Boulangerie --- */
  {
    cle: "Pâtisserie", famille: "Boulangerie", motsCles: ["pâtisserie", "patisserie", "pâtissier", "patissier", "gâteaux", "gateaux", "macarons", "chocolatier", "chocolaterie"],
    nom: "Maison Praline", motif: "pain", surtitre: "Pâtissier{aVille}",
    titres: ["Des gâteaux qui donnent envie de fêter quelque chose", "{nom}, pâtisserie de saison"],
    sousTitres: ["Entremets, tartes et macarons faits chaque matin, et des gâteaux sur commande pour vos fêtes.", "Une pâtisserie fine, peu sucrée, qui suit les fruits de saison."],
    cta: "Commander un gâteau", ctaSecondaire: "Voir les créations",
    liste: { cible: "menu", surtitre: "En vitrine", titre: "Nos créations", items: [
      it("Paris-brest", "Pâte à choux, praliné noisette", "5,80 €"), it("Tarte citron meringuée", "Citron de Menton, meringue italienne", "5,20 €"),
      it("Éclair vanille", "Vanille de Madagascar", "4,20 €"), it("Macarons", "La boîte de 12", "18 €"),
      it("Entremets 6 parts", "Selon la saison, sur commande", "36 €"), it("Chocolats maison", "Le ballotin de 250 g", "22 €"),
    ] },
    galerie: ["La vitrine", "Les entremets", "Les macarons", "Le laboratoire"],
    atouts: [it("Fruits de saison", "Les créations changent avec le marché."), it("Peu sucré", "Pour laisser parler les saveurs."), it("Sur commande", "Gâteaux d'anniversaire et pièces montées.")],
    directions: [d(["chic", "élégant", "elegant", "luxe"], "#f8f3ef", "#2a1e1e", "#b4566b", "#efe3dd", "elegante", "editorial", "pilule"), d(["gourmand", "chaleureux", "coloré", "colore"], "#fff6ef", "#2e1d16", "#d0623a", "#fbe6d8", "chaleureuse", "plein", "pilule")],
  },

  /* --- Beauté --- */
  {
    cle: "Barbier", famille: "Beauté & bien-être", motsCles: ["barbier", "barber", "barbe", "coiffeur homme", "coiffure homme"],
    nom: "Le Rasoir d'Or", motif: "arche", surtitre: "Barbier{aVille}",
    titres: ["Coupe nette, barbe taillée, sans attendre", "{nom}, barbier à l'ancienne"],
    sousTitres: ["Taille de barbe à la serviette chaude, rasage au coupe-chou et coupes classiques ou dégradées.", "Prenez rendez-vous en ligne, on s'occupe du reste."],
    cta: "Prendre rendez-vous", ctaSecondaire: "Voir les tarifs",
    liste: { cible: "tarifs", surtitre: "Prestations", titre: "Tarifs", items: [
      it("Coupe homme", "30 min · shampoing inclus", "25 €"), it("Taille de barbe", "20 min · serviette chaude", "18 €"),
      it("Coupe + barbe", "50 min", "38 €", "Le plus demandé"), it("Rasage traditionnel", "Coupe-chou, soin après-rasage", "28 €"),
      it("Coupe enfant", "Moins de 12 ans", "16 €"), it("Contour", "Nuque et tempes, entre deux coupes", "10 €"),
    ] },
    galerie: ["Les fauteuils", "Le coupe-chou", "La barbe", "Le salon"],
    atouts: [it("Serviette chaude", "La taille de barbe dans les règles."), it("Sur rendez-vous", "Réservez en ligne, pas d'attente."), it("Produits choisis", "Huiles, baumes et cires pour l'entretien.")],
    directions: [d(["vintage", "rétro", "retro", "classique"], "#171513", "#efe8dc", "#c8963e", "#221f1b", "editoriale", "plein", "net"), d(["moderne", "urbain", "minimal"], "#f3f2ef", "#141414", "#1f3a5f", "#e6e5e1", "moderne", "partage", "net")],
  },
  {
    cle: "Onglerie", famille: "Beauté & bien-être", motsCles: ["onglerie", "ongles", "manucure", "nail", "prothésiste ongulaire", "vernis"],
    nom: "Studio Nacre", motif: "arche", surtitre: "Onglerie{aVille}",
    titres: ["Des mains soignées jusqu'au bout des ongles", "{nom}, manucure et nail art"],
    sousTitres: ["Pose de gel, semi-permanent et nail art sur mesure, avec des produits respectueux de l'ongle.", "Un moment pour vous, en institut, sur rendez-vous."],
    cta: "Prendre rendez-vous", ctaSecondaire: "Voir les tarifs",
    liste: { cible: "tarifs", surtitre: "Prestations", titre: "Tarifs", items: [
      it("Semi-permanent mains", "45 min · tenue 3 semaines", "35 €"), it("Pose gel complète", "1 h 30", "55 €", "Le plus demandé"),
      it("Remplissage gel", "1 h", "42 €"), it("Nail art", "Par ongle, selon le motif", "dès 2 €"),
      it("Beauté des pieds", "Soin complet, vernis inclus", "40 €"), it("Dépose", "Gel ou semi-permanent", "15 €"),
    ] },
    galerie: ["Les poses", "Le nail art", "Les couleurs", "L'espace"],
    atouts: [it("Hygiène stricte", "Matériel stérilisé et limes à usage unique."), it("Ongles respectés", "Des produits qui n'abîment pas l'ongle naturel."), it("Nail art sur mesure", "Apportez votre idée, on la dessine.")],
  },
  {
    cle: "Institut et spa", famille: "Beauté & bien-être", motsCles: ["esthéticienne", "estheticienne", "institut", "spa", "massage", "soin du visage", "épilation", "epilation", "hammam"],
    nom: "Instant Calme", motif: "arche", surtitre: "Institut de beauté{aVille}",
    titres: ["Une heure pour vous, rien que pour vous", "{nom}, soins du visage et massages"],
    sousTitres: ["Soins du visage, massages et épilation dans des cabines calmes, avec des produits choisis pour leur douceur.", "Offrez-vous une parenthèse, ou offrez-la avec nos cartes cadeaux."],
    cta: "Réserver un soin", ctaSecondaire: "Cartes cadeaux",
    liste: { cible: "tarifs", surtitre: "Soins", titre: "Nos soins", items: [
      it("Soin visage éclat", "1 h · nettoyage, gommage, masque", "65 €"), it("Massage relaxant", "1 h · huiles chaudes", "70 €", "Le plus demandé"),
      it("Massage dos", "30 min", "40 €"), it("Épilation jambes complètes", "40 min", "35 €"),
      it("Beauté du regard", "Restructuration et teinture des sourcils", "25 €"), it("Carte cadeau", "Valable 1 an sur tous les soins", "au choix"),
    ] },
    galerie: ["La cabine", "Les soins", "L'accueil", "Les produits"],
    atouts: [it("Cabines au calme", "Lumière douce et musique discrète."), it("Produits doux", "Des soins choisis pour leur tolérance."), it("Cartes cadeaux", "À offrir, valables un an.")],
  },

  /* --- Artisans --- */
  {
    cle: "Plombier", famille: "Artisan", motsCles: ["plombier", "plomberie", "chauffagiste", "chauffage", "chaudière", "chaudiere", "pompe à chaleur", "fuite d'eau"],
    nom: "Durand Plomberie", motif: "outil", surtitre: "Plombier chauffagiste{aVille}",
    titres: ["Une fuite, une panne ? On arrive vite", "{nom}, plomberie et chauffage{aVille}"],
    sousTitres: ["Dépannage, chauffe-eau, chaudières, pompes à chaleur et salles de bain. Devis gratuit, prix annoncé avant d'intervenir.", "Un plombier qui répond au téléphone, arrive à l'heure et explique ce qu'il fait."],
    cta: "Demander un devis", ctaSecondaire: "Urgence plomberie", bandeau: "Fuite ou panne de chauffage ? Intervention rapide, 6 jours sur 7",
    liste: { cible: "services", surtitre: "Interventions", titre: "Ce que nous faisons", items: [
      it("Fuites et dépannage", "Recherche de fuite, robinetterie, WC."), it("Chauffe-eau", "Remplacement et entretien, thermodynamique."),
      it("Chaudières", "Installation, entretien annuel, dépannage."), it("Pompe à chaleur", "Étude, pose et mise en service."),
      it("Salle de bain", "Douche à l'italienne, rénovation complète."), it("Débouchage", "Canalisations, éviers, colonnes."),
    ] },
    galerie: ["Salle de bain", "Chaudière", "Douche à l'italienne", "Chauffe-eau"],
  },
  {
    cle: "Coiffeur", famille: "Beauté & bien-être", motsCles: ["coiffeur", "coiffeuse", "coiffure", "salon de coiffure", "coloriste"],
    nom: "Atelier Mèches", motif: "arche", surtitre: "Salon de coiffure{aVille}",
    titres: ["Une coupe qui vous ressemble, et qui tient", "{nom}, coupe, couleur et conseil", "Le salon où l'on prend le temps de vous écouter"],
    sousTitres: ["Coupes femmes, hommes et enfants, couleurs végétales et balayages, avec un vrai diagnostic avant chaque prestation.", "Des coiffeurs qui conseillent, des produits choisis et un salon où l'on se sent bien."],
    cta: "Prendre rendez-vous", ctaSecondaire: "Voir les tarifs",
  },
  {
    cle: "Électricien", famille: "Artisan", motsCles: ["électricien", "electricien", "électricité", "electricite", "domotique", "borne de recharge"],
    nom: "Volt Services", motif: "outil", surtitre: "Électricien{aVille}",
    titres: ["Une installation électrique sûre, aux normes", "{nom}, électricien de confiance{aVille}"],
    sousTitres: ["Dépannage, mise aux normes, rénovation complète et bornes de recharge. Devis gratuit, prix ferme.", "Un électricien qui explique ce qu'il fait, et qui laisse le chantier propre."],
    cta: "Demander un devis",
    liste: { cible: "services", surtitre: "Interventions", titre: "Ce que nous faisons", items: [
      it("Dépannage", "Panne, disjoncteur qui saute, court-circuit."), it("Mise aux normes", "Tableau électrique, prises de terre, différentiels."),
      it("Rénovation complète", "Câblage, prises et éclairage d'un logement entier."), it("Borne de recharge", "Installation pour véhicule électrique."),
      it("Domotique", "Volets, chauffage et éclairage pilotés."), it("Éclairage", "Intérieur, extérieur, LED basse consommation."),
    ] },
    galerie: ["Tableau électrique", "Borne de recharge", "Éclairage", "Rénovation"],
  },
  {
    cle: "Menuisier", famille: "Artisan", motsCles: ["menuisier", "menuiserie", "ébéniste", "ebeniste", "charpentier", "agencement", "dressing", "cuisine sur mesure"],
    nom: "L'Atelier du Bois", motif: "outil", surtitre: "Menuisier{aVille}",
    titres: ["Du bois, du sur-mesure, du travail bien fait", "{nom}, menuiserie et agencement sur mesure"],
    sousTitres: ["Cuisines, dressings, bibliothèques et escaliers, dessinés pour votre intérieur et fabriqués dans notre atelier.", "Des meubles pensés pour durer, en bois massif et en panneaux de qualité."],
    cta: "Parler de mon projet", ctaSecondaire: "Voir les réalisations",
    liste: { cible: "services", surtitre: "Savoir-faire", titre: "Ce que nous fabriquons", items: [
      it("Cuisines", "Façades, plans de travail, rangements."), it("Dressings", "Sur mesure, sous pente, dans les niches."),
      it("Bibliothèques", "Du sol au plafond, avec ou sans bureau."), it("Escaliers", "Droits, quart tournant, en bois massif."),
      it("Portes et fenêtres", "Fabrication et pose, isolation renforcée."), it("Terrasses", "Bois exotique ou composite."),
    ] },
    galerie: ["Cuisine en chêne", "Dressing", "Escalier", "L'atelier"],
    directions: [d(["bois", "chaleureux", "artisanal", "traditionnel"], "#f5efe6", "#2a2018", "#8a5a2b", "#ebe1d2", "elegante", "plein", "net")],
  },
  {
    cle: "Peintre", famille: "Artisan", motsCles: ["peintre en bâtiment", "peintre bâtiment", "peinture", "décorateur", "decorateur", "papier peint", "ravalement"],
    nom: "Teintes & Finitions", motif: "outil", surtitre: "Peintre en bâtiment{aVille}",
    titres: ["Des murs impeccables, un chantier propre", "{nom}, peinture et décoration intérieure"],
    sousTitres: ["Peinture intérieure, papier peint, enduits décoratifs et ravalement de façade. Protection soignée de vos meubles et sols.", "Conseils couleurs offerts, devis détaillé, délais tenus."],
    cta: "Demander un devis",
    liste: { cible: "services", surtitre: "Prestations", titre: "Nos prestations", items: [
      it("Peinture intérieure", "Murs, plafonds, boiseries."), it("Papier peint", "Pose de toutes matières, raccords soignés."),
      it("Enduits décoratifs", "Béton ciré, chaux, effets matière."), it("Ravalement", "Nettoyage, réparation et peinture de façade."),
      it("Conseil couleur", "Nuancier et essais sur place."), it("Petites réparations", "Fissures, rebouchage, ponçage."),
    ] },
    galerie: ["Salon", "Façade", "Chambre", "Cuisine"],
  },
  {
    cle: "Paysagiste", famille: "Artisan", motsCles: ["paysagiste", "jardinier", "jardin", "élagage", "elagage", "espaces verts", "tonte"],
    nom: "Vert Sauvage", motif: "elan", surtitre: "Paysagiste{aVille}",
    titres: ["Un jardin qui vous ressemble, toute l'année", "{nom}, création et entretien de jardins"],
    sousTitres: ["Création de jardins, terrasses, haies et entretien régulier, avec des plantes adaptées à votre sol et au climat.", "Des jardins vivants, faciles à vivre et économes en eau."],
    cta: "Demander un devis", ctaSecondaire: "Nos réalisations",
    liste: { cible: "services", surtitre: "Prestations", titre: "Ce que nous faisons", items: [
      it("Création de jardin", "Plan, plantations, allées."), it("Entretien", "Tonte, taille, désherbage, à la saison ou à l'année."),
      it("Élagage", "Taille d'arbres et abattage en sécurité."), it("Terrasses", "Bois, pierre, dallage."),
      it("Arrosage", "Systèmes automatiques et récupération d'eau."), it("Clôtures et haies", "Plantation et pose."),
    ] },
    galerie: ["Jardin de ville", "Terrasse en bois", "Massifs fleuris", "Potager"],
    directions: [d(["nature", "vert", "écologique", "ecologique"], "#f3f5ee", "#1a2618", "#3d7a35", "#e3eadb", "chaleureuse", "plein", "doux")],
  },
  {
    cle: "Nettoyage", famille: "Artisan", motsCles: ["nettoyage", "ménage", "menage", "propreté", "proprete", "entretien de bureaux", "conciergerie"],
    nom: "Net & Clair", motif: "outil", surtitre: "Entreprise de nettoyage{aVille}",
    titres: ["Des locaux propres, sans y penser", "{nom}, nettoyage pour particuliers et entreprises"],
    sousTitres: ["Bureaux, commerces, fins de chantier et vitres, avec des produits écologiques et une équipe stable.", "Une prestation régulière ou ponctuelle, avec un interlocuteur unique."],
    cta: "Demander un devis",
    liste: { cible: "services", surtitre: "Prestations", titre: "Nos services", items: [
      it("Bureaux", "Entretien quotidien ou hebdomadaire."), it("Commerces", "Avant ou après vos heures d'ouverture."),
      it("Fin de chantier", "Remise en état avant livraison."), it("Vitres", "Intérieur, extérieur, en hauteur."),
      it("Particuliers", "Ménage régulier, déductible des impôts."), it("Remise en état", "Déménagement, état des lieux."),
    ] },
    galerie: ["Bureaux", "Vitres", "Fin de chantier", "Commerce"],
  },
  {
    cle: "Couvreur", famille: "Artisan", motsCles: ["couvreur", "toiture", "zinguerie", "charpente", "gouttière", "gouttiere"],
    nom: "Toits & Tuiles", motif: "outil", surtitre: "Couvreur{aVille}",
    titres: ["Un toit solide, une maison au sec", "{nom}, couverture et zinguerie"],
    sousTitres: ["Réparation de fuites, réfection de toiture, zinguerie et isolation des combles. Intervention rapide après intempéries.", "Diagnostic de toiture gratuit, devis détaillé et chantier garanti."],
    cta: "Demander un diagnostic",
    liste: { cible: "services", surtitre: "Interventions", titre: "Nos services", items: [
      it("Recherche de fuite", "Intervention rapide, bâchage d'urgence."), it("Réfection de toiture", "Tuiles, ardoises, bac acier."),
      it("Zinguerie", "Gouttières, chéneaux, descentes."), it("Isolation des combles", "Soufflée ou en rouleaux."),
      it("Démoussage", "Nettoyage et traitement hydrofuge."), it("Fenêtres de toit", "Pose et remplacement."),
    ] },
    galerie: ["Toiture en ardoise", "Zinguerie", "Combles", "Tuiles"],
  },

  /* --- Coaching --- */
  {
    cle: "Yoga", famille: "Coaching & sport", motsCles: ["yoga", "méditation", "meditation", "pilates", "sophrologie", "respiration"],
    nom: "Shanti Studio", motif: "elan", surtitre: "Studio de yoga{aVille}",
    titres: ["Respirer, bouger, revenir à soi", "{nom}, yoga et pilates en petits groupes"],
    sousTitres: ["Des cours pour tous les niveaux, en petits groupes de dix au plus, dans un studio lumineux.", "Hatha, vinyasa, yin et pilates : trouvez la pratique qui vous fait du bien."],
    cta: "Réserver un cours d'essai", ctaSecondaire: "Voir le planning",
    liste: { cible: "tarifs", surtitre: "Formules", titre: "Pratiquer à votre rythme", items: [
      it("Cours d'essai", "Une séance pour découvrir le studio", "12 €"), it("Carte 10 cours", "Valable 6 mois", "150 €", "Le plus choisi"),
      it("Abonnement illimité", "Tous les cours, sans engagement", "89 €/mois"),
    ] },
    galerie: ["Le studio", "Les cours", "Le matériel", "La lumière"],
    atouts: [it("Petits groupes", "Dix élèves au plus, pour être vraiment accompagné."), it("Tous niveaux", "Des cours débutants chaque semaine."), it("Sans engagement", "Carte ou abonnement, vous choisissez.")],
    directions: [d(["zen", "doux", "nature", "calme"], "#f6f2ec", "#2b2520", "#a5683e", "#ece3d7", "elegante", "partage", "pilule"), d(["moderne", "lumineux", "minimal"], "#f7f7f5", "#1d1d1b", "#7a6cc4", "#ececf1", "moderne", "editorial", "pilule")],
  },
  {
    cle: "Salle de sport", famille: "Coaching & sport", motsCles: ["salle de sport", "musculation", "crossfit", "fitness", "boxe", "cross training"],
    nom: "Iron Club", motif: "elan", surtitre: "Salle de sport{aVille}",
    titres: ["Entraînez-vous sérieusement, sans vous prendre au sérieux", "{nom}, la salle où l'on progresse"],
    sousTitres: ["Plateau de musculation, cours collectifs et coachs présents à toutes les heures d'affluence.", "Matériel de qualité, ambiance motivante, sans engagement."],
    cta: "Essai gratuit", ctaSecondaire: "Voir les abonnements",
    liste: { cible: "tarifs", surtitre: "Abonnements", titre: "Choisissez votre formule", items: [
      it("Séance découverte", "Visite et entraînement avec un coach", "Offerte"), it("Abonnement mensuel", "Accès illimité, cours compris, sans engagement", "39 €/mois", "Le plus choisi"),
      it("Coaching privé", "Programme personnalisé, 1 h", "45 €"),
    ] },
    galerie: ["Le plateau", "Les cours", "Le ring", "Les vestiaires"],
  },

  /* --- Boutiques --- */
  {
    cle: "Bijoux", famille: "Boutique en ligne", motsCles: ["bijoux", "bijou", "joaillerie", "colliers", "bagues", "boucles d'oreilles"],
    nom: "Atelier Ondine", motif: "objet", surtitre: "Bijoux faits main",
    titres: ["Des bijoux délicats, faits pour être portés tous les jours", "{nom}, bijoux faits main en petites séries"],
    sousTitres: ["Colliers, bagues et boucles d'oreilles en laiton doré et argent recyclé, façonnés à la main dans notre atelier.", "Des pièces fines et solides, emballées avec soin pour offrir."],
    cta: "Découvrir la collection", ctaSecondaire: "L'atelier",
    liste: { cible: "galerie", surtitre: "La collection", titre: "Meilleures ventes", items: [
      it("Collier Aube", "", "48 €"), it("Bague Ondée", "", "36 €"), it("Créoles Lune", "", "42 €"), it("Bracelet Fil", "", "29 €"),
    ] },
    atouts: [it("Fait main", "Chaque bijou est façonné et poli à l'atelier."), it("Métaux recyclés", "Argent recyclé et laiton doré à l'or fin."), it("Prêt à offrir", "Écrin et mot personnalisé sur demande.")],
  },
  {
    cle: "Céramique", famille: "Boutique en ligne", motsCles: ["céramique", "ceramique", "poterie", "potier", "grès", "gres", "vaisselle"],
    nom: "Terre de Lune", motif: "objet", surtitre: "Céramiques faites main",
    atouts: [it("Pièces uniques", "Chaque pièce est tournée et émaillée à la main."), it("Usage quotidien", "Lave-vaisselle et micro-ondes."), it("Ateliers", "Initiez-vous au tour, en petit groupe.")],
    titres: ["De la vaisselle qui a du caractère", "{nom}, céramiques tournées à la main"],
    sousTitres: ["Bols, tasses et assiettes en grès, tournés et émaillés à la main. Chaque pièce est unique.", "Une vaisselle solide, qui passe au lave-vaisselle et au micro-ondes."],
    cta: "Voir la boutique", ctaSecondaire: "Ateliers de poterie",
    liste: { cible: "galerie", surtitre: "La boutique", titre: "Les pièces du moment", items: [
      it("Bol Sillon", "", "28 €"), it("Tasse Brume", "", "24 €"), it("Assiette Grève", "", "32 €"), it("Vase Galet", "", "45 €"),
    ] },
  },
  {
    cle: "Fleuriste", famille: "Boutique en ligne", motsCles: ["fleuriste", "fleurs", "bouquet", "composition florale", "plantes"],
    nom: "Pétales & Cie", motif: "fleur", surtitre: "Fleuriste{aVille}",
    atouts: [it("Fleurs de saison", "Locales dès que possible."), it("Composé pour vous", "Dites-nous l'occasion, on s'adapte."), it("Livraison en ville", "Le jour même pour toute commande avant 14 h.")],
    titres: ["Des fleurs de saison, composées pour vous", "{nom}, bouquets et compositions florales"],
    sousTitres: ["Bouquets du jour, compositions pour vos événements et livraison en ville, avec des fleurs locales dès que possible.", "Dites-nous pour qui et pour quelle occasion, on s'occupe du reste."],
    cta: "Commander un bouquet", ctaSecondaire: "Mariages et événements", bandeau: "Livraison le jour même pour toute commande avant 14 h",
    liste: { cible: "galerie", surtitre: "Bouquets", titre: "Les bouquets du moment", items: [
      it("Bouquet du jour", "", "35 €"), it("Champêtre", "", "45 €"), it("Rond pastel", "", "55 €"), it("Plante en pot", "", "29 €"),
    ] },
    directions: [d(["chaleureux", "coloré", "colore", "champêtre", "champetre"], "#fbf4f1", "#2c1e1f", "#c0466b", "#f4e3e3", "elegante", "partage", "pilule"), d(["chic", "élégant", "elegant", "minimal"], "#f5f3ee", "#1f2420", "#4b6b4a", "#e8e8df", "editoriale", "editorial", "net")],
  },
  {
    cle: "Épicerie fine", famille: "Boutique en ligne", motsCles: ["épicerie", "epicerie", "produits locaux", "vrac", "fromagerie", "caviste", "miel", "confitures"],
    nom: "Le Garde-Manger", motif: "objet", surtitre: "Épicerie fine{aVille}",
    atouts: [it("Producteurs choisis", "Nous les rencontrons avant de les référencer."), it("Coffrets cadeaux", "Composés à la demande."), it("Conseils", "On goûte tout ce qu'on vend.")],
    titres: ["Les bons produits, de producteurs qu'on connaît", "{nom}, épicerie fine et produits locaux"],
    sousTitres: ["Huiles, confitures, fromages, vins et douceurs sélectionnés chez des producteurs de la région.", "En boutique, en coffret cadeau ou livré chez vous."],
    cta: "Voir les produits", ctaSecondaire: "Coffrets cadeaux",
    liste: { cible: "galerie", surtitre: "Sélection", titre: "Nos coups de cœur", items: [
      it("Coffret découverte", "", "39 €"), it("Miel de châtaignier", "", "11 €"), it("Huile d'olive", "", "16 €"), it("Confiture de figues", "", "7,50 €"),
    ] },
  },
  {
    cle: "Vêtements", famille: "Boutique en ligne", motsCles: ["vêtements", "vetements", "mode", "prêt-à-porter", "pret-a-porter", "t-shirts", "textile", "friperie"],
    nom: "Maison Lin", motif: "objet", surtitre: "Nouvelle collection",
    atouts: [it("Matières naturelles", "Lin, laine et coton biologique."), it("Fabriqué en Europe", "Dans des ateliers que nous connaissons."), it("Retours gratuits", "30 jours pour changer d'avis.")],
    titres: ["Des vêtements simples, faits pour durer", "{nom}, mode responsable fabriquée en Europe"],
    sousTitres: ["Des matières naturelles, des coupes intemporelles et une fabrication en petites séries.", "Moins de pièces, mieux faites, à porter longtemps."],
    cta: "Voir la collection", ctaSecondaire: "Nos matières",
    liste: { cible: "galerie", surtitre: "La collection", titre: "Les essentiels", items: [
      it("Chemise en lin", "", "89 €"), it("Pantalon large", "", "95 €"), it("Pull en laine", "", "120 €"), it("T-shirt coton bio", "", "39 €"),
    ] },
  },

  /* --- Portfolios --- */
  {
    cle: "Photographe", famille: "Portfolio", motsCles: ["photographe", "photo", "mariage", "shooting", "portrait"],
    nom: "Lumière Vive", motif: "cadre", surtitre: "Photographe{aVille}",
    titres: ["Vos moments, sans pose ni artifice", "{nom}"],
    sousTitres: ["Mariages, portraits et reportages, avec une approche discrète qui laisse place aux vraies émotions.", "Des images naturelles et lumineuses, livrées dans une galerie privée."],
    cta: "Voir les galeries", ctaSecondaire: "Demander une date",
    liste: { cible: "services", surtitre: "Prestations", titre: "Formules", items: [
      it("Mariage", "De la préparation à la soirée, galerie en ligne.", "dès 1 400 €"), it("Portrait", "1 h de séance, 15 photos retouchées.", "180 €"),
      it("Reportage", "Entreprises, événements, lieux.", "sur devis"),
    ] },
    galerie: ["Mariage", "Portrait", "Cérémonie", "Famille", "Reportage", "Couple"],
  },
  {
    cle: "Architecte", famille: "Portfolio", motsCles: ["architecte", "architecture", "architecte d'intérieur", "décoration d'intérieur", "home staging"],
    nom: "Atelier Ligne", motif: "colonne", surtitre: "Architecte{aVille}",
    titres: ["Des lieux pensés pour ceux qui les habitent", "{nom}, architecture et intérieurs"],
    sousTitres: ["Rénovation, extension et aménagement intérieur, de l'esquisse au suivi de chantier.", "Nous dessinons des espaces simples, lumineux et durables."],
    cta: "Voir les projets", ctaSecondaire: "Prendre rendez-vous",
    liste: { cible: "services", surtitre: "Missions", titre: "Ce que je fais", items: [
      it("Esquisse", "Premières intentions, plans et volumes."), it("Permis de construire", "Dossier complet et suivi administratif."),
      it("Suivi de chantier", "Coordination des entreprises jusqu'à la livraison."),
    ] },
    galerie: ["Maison", "Rénovation", "Extension", "Intérieur", "Cuisine", "Atelier"],
  },
  {
    cle: "Développeur", famille: "Portfolio", motsCles: ["développeur", "developpeur", "développeuse", "developpeuse", "agence web", "création de sites", "creation de sites", "freelance web", "webdesigner", "web designer", "designer ux", "designer ui"],
    nom: "Studio Pixel", motif: "cadre", surtitre: "Freelance{aVille}",
    titres: ["Des sites rapides, accessibles et bien construits", "{nom}, design et développement web"],
    sousTitres: ["Sites vitrines, applications web et refontes, du design au déploiement.", "Je travaille avec des petites équipes qui veulent un produit soigné."],
    cta: "Voir les projets", ctaSecondaire: "Me contacter",
    liste: { cible: "services", surtitre: "Services", titre: "Ce que je propose", items: [
      it("Site vitrine", "Design, développement et mise en ligne."), it("Application web", "Interfaces, API, base de données."),
      it("Accompagnement", "Audit, performance, accessibilité."),
    ] },
    galerie: ["Projet 01", "Projet 02", "Projet 03", "Projet 04", "Projet 05", "Projet 06"],
    directions: [d(["sombre", "tech"], "#0d0f12", "#e9ecef", "#7cdbb7", "#171a1f", "moderne", "editorial", "doux")],
  },

  /* --- Conseil --- */
  {
    cle: "Avocat", famille: "Conseil", motsCles: ["avocat", "avocate", "cabinet d'avocats", "juridique"],
    nom: "Cabinet Valmont", motif: "colonne", surtitre: "Avocat{aVille}",
    titres: ["Défendre vos droits avec clarté", "{nom}, avocats{aVille}"],
    sousTitres: ["Conseil et contentieux pour les particuliers et les entreprises, avec des honoraires annoncés à l'avance.", "Un avocat disponible, qui vous explique où vous en êtes."],
    cta: "Prendre rendez-vous",
  },
  {
    cle: "Expert-comptable", famille: "Conseil", motsCles: ["comptable", "expert-comptable", "expertise comptable", "comptabilité", "comptabilite", "fiscalité", "fiscalite"],
    nom: "Chiffres & Conseils", motif: "colonne", surtitre: "Expert-comptable{aVille}",
    titres: ["Votre comptabilité tenue, vos décisions éclairées", "{nom}, expertise comptable pour TPE et indépendants"],
    sousTitres: ["Tenue comptable, bilans, déclarations et conseil de gestion, avec un interlocuteur qui répond vite.", "Des outils en ligne, un vrai conseil humain."],
    cta: "Demander un devis",
    liste: { cible: "services", surtitre: "Missions", titre: "Nos missions", items: [
      it("Tenue comptable", "Saisie, rapprochements, pièces en ligne."), it("Bilan annuel", "Comptes annuels et liasse fiscale."),
      it("Déclarations", "TVA, impôts, social."), it("Création d'entreprise", "Statut, prévisionnel, démarches."),
      it("Paie", "Bulletins et déclarations sociales."), it("Conseil de gestion", "Tableaux de bord et rendez-vous réguliers."),
    ] },
  },
  {
    cle: "Agence immobilière", famille: "Conseil", motsCles: ["immobilier", "immobilière", "immobiliere", "agent immobilier", "location", "gestion locative"],
    nom: "Clés en Ville", motif: "colonne", surtitre: "Agence immobilière{aVille}",
    titres: ["Vendre, acheter, louer, sans perdre de temps", "{nom}, votre agence de quartier"],
    sousTitres: ["Estimation gratuite, accompagnement jusqu'à la signature et gestion locative pour les propriétaires.", "Une agence qui connaît le quartier, rue par rue."],
    cta: "Estimer mon bien", ctaSecondaire: "Voir les annonces",
    liste: { cible: "services", surtitre: "Services", titre: "Ce que nous faisons", items: [
      it("Estimation", "Gratuite, sous 48 h, avec étude du marché local."), it("Vente", "Photos, visites, négociation, signature."),
      it("Achat", "Recherche ciblée selon vos critères."), it("Location", "Sélection des locataires, état des lieux."),
      it("Gestion locative", "Loyers, travaux, déclarations."), it("Conseil", "Fiscalité et investissement locatif."),
    ] },
    galerie: ["Appartement", "Maison", "Loft", "Studio"],
  },

  /* --- Santé --- */
  {
    cle: "Kinésithérapeute", famille: "Santé & soins", motsCles: ["kiné", "kine", "kinésithérapeute", "kinesitherapeute", "kinésithérapie", "rééducation", "reeducation"],
    nom: "Cabinet Mouvement", surtitre: "Kinésithérapeute{aVille}",
    titres: ["Retrouver le mouvement, sans douleur", "{nom}, rééducation et kinésithérapie du sport"],
    sousTitres: ["Rééducation après blessure ou opération, douleurs de dos et kinésithérapie du sport, sur rendez-vous.", "Des séances individuelles et un programme d'exercices à refaire chez vous."],
    cta: "Prendre rendez-vous",
  },
  {
    cle: "Ostéopathe", famille: "Santé & soins", motsCles: ["ostéopathe", "osteopathe", "ostéopathie", "osteopathie", "chiropracteur"],
    nom: "Cabinet Équilibre", surtitre: "Ostéopathe{aVille}",
    titres: ["Soulager le corps dans son ensemble", "{nom}, ostéopathie pour toute la famille"],
    sousTitres: ["Douleurs de dos, tensions, troubles du sommeil ou suivi des nourrissons, sur rendez-vous.", "Une consultation d'une heure, à l'écoute de votre histoire."],
    cta: "Prendre rendez-vous",
  },
  {
    cle: "Psychologue", famille: "Santé & soins", motsCles: ["psychologue", "psychothérapeute", "psychotherapeute", "thérapeute", "therapeute", "hypnose", "hypnothérapeute", "naturopathe", "sophrologue"],
    nom: "Cabinet Parenthèse", surtitre: "Accompagnement{aVille}",
    titres: ["Un espace pour déposer ce qui pèse", "{nom}, consultations en cabinet et en visio"],
    sousTitres: ["Anxiété, épuisement, périodes de transition : un accompagnement bienveillant, à votre rythme.", "Premier rendez-vous pour faire connaissance, sans engagement."],
    cta: "Prendre rendez-vous",
    directions: [d(["doux", "calme", "rassurant"], "#f6f3ee", "#28302c", "#6e8a7a", "#ebe8e0", "elegante", "partage", "pilule")],
  },

  /* --- Hébergement --- */
  {
    cle: "Chambres d'hôtes", famille: "Hébergement", motsCles: ["chambre d'hôtes", "chambres d'hôtes", "chambre d'hote", "gîte", "gite", "maison d'hôtes", "location saisonnière", "location de vacances"],
    nom: "La Maison des Prés", surtitre: "Chambres d'hôtes{aVille}",
    titres: ["Une maison où l'on se sent tout de suite chez soi", "{nom}, chambres d'hôtes au calme"],
    sousTitres: ["Cinq chambres lumineuses, un petit-déjeuner fait maison et un grand jardin pour ne rien faire.", "Pour un week-end ou une semaine, au calme et à deux pas de tout."],
    cta: "Réserver un séjour", ctaSecondaire: "Voir les chambres",
  },
  {
    cle: "Hôtel", famille: "Hébergement", motsCles: ["hôtel", "hotel", "auberge", "camping", "glamping"],
    nom: "Hôtel des Voyageurs", surtitre: "Hôtel{aVille}",
    titres: ["Un hôtel à taille humaine, au cœur de la ville", "{nom}, une étape qu'on n'oublie pas"],
    sousTitres: ["Des chambres calmes et confortables, un petit-déjeuner généreux et une équipe aux petits soins.", "Réservez en direct : meilleur tarif garanti et annulation souple."],
    cta: "Réserver", ctaSecondaire: "Les chambres",
  },
];
