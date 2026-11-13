// Vraies photos des sites générés, par métier. Elles viennent d'Unsplash (licence Unsplash :
// usage libre, y compris commercial ; auteurs dans public/exemples/CREDITS.md) et sont chargées
// depuis son serveur d'images. Le client les remplace par les siennes dans son vrai site. Un
// métier sans série ici garde l'illustration dessinée.

export interface SeriePhotos {
  /** Grande image du haut de page. */
  hero: string;
  /** Images de la galerie, chacune avec la légende qui la décrit (affichée sous ou sur la photo). */
  galerie: [id: string, legende: string][];
  /** Image de la section « à propos ». */
  apropos: string;
}

const restaurant: SeriePhotos = {
  hero: "photo-1772479020020-9bd8d2f577d0", // table dressée aux bougies, pâtes et salade
  galerie: [
    ["photo-1731475761027-0b6b33b74547", "La salle"], // amis qui rient autour d'une table
    ["photo-1626232441076-a2a5ada2256a", "Poulpe grillé"], // poulpe grillé, assiette bleue
    ["photo-1719573019827-d06944a0c2be", "La terrasse"], // serveur en terrasse avec un plateau
    ["photo-1711536644694-66ae63f62f75", "La cave"], // deux verres de vin rouge, bougie
  ],
  apropos: "photo-1625943554499-342838b9c37f", // convives partageant une poêle et du vin
};

const boulangerie: SeriePhotos = {
  hero: "photo-1595437034774-4df383d9b7cd", // pains derrière le comptoir
  galerie: [
    ["photo-1675725291010-cb1020860cb2", "Pain au levain"], // miche au levain sur une planche
    ["photo-1619540158662-bb74607515f2", "Croissants pur beurre"], // croissants et café
    ["photo-1707528904105-4a97ac86feb5", "Viennoiseries du jour"], // comptoir de viennoiseries
    ["photo-1588412726439-c4b579e96000", "Tarte aux fruits rouges"], // tarte aux fruits rouges
  ],
  apropos: "photo-1616898650098-0c9f737f8c04", // mains qui travaillent la pâte
};

const coiffure: SeriePhotos = {
  hero: "photo-1617311454806-1b8b2b8af811", // cheveux longs méchés, lumière douce
  galerie: [
    ["photo-1633985918830-5a112c01cbd7", "Boucles naturelles"], // boucles cuivrées, veste en jean
    ["photo-1674867688577-0ba3be4b7773", "Coupe courte"], // coupe courte gris cendré
    ["photo-1620939391272-b03c1ccdd10c", "Couleur cuivrée"], // boucles cuivrées brillantes
    ["photo-1633229032316-e9e88274e3fe", "Blond et ondulations"], // longs cheveux blonds ondulés
  ],
  apropos: "photo-1631198824665-9872caf6c6ae", // coiffeuse tenant ses ciseaux
};

const renovation: SeriePhotos = {
  hero: "photo-1666585607888-3f6fe0b323d8", // séjour rénové, grande baie
  galerie: [
    ["photo-1556971014-c739dd2a762f", "Escalier restauré"], // escalier courbe restauré
    ["photo-1638541363822-6f4c189b5cf7", "Cuisine sur mesure"], // cuisine blanche, plan en pierre
    ["photo-1630699375895-fe5996d163ee", "Parquet en chêne"], // pièce blanche, parquet en chêne neuf
    ["photo-1595327775729-266512319652", "Escalier en bois"], // escalier droit en bois
  ],
  apropos: "photo-1660074127797-1c429fbb8cd6", // artisan en gilet de chantier
};

const plomberie: SeriePhotos = {
  hero: "photo-1721825157088-1cf9e64ddba5", // salle de bains terminée, baignoire îlot
  galerie: [
    ["photo-1646592491489-ebdf758b9d11", "Cuisine : évier et robinetterie"], // cuisine blanche, évier et robinet
    ["photo-1685949546169-0d6e2505acae", "Robinetterie de douche"], // douchette en laiton
    ["photo-1669725341213-7379ff6c90d5", "Radiateur"], // radiateur sous une fenêtre
    ["photo-1667491295131-c6ccecd35f65", "Plancher chauffant"], // plancher chauffant avant la chape
  ],
  apropos: "photo-1688841747582-41097036109d", // technicien souriant, casque et gilet
};

const sport: SeriePhotos = {
  hero: "photo-1619107372089-9b05ed524774", // cours collectif dans un studio ensoleillé
  galerie: [
    ["photo-1599447421321-1c96150f0f6b", "Yoga"], // posture du triangle sur tapis
    ["photo-1583187856683-dddad0e87f79", "Boxe"], // travail aux pattes d'ours
    ["photo-1597460970331-f3e7c941f4e0", "Renforcement"], // haltères près d'une baie vitrée
    ["photo-1682531024622-e3eb89bc6fb9", "Cardio"], // corde à sauter
  ],
  apropos: "photo-1609858922226-d8e75c4502e4", // coach souriant, disque en main
};

const ceramique: SeriePhotos = {
  hero: "photo-1639146266039-6c8f7d738b51", // pile de bols bleus
  galerie: [
    ["photo-1605025515868-c35a7c6cccce", "Tasse émaillée noire"], // tasse émaillée noire
    ["photo-1666445759502-85124c28524e", "Gobelet moucheté"], // gobelet moucheté
    ["photo-1674390521253-79caf82d0ceb", "Vase émaillé"], // vase émaillé rouge orangé
    ["photo-1660950644107-64b706f631cb", "Assiettes en grès"], // table dressée d'assiettes en grès
  ],
  apropos: "photo-1599958336382-c6a7c598925c", // potier qui pose l'émail
};

const mode: SeriePhotos = {
  hero: "photo-1566534547522-43d6b76d5b84", // manteau rouge devant une porte sculptée
  galerie: [
    ["photo-1585408641691-2500a721af54", "Pull en grosse maille"], // gros pull jaune sur fond bleu
    ["photo-1621296825543-6ee0cd988907", "Blouse à pois"], // blouse à pois, mur orange
    ["photo-1727953332323-0c27ca507182", "Surchemise à carreaux"], // surchemise à carreaux, ciel bleu
    ["photo-1627910002384-990a96e6b699", "Robe imprimée"], // robe à motifs, bras levés
  ],
  apropos: "photo-1684259499086-93cb3e555803", // atelier de couture
};

const hebergement: SeriePhotos = {
  hero: "photo-1772352214475-12f9a75618d8", // table en terrasse au-dessus de la mer
  galerie: [
    ["photo-1765421617367-4b6f88423be9", "Coin lecture"], // coin lecture, fauteuil bleu, fenêtre sur l'eau
    ["photo-1621626802138-544f167e2c7f", "Salle de bains"], // bain en pierre sous une verrière
    ["photo-1771454174712-d2c0cfb78244", "Le port"], // maisons de pierre sur le port
    ["photo-1664546046715-e039cfce393a", "Le soir sur l'eau"], // barque au mouillage, ciel rose
  ],
  apropos: "photo-1759612291131-587ccee7df3d", // ruelle aux maisons ocre
};

// Série hébergée avec le site (public/exemples/cafe), reprise du modèle MIT « Business Casual ».
const cafe: SeriePhotos = {
  hero: "/exemples/cafe/comptoir.jpg", // barista souriante derrière la machine
  galerie: [
    ["/exemples/cafe/salle.jpg", "La salle"], // grande salle vue d'en haut, canapés, comptoir
    ["/exemples/cafe/cafes.jpg", "Les cafés"], // sept tasses en cercle sur un guéridon
    ["/exemples/cafe/croissant.jpg", "Croissant pur beurre"], // croissant sur un plateau en bois
    ["/exemples/cafe/sacs.jpg", "Le café vert"], // sacs de jute empilés
  ],
  apropos: "/exemples/cafe/grains.jpg", // grains torréfiés en gros plan
};

const series: Record<string, SeriePhotos> = {
  Café: cafe,
  Restauration: restaurant,
  "Bar à vin": restaurant,
  Traiteur: restaurant,
  Boulangerie: boulangerie,
  Pâtisserie: boulangerie,
  Coiffeur: coiffure,
  Barbier: coiffure,
  Artisan: renovation,
  Menuisier: renovation,
  Peintre: renovation,
  Plombier: plomberie,
  "Coaching & sport": sport,
  "Salle de sport": sport,
  Yoga: sport,
  Céramique: ceramique,
  Vêtements: mode,
  Hébergement: hebergement,
  "Chambres d'hôtes": hebergement,
  Hôtel: hebergement,
};

/** Série de photos d'un secteur (métier précis ou famille), s'il en existe une. */
export function photosPour(secteur: string): SeriePhotos | undefined {
  return series[secteur];
}

/** Adresse d'une photo, recadrée et allégée par le serveur d'images. */
export function urlPhoto(id: string, largeur = 800): string {
  // Photo hébergée avec le site (public/exemples) : servie telle quelle.
  if (id.startsWith("/")) return id;
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${largeur}&q=80`;
}

/** Photos de plats, par nom exact dans la carte (seuls les plats photographiés en ont une). */
const plats: Record<string, string> = {
  "Poulpe grillé": "photo-1626232441076-a2a5ada2256a",
  "Linguine aux herbes": "photo-1693820206774-d4a769355142",
  "Moules marinières": "photo-1710775694428-5f6e66ae6a4c",
  "Huîtres n° 3": "photo-1717251883191-9a1411878790",
  "Cafés de spécialité": "/exemples/cafe/cafes.jpg",
  "Croissant pur beurre": "/exemples/cafe/croissant.jpg",
  "Café en grains · 250 g": "/exemples/cafe/grains.jpg",
};

export function photoPlat(nom: string): string | undefined {
  return plats[nom];
}
