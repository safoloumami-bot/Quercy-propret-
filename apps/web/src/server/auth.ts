import "server-only";

import { hashPassword, prisma, verifyPassword } from "@quercy/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, magicLink, twoFactor } from "better-auth/plugins";
import { headers } from "next/headers";
import { cache } from "react";

import { sendEmail } from "./email/send";
import { MagicLinkEmail, ResetPasswordEmail, VerifyEmail } from "./email/templates";
import { env } from "./env";

function createAuth() {
  const e = env();
  return betterAuth({
    appName: "Quercy",
    baseURL: e.APP_URL,
    secret: e.BETTER_AUTH_SECRET,
    trustedOrigins: [...new Set([e.APP_URL, e.NEXT_PUBLIC_APP_URL])],
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      additionalFields: {
        activeOrganizationId: { type: "string", required: false, input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
      password: { hash: hashPassword, verify: verifyPassword },
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Réinitialisation de votre mot de passe",
          react: ResetPasswordEmail({ url, name: user.name }),
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Confirmez votre adresse email",
          react: VerifyEmail({ url, name: user.name }),
        });
      },
    },
    socialProviders: {
      ...(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
        ? { google: { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET } }
        : {}),
      ...(e.MICROSOFT_CLIENT_ID && e.MICROSOFT_CLIENT_SECRET
        ? {
            microsoft: {
              clientId: e.MICROSOFT_CLIENT_ID,
              clientSecret: e.MICROSOFT_CLIENT_SECRET,
              tenantId: e.MICROSOFT_TENANT_ID,
            },
          }
        : {}),
    },
    account: { accountLinking: { enabled: true, trustedProviders: ["google", "microsoft"] } },
    databaseHooks: {
      session: {
        create: {
          // Toute session d'assistance (« se connecter en tant que ») est tracée dans le journal
          // d'audit de chaque espace de la personne concernée.
          after: async (session) => {
            const impersonatedBy = (session as { impersonatedBy?: string | null }).impersonatedBy;
            if (!impersonatedBy) return;
            const memberships = await prisma.membership.findMany({
              where: { userId: session.userId, deletedAt: null },
              select: { organizationId: true },
            });
            await prisma.auditLog.createMany({
              data: memberships.map((m) => ({
                organizationId: m.organizationId,
                actorId: impersonatedBy,
                impersonatorId: impersonatedBy,
                action: "support.impersonation.start",
                entityType: "user",
                entityId: session.userId,
                ipAddress: session.ipAddress ?? null,
              })),
            });
          },
        },
      },
    },
    rateLimit: {
      enabled: e.NODE_ENV === "production" && e.AUTH_RATE_LIMIT === "on",
      window: 60,
      max: 100,
    },
    plugins: [
      twoFactor({ issuer: "Quercy" }),
      // Super-admin de la plateforme (user.role = "admin") : sessions d'assistance d'une heure.
      admin({ impersonationSessionDuration: 60 * 60 }),
      magicLink({
        expiresIn: 60 * 10,
        sendMagicLink: async ({ email, url }) => {
          await sendEmail({
            to: email,
            subject: "Votre lien de connexion",
            react: MagicLinkEmail({ url }),
          });
        },
      }),
      // Doit rester en dernier : applique les cookies posés par les actions serveur.
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;
const globalForAuth = globalThis as unknown as { auth?: Auth };

/** Instance Better Auth (créée au premier appel, pour ne lire l'environnement qu'à l'exécution). */
export function auth(): Auth {
  globalForAuth.auth ??= createAuth();
  return globalForAuth.auth;
}

export type AuthSession = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;

/** Session de la requête courante (mise en cache pour la durée du rendu). */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  return auth().api.getSession({ headers: await headers() });
});
