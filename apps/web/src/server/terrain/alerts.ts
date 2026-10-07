import "server-only";

import { dayKey, parseDay } from "@quercy/core";
import { prisma } from "@quercy/db";

import { entrepriseConf } from "./config";
import { listFactures, minutesOf, parisMinutes, stopsBetween } from "./gestion";
import { loadTerrainOrgById } from "./org";
import { type PushMessage, patronIds, sendPush } from "./push";

const DAY_MS = 86_400_000;
const CHECK_EVERY_MS = 9 * 60_000;
const KEEP_MS = 40 * DAY_MS;

const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? "s" : ""}`;
const euros = (n: number) =>
  `${(Math.round(n * 100) / 100)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;
const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
function duration(h: number) {
  const m = Math.round(Math.abs(h || 0) * 60);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return hh ? `${hh} h${mm ? ` ${String(mm).padStart(2, "0")}` : ""}` : `${mm} min`;
}
/** Jour civil à Paris (AAAA-MM-JJ). */
const parisDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);

interface Candidate extends PushMessage {
  key: string;
  targets: string[];
  amount?: number;
  client?: string;
  invoice?: boolean;
}

/**
 * Alertes du téléphone (reprise de la v15) : arrivée non pointée, départ oublié, rappel de la
 * veille, point du matin, factures en retard. Chaque alerte part une seule fois (clé gardée
 * 40 jours). Sans `force`, le contrôle n'a lieu qu'une fois toutes les 9 minutes au plus :
 * il est déclenché à l'ouverture de l'application.
 */
export async function runTerrainAlerts(
  organizationId: string,
  force = false,
): Promise<{ envoyees: number; alertes?: number }> {
  const now = new Date();
  if (!force) {
    // Verrou léger : la ligne « verif » ne passe à maintenant que si elle a plus de 9 minutes.
    const last = await prisma.terrainAlert.findUnique({
      where: { organizationId_key: { organizationId, key: "verif" } },
    });
    if (last && now.getTime() - last.sentAt.getTime() < CHECK_EVERY_MS) return { envoyees: 0 };
    const taken = last
      ? await prisma.terrainAlert.updateMany({
          where: { id: last.id, sentAt: last.sentAt },
          data: { sentAt: now },
        })
      : await prisma.terrainAlert
          .create({ data: { organizationId, key: "verif", sentAt: now } })
          .then(() => ({ count: 1 }))
          .catch(() => ({ count: 0 }));
    if (!taken.count) return { envoyees: 0 };
  } else
    await prisma.terrainAlert.upsert({
      where: { organizationId_key: { organizationId, key: "verif" } },
      create: { organizationId, key: "verif", sentAt: now },
      update: { sentAt: now },
    });

  const org = await loadTerrainOrgById(organizationId);
  if (!org) return { envoyees: 0 };
  const patrons = await patronIds(organizationId);
  if (!patrons.length) return { envoyees: 0 };
  const cfg = await entrepriseConf(org);
  const al = cfg.alertes;
  const names = new Map(
    (
      await prisma.fieldAccess.findMany({
        where: { organizationId, active: true },
        select: { userId: true, user: { select: { name: true } } },
      })
    ).map((a) => [a.userId, a.user.name]),
  );
  const today = parisDay(now);
  const tomorrow = dayKey(new Date(parseDay(today).getTime() + DAY_MS));
  const mn = parisMinutes(now);
  const real = <T extends { exemple: boolean; demo: boolean; statut: string }>(c: T) =>
    !c.exemple && !c.demo && c.statut !== "annule";
  const todays = (await stopsBetween(organizationId, parseDay(today), parseDay(today))).filter(
    real,
  );
  const cand: Candidate[] = [];

  if (al.retard) {
    for (const c of todays) {
      const h = minutesOf(c.heure);
      if (h !== null && c.statut === "prevu" && mn >= h + 15 && mn <= h + 180) {
        const who = names.get(c.agentId);
        cand.push({
          key: `retard:${c.id}`,
          targets: patrons,
          titre: `Retard · ${c.client}`,
          corps: `Prévu à ${c.heure}${who ? ` avec ${who}` : ""} : l'arrivée n'est pas encore pointée.`,
          onglet: "tournee",
        });
        if (c.agentId && !patrons.includes(c.agentId))
          cand.push({
            key: `retard-agent:${c.id}`,
            targets: [c.agentId],
            titre: "Arrivée non pointée",
            corps: `${c.client} était prévu à ${c.heure}. Pensez à pointer en arrivant.`,
            onglet: "tournee",
          });
      }
      if (c.statut === "en-cours" && c.arrivee) {
        const d = (now.getTime() - c.arrivee) / 3_600_000;
        const planned = c.devise || 2;
        if (d > Math.max(planned + 1.5, planned * 1.8) && d < 14)
          cand.push({
            key: `depart:${c.id}`,
            targets: [...new Set([c.agentId, ...patrons].filter(Boolean))],
            titre: "Départ non pointé ?",
            corps: `${c.client} : sur place depuis ${duration(d)} pour ${duration(planned)} prévues.`,
            onglet: "tournee",
          });
      }
    }
  }

  if (al.veille && mn >= 18 * 60 && mn < 21 * 60) {
    const next = (
      await stopsBetween(organizationId, parseDay(tomorrow), parseDay(tomorrow))
    ).filter((c) => real(c) && c.statut === "prevu" && c.agentId);
    const byAgent = new Map<string, typeof next>();
    for (const c of next) byAgent.set(c.agentId, [...(byAgent.get(c.agentId) ?? []), c]);
    for (const [agentId, list] of byAgent) {
      list.sort((a, b) => a.heure.localeCompare(b.heure));
      const first = list[0]!;
      const hours = list.reduce((s, c) => s + (c.devise || 0), 0);
      cand.push({
        key: `veille:${agentId}:${tomorrow}`,
        targets: [agentId],
        titre: `Demain : ${plural(list.length, "intervention")}`,
        corps: `Première à ${first.heure} chez ${first.client}${first.ville ? `, ${first.ville}` : ""} · ${duration(hours)} au total.`,
        onglet: "tournee",
      });
    }
  }

  let lateCache: Awaited<ReturnType<typeof listFactures>> | null = null;
  const late = async () => {
    lateCache ??= await listFactures(organizationId);
    return lateCache.filter(
      (f) => f.type === "facture" && f.statut === "a-payer" && f.echeance < today,
    );
  };

  if (al.matin && mn >= 7 * 60 && mn < 10 * 60) {
    const n = todays.length;
    const agents = new Set(todays.map((c) => c.agentId).filter(Boolean)).size;
    const requests = await prisma.quoteRequest.count({
      where: { organizationId, status: { in: ["nouvelle", "vue"] } },
    });
    const overdue = (await late()).length;
    if (n || requests || overdue)
      cand.push({
        key: `matin:${today}`,
        targets: patrons,
        titre: `Aujourd'hui : ${n ? plural(n, "intervention") : "aucune intervention"}`,
        corps:
          [
            agents ? `${plural(agents, "agent")} sur le terrain` : "",
            requests ? `${plural(requests, "demande")} à traiter` : "",
            overdue ? `${plural(overdue, "facture")} en retard` : "",
          ]
            .filter(Boolean)
            .join(" · ") || "Bonne journée.",
        onglet: "tournee",
      });
  }

  if (al.factures && mn >= 9 * 60 && mn < 19 * 60)
    for (const f of await late())
      cand.push({
        key: `facture:${f.id}`,
        targets: patrons,
        invoice: true,
        amount: f.ttc,
        client: f.client,
        titre: `Facture en retard · ${f.client}`,
        corps: `${f.numero} · ${euros(f.ttc)}, échue le ${shortDate(f.echeance)}.`,
        onglet: "factures",
      });

  // Ménage des clés anciennes, puis on ne garde que les alertes jamais envoyées.
  await prisma.terrainAlert.deleteMany({
    where: {
      organizationId,
      key: { not: "verif" },
      sentAt: { lt: new Date(now.getTime() - KEEP_MS) },
    },
  });
  if (!cand.length) return { envoyees: 0 };
  const fresh: Candidate[] = [];
  for (const c of cand) {
    const created = await prisma.terrainAlert
      .create({ data: { organizationId, key: c.key, sentAt: now } })
      .then(() => true)
      .catch(() => false);
    if (created) fresh.push(c);
  }

  const invoices = fresh.filter((c) => c.invoice);
  const send = fresh.filter((c) => !c.invoice);
  if (invoices.length > 1)
    send.push({
      key: "factures",
      targets: patrons,
      onglet: "factures",
      titre: `${plural(invoices.length, "facture")} en retard`,
      corps: `${euros(invoices.reduce((s, c) => s + (c.amount ?? 0), 0))} à relancer : ${invoices
        .map((c) => c.client)
        .slice(0, 3)
        .join(", ")}${invoices.length > 3 ? "…" : ""}.`,
    });
  else send.push(...invoices);

  let sent = 0;
  for (const c of send)
    sent += await sendPush(organizationId, c.targets, {
      titre: c.titre,
      corps: c.corps,
      onglet: c.onglet,
      tag: c.key,
    });
  return { envoyees: sent, alertes: send.length };
}
