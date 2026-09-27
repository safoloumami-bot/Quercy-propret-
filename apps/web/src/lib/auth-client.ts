"use client";

import { magicLinkClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Client d'authentification (navigateur). */
export const authClient = createAuthClient({
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.href = `/connexion/deux-facteurs${next ? `?next=${encodeURIComponent(next)}` : ""}`;
      },
    }),
    magicLinkClient(),
  ],
});

/** Message d'erreur lisible à partir d'une réponse Better Auth. */
export function authErrorMessage(
  error: { code?: string; message?: string; status?: number } | null,
): string {
  if (!error) return "Une erreur inattendue est survenue.";
  const byCode: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
    USER_ALREADY_EXISTS: "Un compte existe déjà avec cette adresse. Connectez-vous.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
      "Un compte existe déjà avec cette adresse. Connectez-vous.",
    PASSWORD_TOO_SHORT: "Mot de passe trop court : 10 caractères minimum.",
    INVALID_PASSWORD: "Mot de passe incorrect.",
    INVALID_TWO_FACTOR_AUTHENTICATION:
      "Code incorrect. Vérifiez l'heure de votre téléphone et réessayez.",
    INVALID_CODE: "Code incorrect.",
    INVALID_BACKUP_CODE: "Code de secours incorrect ou déjà utilisé.",
    INVALID_TOKEN: "Ce lien n'est plus valable. Demandez-en un nouveau.",
    TOO_MANY_ATTEMPTS: "Trop de tentatives. Patientez quelques minutes.",
  };
  if (error.status === 429) return "Trop de tentatives. Patientez une minute avant de réessayer.";
  return (
    (error.code && byCode[error.code]) || error.message || "Une erreur inattendue est survenue."
  );
}
