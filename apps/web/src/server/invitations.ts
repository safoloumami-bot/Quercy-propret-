import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@quercy/db";

import { sendEmail } from "./email/send";
import { InvitationEmail } from "./email/templates";
import { env } from "./env";

export const INVITATION_TTL_DAYS = 7;

/** Le jeton n'est stocké que haché : une fuite de la base ne permet pas d'accepter une invitation. */
export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function invitationUrl(token: string): string {
  return `${env().APP_URL}/invitation/${token}`;
}

export interface InvitationResult {
  email: string;
  status: "invited" | "already_member";
  url?: string;
}

/**
 * Crée (ou renouvelle) une invitation par adresse et envoie l'email.
 * Une invitation encore en attente pour la même adresse est renouvelée, pas dupliquée.
 */
export async function createInvitations(params: {
  organization: { id: string; name: string };
  inviter: { id: string; name: string };
  role: { id: string; name: string };
  emails: string[];
  headers: Headers;
}): Promise<InvitationResult[]> {
  const { organization, inviter, role } = params;
  const emails = [...new Set(params.emails.map((e) => e.trim().toLowerCase()))];
  const members = await prisma.membership.findMany({
    where: { organizationId: organization.id, deletedAt: null, user: { email: { in: emails } } },
    select: { user: { select: { email: true } } },
  });
  const memberEmails = new Set(members.map((m) => m.user.email.toLowerCase()));
  const results: InvitationResult[] = [];

  for (const email of emails) {
    if (memberEmails.has(email)) {
      results.push({ email, status: "already_member" });
      continue;
    }
    const token = randomBytes(32).toString("base64url");
    const data = {
      roleId: role.id,
      invitedById: inviter.id,
      token: hashInvitationToken(token),
      status: "PENDING" as const,
      expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
    };
    const existing = await prisma.invitation.findFirst({
      where: { organizationId: organization.id, email, status: "PENDING" },
      select: { id: true },
    });
    const invitation = existing
      ? await prisma.invitation.update({ where: { id: existing.id }, data })
      : await prisma.invitation.create({
          data: { ...data, organizationId: organization.id, email },
        });

    const url = invitationUrl(token);
    await sendEmail({
      to: email,
      subject: `${inviter.name} vous invite sur Quercy`,
      react: InvitationEmail({
        url,
        inviterName: inviter.name,
        organizationName: organization.name,
        roleName: role.name,
      }),
    });
    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        actorId: inviter.id,
        action: "invitation.create",
        entityType: "invitation",
        entityId: invitation.id,
        metadata: { email, role: role.name },
        ipAddress: params.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      },
    });
    results.push({ email, status: "invited", url });
  }
  return results;
}
