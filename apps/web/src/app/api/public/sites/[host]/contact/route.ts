import { recordPath } from "@quercy/core";
import { prisma } from "@quercy/db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { findPublishedSite } from "@/server/website";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

const messageSchema = z.object({
  name: z.string().trim().min(2, { error: "Indiquez votre nom." }).max(120),
  email: z.email({ error: "Email invalide." }).max(200),
  phone: z.string().trim().max(40).default(""),
  message: z.string().trim().min(5, { error: "Votre message est vide." }).max(4000),
  /** Champ piège invisible : rempli seulement par les robots. */
  website: z.string().max(0).optional(),
});

/** Limite simple par adresse IP : 5 messages par tranche de 10 minutes. */
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 5;
}

/**
 * Formulaire de contact d'un site publié : le message devient un contact « Site web » dans
 * le CRM (si le module est actif) et une notification pour les responsables de l'espace.
 */
export async function POST(request: Request, { params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "inconnu";
  if (limited(ip))
    return NextResponse.json(
      { error: "Trop de messages : réessayez plus tard." },
      { status: 429, headers: CORS },
    );

  const found = await findPublishedSite(decodeURIComponent(host));
  if (!found || !found.content.contact.form)
    return NextResponse.json({ error: "Site introuvable." }, { status: 404, headers: CORS });

  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Message incomplet." },
      { status: 400, headers: CORS },
    );
  // Robot : on fait comme si tout allait bien, sans rien enregistrer.
  if (parsed.data.website) return NextResponse.json({ ok: true }, { headers: CORS });

  const { name, email, phone, message } = parsed.data;
  const organizationId = found.site.organizationId;
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { modules: true },
  });

  let url: string | null = null;
  if (org?.modules.includes("crm")) {
    const existing = await prisma.contact.findFirst({
      where: { organizationId, email, deletedAt: null },
      select: { id: true },
    });
    const contact =
      existing ??
      (await prisma.contact.create({
        data: {
          organizationId,
          lastName: name,
          email,
          phone: phone || null,
          status: "lead",
          source: "website",
          tags: ["site web"],
        },
        select: { id: true },
      }));
    url = recordPath("contact", contact.id);
    // Le message lui-même, à traiter : une tâche « Répondre » sur la fiche du contact.
    await prisma.activity.create({
      data: {
        organizationId,
        type: "task",
        subject: "Répondre au message reçu sur le site",
        dueAt: new Date(),
        notes: `${message}${phone ? `\n\nTéléphone : ${phone}` : ""}`,
        contactId: contact.id,
        tags: ["site web"],
      },
    });
  }

  const managers = await prisma.membership.findMany({
    where: { organizationId, deletedAt: null, role: { systemKey: { in: ["owner", "admin"] } } },
    select: { userId: true },
  });
  if (managers.length)
    await prisma.notification.createMany({
      data: managers.map((m) => ({
        organizationId,
        userId: m.userId,
        type: "website.contact",
        title: `Nouveau message depuis le site : ${name}`,
        body: `${email}${phone ? ` · ${phone}` : ""}\n\n${message}`.slice(0, 2000),
        url,
      })),
    });

  return NextResponse.json({ ok: true }, { headers: CORS });
}
