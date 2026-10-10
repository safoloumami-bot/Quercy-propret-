import type { NextRequest } from "next/server";

import { authenticate, fromTrpc } from "@/server/api/keys";

export const dynamic = "force-dynamic";

const stamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const escape = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\r?\n/g, "\\n");
/** Lignes de 75 octets au plus (RFC 5545). */
const fold = (line: string) => line.match(/.{1,74}/g)!.join("\r\n ");

/**
 * Flux iCalendar de l'agenda (abonnement Google Agenda, Outlook, Apple Calendrier) :
 * `/api/v1/agenda.ics?key=<clé d'API en lecture>` — les agendas ne savent pas envoyer d'en-tête.
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const auth = await authenticate(
    new Request(request.url, { headers: { authorization: `Bearer ${key}` } }),
    false,
  );
  if ("response" in auth) return auth.response;
  let rows;
  try {
    rows = (
      await auth.caller.records.list({
        entity: "event",
        filter: {
          combinator: "and",
          rules: [{ field: "startAt", operator: "in_last_days", value: 90 }],
        },
        sort: [{ field: "startAt", direction: "desc" }],
        limit: 200,
      })
    ).rows;
    const upcoming = await auth.caller.records.list({
      entity: "event",
      filter: {
        combinator: "and",
        rules: [{ field: "startAt", operator: "in_next_days", value: 365 }],
      },
      sort: [{ field: "startAt", direction: "asc" }],
      limit: 200,
    });
    rows = [...rows, ...upcoming.rows];
  } catch (error) {
    return fromTrpc(error);
  }
  const now = stamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Quercy//Agenda//FR",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Quercy",
  ];
  const seen = new Set<string>();
  for (const row of rows as (Record<string, unknown> & { id: string })[]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const start = new Date(row.startAt as string);
    const end = row.endAt ? new Date(row.endAt as string) : new Date(start.getTime() + 3_600_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${row.id}@quercy.app`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      fold(`SUMMARY:${escape(String(row.title ?? ""))}`),
      ...(row.location ? [fold(`LOCATION:${escape(String(row.location))}`)] : []),
      ...(row.description ? [fold(`DESCRIPTION:${escape(String(row.description))}`)] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="quercy.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
