import type { PrismaClient } from "@prisma/client";

/** Générateur pseudo-aléatoire à graine : le jeu de démonstration est identique à chaque seed. */
export function rng(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)]!,
    chance: (p: number) => next() < p,
  };
}

const PREFIXES = [
  "Cabinet",
  "Atelier",
  "Maison",
  "Groupe",
  "Clinique",
  "Hôtel",
  "Domaine",
  "Pharmacie",
  "Garage",
  "Résidence",
  "Crèche",
  "Boulangerie",
  "Imprimerie",
  "Agence",
];
const NAMES = [
  "du Lot",
  "Cadurcien",
  "Valentré",
  "des Causses",
  "Figeac Santé",
  "Quercy Blanc",
  "Garonne",
  "Saint-Cirq",
  "Rocamadour",
  "Vallée du Célé",
  "Pech Merle",
  "Bouriane",
  "Marty & Fils",
  "Delpech",
  "Lacoste",
  "Vidal",
  "Bessières",
  "Cazes",
  "Laborie",
  "Fabre",
  "Couderc",
  "Roques",
  "Mazet",
  "Bonnet",
];
const CITIES = [
  "Cahors",
  "Figeac",
  "Gourdon",
  "Souillac",
  "Prayssac",
  "Montauban",
  "Villefranche-de-Rouergue",
  "Brive-la-Gaillarde",
  "Toulouse",
  "Luzech",
  "Puy-l'Évêque",
  "Gramat",
  "Saint-Céré",
  "Castelnau-Montratier",
];
const FIRST = [
  "Marie",
  "Julien",
  "Sophie",
  "Thomas",
  "Camille",
  "Nicolas",
  "Laura",
  "Pierre",
  "Émilie",
  "Antoine",
  "Chloé",
  "Mathieu",
  "Sarah",
  "Hugo",
  "Léa",
  "Maxime",
  "Manon",
  "Alexandre",
  "Inès",
  "Paul",
  "Claire",
  "Louis",
  "Anaïs",
  "Romain",
  "Jeanne",
  "Baptiste",
];
const LAST = [
  "Martin",
  "Bernard",
  "Dubois",
  "Durand",
  "Lefebvre",
  "Moreau",
  "Laurent",
  "Simon",
  "Michel",
  "Garcia",
  "Roux",
  "Fournier",
  "Delmas",
  "Couderc",
  "Vayssière",
  "Lacombe",
  "Bouscarel",
  "Cayla",
  "Pélissié",
  "Lagarrigue",
  "Vergnes",
  "Rigal",
  "Soulié",
  "Lafon",
];
const JOBS = [
  "Gérant·e",
  "Directeur·rice",
  "Responsable des services généraux",
  "Office manager",
  "Directeur·rice administratif·ve",
  "Assistant·e de direction",
  "Responsable achats",
  "Comptable",
  "Responsable qualité",
  "Chef·fe d'établissement",
];
const TAGS = [
  "contrat annuel",
  "vitrerie",
  "remise en état",
  "bureaux",
  "médical",
  "hôtellerie",
  "fin de chantier",
  "VIP",
];

function slug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Entreprises et contacts de démonstration (une seule fois par espace). */
export async function seedCrm(prisma: PrismaClient, organizationId: string, ownerIds: string[]) {
  if ((await prisma.company.count({ where: { organizationId } })) > 0) return;
  const r = rng(20260927);
  const now = Date.now();
  const companies: { id: string; name: string; domain: string }[] = [];
  const used = new Set<string>();
  while (companies.length < 60) {
    const name = `${r.pick(PREFIXES)} ${r.pick(NAMES)}`;
    if (used.has(name)) continue;
    used.add(name);
    const domain = `${slug(name)}.fr`;
    const createdAt = new Date(now - r.int(5, 365) * 86_400_000);
    const type = r.pick([
      "customer",
      "customer",
      "customer",
      "prospect",
      "prospect",
      "partner",
      "former",
    ]);
    const company = await prisma.company.create({
      data: {
        organizationId,
        name,
        type,
        email: `contact@${domain}`,
        phone: `05 65 ${String(r.int(10, 99))} ${String(r.int(10, 99))} ${String(r.int(10, 99))}`,
        website: `https://www.${domain}`,
        city: r.pick(CITIES),
        country: "France",
        siren: String(r.int(300_000_000, 999_999_999)),
        annualRevenue: type === "prospect" ? null : r.int(8, 400) * 10_000,
        employees: r.int(2, 180),
        ownerId: r.pick(ownerIds),
        tags: TAGS.filter(() => r.chance(0.18)),
        createdAt,
        updatedAt: new Date(createdAt.getTime() + r.int(0, 20) * 86_400_000),
      },
    });
    companies.push({ id: company.id, name, domain });
  }

  const contacts = [];
  for (const company of companies) {
    const count = r.int(1, 5);
    for (let i = 0; i < count; i++) {
      const firstName = r.pick(FIRST);
      const lastName = r.pick(LAST);
      const createdAt = new Date(now - r.int(1, 360) * 86_400_000);
      contacts.push({
        organizationId,
        companyId: company.id,
        firstName,
        lastName,
        email: `${slug(firstName)}.${slug(lastName)}@${company.domain}`,
        phone: `06 ${String(r.int(10, 99))} ${String(r.int(10, 99))} ${String(r.int(10, 99))} ${String(r.int(10, 99))}`,
        jobTitle: r.pick(JOBS),
        status: r.pick(["lead", "prospect", "customer", "customer", "customer", "inactive"]),
        score: r.int(5, 98),
        source: r.pick(["website", "referral", "event", "outbound", "partner", "other"]),
        ownerId: r.pick(ownerIds),
        tags: TAGS.filter(() => r.chance(0.12)),
        createdAt,
        updatedAt: createdAt,
      });
    }
  }
  await prisma.contact.createMany({ data: contacts });
}
