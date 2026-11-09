import "server-only";

import { prisma } from "@quercy/db";
import * as React from "react";

import { sendEmail } from "./email/send";
import { PlatformAlertEmail } from "./email/templates";
import { env } from "./env";

/**
 * Prévient l'équipe sebt (comptes administrateurs de la plateforme) par email : nouvelle
 * inscription, abonnement souscrit ou résilié, paiement refusé. N'échoue jamais : une alerte
 * qui ne part pas ne doit pas bloquer l'inscription ni le paiement.
 */
export async function alertPlatform(title: string, lines: string[]): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin", deletedAt: null },
      select: { email: true },
    });
    const url = new URL("/admin", env().APP_URL).toString();
    await Promise.all(
      admins.map((a) =>
        sendEmail({
          to: a.email,
          subject: `sebt — ${title}`,
          react: React.createElement(PlatformAlertEmail, { title, lines, url }),
        }),
      ),
    );
  } catch (error) {
    console.warn(
      JSON.stringify({ level: "warn", msg: "platform.alert_failed", title, error: String(error) }),
    );
  }
}
