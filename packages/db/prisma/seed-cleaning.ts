import {
  INSPECTION_CHECKS,
  addDays,
  contractOccurrences,
  inspectionOutcome,
  parseClock,
  utcDay,
} from "@quercy/core";
import type { PrismaClient } from "@prisma/client";

import { rng } from "./seed-crm";

const SITES: {
  name: string;
  address: string;
  postalCode: string;
  city: string;
  surface: number;
  hours: string;
  code: string | null;
  keys: string | null;
  instructions: string;
}[] = [
  {
    name: "Bureaux Cahors Centre",
    address: "12 boulevard Gambetta",
    postalCode: "46000",
    city: "Cahors",
    surface: 420,
    hours: "Après 18 h",
    code: "4682B",
    keys: "Badge n° 3 au coffre",
    instructions: "Couper l'alarme dans les 30 s. Vider les corbeilles de tri séparément.",
  },
  {
    name: "Clinique du Pont Valentré",
    address: "3 quai Champollion",
    postalCode: "46000",
    city: "Cahors",
    surface: 1250,
    hours: "6 h – 9 h",
    code: null,
    keys: "Accueil : demander le badge prestataire",
    instructions:
      "Protocole bionettoyage : tenue complète, lavettes code couleur, désinfectant EN 14476 en chambres.",
  },
  {
    name: "Résidence Les Terrasses du Lot",
    address: "28 rue des Jardins",
    postalCode: "46100",
    city: "Figeac",
    surface: 680,
    hours: "8 h – 12 h",
    code: "1946",
    keys: "Clé local poubelles sur le trousseau bleu",
    instructions: "Sortir les conteneurs le mardi soir, les rentrer le mercredi matin.",
  },
  {
    name: "Agence Crédit Quercy Gourdon",
    address: "5 place de la Libération",
    postalCode: "46300",
    city: "Gourdon",
    surface: 210,
    hours: "Après 18 h 30",
    code: "7731",
    keys: null,
    instructions: "Ne pas toucher aux postes de travail. Vitres de la façade une fois par mois.",
  },
  {
    name: "Hôtel du Causse",
    address: "Route de Rocamadour",
    postalCode: "46500",
    city: "Gramat",
    surface: 950,
    hours: "10 h – 15 h",
    code: null,
    keys: "Réception",
    instructions: "Parties communes et salle de restaurant. Chambres gérées par l'hôtel.",
  },
  {
    name: "Cabinet médical Saint-Céré",
    address: "14 avenue Anatole-de-Monzie",
    postalCode: "46400",
    city: "Saint-Céré",
    surface: 180,
    hours: "Après 19 h",
    code: "5520A",
    keys: "Boîte à clés, code 0412",
    instructions: "Désinfection des poignées, plans de travail et salle d'attente.",
  },
  {
    name: "Entrepôt Logistique Souillac",
    address: "ZA de Bourzolles",
    postalCode: "46200",
    city: "Souillac",
    surface: 2400,
    hours: "5 h – 7 h",
    code: "0808",
    keys: "Portail : télécommande n° 2",
    instructions: "Autolaveuse pour l'allée centrale. Bureaux et vestiaires à l'étage.",
  },
  {
    name: "Mairie annexe de Luzech",
    address: "Place du Canal",
    postalCode: "46140",
    city: "Luzech",
    surface: 320,
    hours: "Mercredi après-midi",
    code: null,
    keys: "Clé à récupérer au secrétariat",
    instructions: "Salle du conseil à préparer la veille des séances.",
  },
  {
    name: "Groupe scolaire Prayssac",
    address: "Allée des Écoles",
    postalCode: "46220",
    city: "Prayssac",
    surface: 1100,
    hours: "16 h 45 – 20 h",
    code: "2468",
    keys: null,
    instructions: "Sanitaires désinfectés chaque jour. Pendant les vacances : grand ménage.",
  },
  {
    name: "Showroom Garonne Cuisines",
    address: "Avenue de la Gare",
    postalCode: "46090",
    city: "Pradines",
    surface: 360,
    hours: "Avant 9 h",
    code: "9012",
    keys: null,
    instructions: "Vitrines et plans de travail d'exposition sans traces (produit vitres).",
  },
  {
    name: "Copropriété Le Clos Saint-Géry",
    address: "7 rue Saint-Géry",
    postalCode: "46000",
    city: "Cahors",
    surface: 540,
    hours: "9 h – 12 h",
    code: "3579",
    keys: "Trousseau vert",
    instructions: "Halls, escaliers et ascenseur. Tapis d'entrée à aspirer.",
  },
  {
    name: "Pharmacie des Remparts",
    address: "2 rue des Remparts",
    postalCode: "46100",
    city: "Figeac",
    surface: 140,
    hours: "Après 19 h 30",
    code: "8642",
    keys: null,
    instructions: "Sol de l'officine à la monobrosse une fois par mois.",
  },
];

/** Contrats : site, jours (0 dimanche … 6 samedi), heure, durée, forfait mensuel HT. */
const CONTRACTS: {
  site: number;
  days: string[];
  start: string;
  minutes: number;
  price: number;
  status?: string;
  desc: string;
}[] = [
  {
    site: 0,
    days: ["1", "2", "3", "4", "5"],
    start: "18:30",
    minutes: 120,
    price: 1480,
    desc: "Bureaux, sanitaires, cuisine ; vitres intérieures tous les mois.",
  },
  {
    site: 1,
    days: ["1", "2", "3", "4", "5", "6"],
    start: "06:00",
    minutes: 180,
    price: 3950,
    desc: "Bionettoyage des chambres libérées, couloirs, sanitaires et salle d'attente.",
  },
  {
    site: 2,
    days: ["2", "5"],
    start: "08:30",
    minutes: 150,
    price: 690,
    desc: "Halls, escaliers, ascenseur, local poubelles et sortie des conteneurs.",
  },
  {
    site: 3,
    days: ["1", "3", "5"],
    start: "18:45",
    minutes: 90,
    price: 520,
    desc: "Agence : sols, bureaux, sanitaires ; vitres de façade mensuelles.",
  },
  {
    site: 4,
    days: ["1", "2", "3", "4", "5", "6", "0"],
    start: "10:30",
    minutes: 150,
    price: 2890,
    desc: "Parties communes, salle de restaurant, terrasse.",
  },
  {
    site: 5,
    days: ["2", "4"],
    start: "19:15",
    minutes: 75,
    price: 430,
    desc: "Cabinet médical : désinfection des surfaces de contact et sols.",
  },
  {
    site: 6,
    days: ["1", "4"],
    start: "05:00",
    minutes: 210,
    price: 1760,
    desc: "Entrepôt (autolaveuse), bureaux et vestiaires.",
  },
  {
    site: 7,
    days: ["3"],
    start: "14:00",
    minutes: 120,
    price: 340,
    desc: "Mairie annexe : bureaux, salle du conseil, sanitaires.",
  },
  {
    site: 8,
    days: ["1", "2", "4", "5"],
    start: "16:45",
    minutes: 180,
    price: 2350,
    desc: "Classes, sanitaires, réfectoire ; grand ménage pendant les vacances.",
  },
  {
    site: 9,
    days: ["2", "5"],
    start: "07:30",
    minutes: 90,
    price: 610,
    desc: "Showroom : sols, vitrines, plans d'exposition.",
  },
  {
    site: 10,
    days: ["1", "4"],
    start: "09:00",
    minutes: 120,
    price: 560,
    desc: "Copropriété : halls, escaliers, ascenseur, tapis.",
  },
  {
    site: 11,
    days: ["6"],
    start: "19:30",
    minutes: 90,
    price: 380,
    status: "suspended",
    desc: "Officine et réserve. Suspendu pendant les travaux.",
  },
];

const NOTES = [
  "RAS, locaux rendus propres.",
  "Recharge de savon posée dans les sanitaires du 1er.",
  "Tache sur la moquette de la salle de réunion : prévoir un détachage.",
  "Sacs poubelle 100 L presque épuisés sur place.",
  "Client absent, clé récupérée à l'accueil.",
  "Vitres de l'entrée faites en plus (demande du client).",
  "Ampoule grillée signalée dans le couloir.",
];

/** Petite signature manuscrite dessinée en SVG (image data URL). */
function signature(r: ReturnType<typeof rng>): string {
  let d = `M ${r.int(10, 30)} ${r.int(40, 60)}`;
  let x = 30;
  for (let i = 0; i < 6; i++) {
    x += r.int(18, 34);
    d += ` Q ${x - r.int(5, 15)} ${r.int(5, 30)} ${x} ${r.int(35, 65)}`;
  }
  d += ` M ${r.int(40, 80)} ${r.int(62, 70)} L ${x - r.int(0, 20)} ${r.int(55, 68)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80"><path d="${d}" fill="none" stroke="#1f2937" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * Nettoyage & interventions : 12 sites clients, contrats d'entretien, 8 semaines d'historique
 * pointé (arrivées, départs, signatures), 3 semaines de planning à venir et contrôles qualité.
 */
export async function seedCleaning(
  prisma: PrismaClient,
  organizationId: string,
  agentIds: string[],
) {
  if (await prisma.site.count({ where: { organizationId } })) return;
  const r = rng(4646_46);
  const today = utcDay(new Date());
  const companies = await prisma.company.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: SITES.length,
    select: { id: true },
  });

  const sites = [];
  for (const [i, s] of SITES.entries())
    sites.push(
      await prisma.site.create({
        data: {
          organizationId,
          name: s.name,
          companyId: companies[i]?.id ?? null,
          address: s.address,
          postalCode: s.postalCode,
          city: s.city,
          surfaceM2: s.surface,
          openingHours: s.hours,
          accessCode: s.code,
          keys: s.keys,
          instructions: s.instructions,
          status: i === 11 ? "paused" : "active",
          ownerId: agentIds[i % agentIds.length],
          createdAt: addDays(today, -r.int(120, 360)),
        },
      }),
    );

  const historyStart = addDays(today, -56);
  const horizon = addDays(today, 21);
  for (const [i, c] of CONTRACTS.entries()) {
    const site = sites[c.site]!;
    const agentId = agentIds[i % agentIds.length]!;
    const status = c.status ?? "active";
    const contract = await prisma.cleaningContract.create({
      data: {
        organizationId,
        name: `Entretien ${site.name}`,
        siteId: site.id,
        companyId: site.companyId,
        status,
        weekdays: c.days,
        startTime: c.start,
        durationMinutes: c.minutes,
        agentId,
        monthlyPriceCents: c.price * 100,
        startDate: addDays(today, -r.int(90, 400)),
        generatedUntil: status === "active" ? horizon : null,
        description: c.desc,
        ownerId: agentIds[0],
      },
    });
    const until = status === "active" ? horizon : addDays(today, -20);
    const days = contractOccurrences({ weekdays: c.days }, historyStart, until);
    const startMinutes = parseClock(c.start) ?? 8 * 60;
    await prisma.intervention.createMany({
      data: days.map((date) => {
        const past = date < today;
        const isToday = date.getTime() === today.getTime();
        // Quelques remplacements et passages manqués pour un planning réaliste.
        const replaced = r.chance(0.08);
        const agent = replaced ? r.pick(agentIds) : agentId;
        const missed = past && r.chance(0.04);
        const base = {
          organizationId,
          title: `Entretien — ${site.name}`,
          siteId: site.id,
          contractId: contract.id,
          companyId: site.companyId,
          ownerId: agent,
          date,
          startTime: c.start,
          durationMinutes: c.minutes,
        };
        if (!past || missed)
          return { ...base, status: missed ? "missed" : isToday ? "planned" : "planned" };
        const late = r.int(-5, 15);
        const worked = c.minutes + r.int(-15, 20);
        const checkIn = new Date(date.getTime() + (startMinutes + late - 120) * 60_000);
        const signed = r.chance(0.35);
        return {
          ...base,
          status: "done",
          checkInAt: checkIn,
          checkOutAt: new Date(checkIn.getTime() + worked * 60_000),
          workedMinutes: worked,
          notes: r.chance(0.3) ? r.pick(NOTES) : null,
          ...(signed
            ? {
                signatureUrl: signature(r),
                signedBy: r.pick([
                  "M. Delpech",
                  "Mme Rigal",
                  "Accueil",
                  "Le gardien",
                  "Mme Vayssières",
                ]),
              }
            : {}),
        };
      }),
    });
  }

  // Interventions ponctuelles (hors contrat) à venir.
  const extras = [
    { site: 4, days: 3, title: "Remise en état après travaux — salle de restaurant", minutes: 360 },
    { site: 8, days: 9, title: "Grand ménage des vacances — groupe scolaire", minutes: 480 },
    { site: 11, days: 12, title: "Nettoyage de fin de chantier — pharmacie", minutes: 300 },
  ];
  for (const e of extras) {
    const site = sites[e.site]!;
    await prisma.intervention.create({
      data: {
        organizationId,
        title: e.title,
        siteId: site.id,
        companyId: site.companyId,
        ownerId: r.pick(agentIds),
        date: addDays(today, e.days),
        startTime: "08:00",
        durationMinutes: e.minutes,
        status: "planned",
      },
    });
  }

  // Contrôles qualité des trois derniers mois.
  const comments = [
    "Très bon niveau, client satisfait.",
    "Traces sur les vitres de l'entrée.",
    "Sanitaires du 2e à reprendre : distributeur vide.",
    "Poussière sur les plinthes des bureaux.",
    "Rien à signaler.",
  ];
  for (let i = 0; i < 28; i++) {
    const site = sites[i % 11]!;
    const checks = INSPECTION_CHECKS.map(() => r.chance(0.82));
    const outcome = inspectionOutcome(checks);
    await prisma.inspection.create({
      data: {
        organizationId,
        title: `Contrôle qualité — ${site.name}`,
        siteId: site.id,
        date: addDays(today, -r.int(1, 90)),
        ...Object.fromEntries(INSPECTION_CHECKS.map((c, k) => [c.key, checks[k]])),
        score: outcome.score,
        result: outcome.result,
        comments: r.pick(comments),
        ownerId: agentIds[0],
      },
    });
  }
}
