import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@quercy/db";

import { env } from "../env";

const BOTS =
  /bot|crawl|spider|slurp|preview|monitor|headless|lighthouse|curl|wget|python|node-fetch/i;

/** Empreinte du visiteur : change chaque jour, sans cookie ni adresse IP conservée. */
export function visitorId(ip: string, userAgent: string, now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${day}|${ip}|${userAgent}|${env().BETTER_AUTH_SECRET}`)
    .digest("hex")
    .slice(0, 20);
}

/** Domaine d'origine d'une visite (null pour une visite directe ou interne). */
export function referrerHost(referrer: string | null | undefined, ownHost?: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (!host || (ownHost && host === ownHost.replace(/^www\./, "").toLowerCase())) return null;
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-nf-client-connection-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "0.0.0.0"
  );
}

/** Enregistre une page vue ; les robots sont ignorés. Ne lève jamais d'erreur. */
export async function recordView(input: {
  kind: "site" | "app";
  organizationId: string | null;
  path: string;
  referrer?: string | null;
  ownHost?: string;
  ip: string;
  userAgent: string;
}): Promise<boolean> {
  const ua = input.userAgent;
  if (!ua || BOTS.test(ua)) return false;
  try {
    await prisma.pageView.create({
      data: {
        kind: input.kind,
        organizationId: input.organizationId,
        path: (input.path || "/").split("?")[0]!.slice(0, 200),
        referrer: referrerHost(input.referrer, input.ownHost),
        visitor: visitorId(input.ip, ua),
        device: /Mobi|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop",
      },
    });
    return true;
  } catch {
    return false;
  }
}

const DAY = 86_400_000;

/** Jours (AAAA-MM-JJ) des `days` derniers jours, du plus ancien au plus récent. */
export function lastDays(days: number, now: Date = new Date()): string[] {
  return Array.from({ length: days }, (_, i) =>
    new Date(now.getTime() - (days - 1 - i) * DAY).toISOString().slice(0, 10),
  );
}

/** Statistiques de visites sur `days` jours (un site, ou toutes les visites d'un type). */
export async function visitStats(
  where: { kind: "site" | "app"; organizationId?: string },
  days = 30,
) {
  const since = new Date(Date.now() - days * DAY);
  const filter = { ...where, createdAt: { gte: since } };
  const [rows, pages, referrers, devices] = await Promise.all([
    prisma.pageView.findMany({ where: filter, select: { createdAt: true, visitor: true } }),
    prisma.pageView.groupBy({
      by: ["path"],
      where: filter,
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
      take: 8,
    }),
    prisma.pageView.groupBy({
      by: ["referrer"],
      where: { ...filter, referrer: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { referrer: "desc" } },
      take: 8,
    }),
    prisma.pageView.groupBy({ by: ["device"], where: filter, _count: { _all: true } }),
  ]);
  const byDay = new Map(lastDays(days).map((d) => [d, { views: 0, visitors: new Set<string>() }]));
  for (const r of rows) {
    const d = byDay.get(r.createdAt.toISOString().slice(0, 10));
    if (!d) continue;
    d.views += 1;
    d.visitors.add(r.visitor);
  }
  const visitors = new Set(
    rows.map((r) => `${r.createdAt.toISOString().slice(0, 10)}|${r.visitor}`),
  );
  return {
    views: rows.length,
    visitors: visitors.size,
    series: [...byDay].map(([day, v]) => ({ day, views: v.views, visitors: v.visitors.size })),
    pages: pages.map((p) => ({ path: p.path, views: p._count._all })),
    referrers: referrers.map((r) => ({ host: r.referrer!, views: r._count._all })),
    mobileShare:
      rows.length === 0
        ? 0
        : (devices.find((d) => d.device === "mobile")?._count._all ?? 0) / rows.length,
  };
}
