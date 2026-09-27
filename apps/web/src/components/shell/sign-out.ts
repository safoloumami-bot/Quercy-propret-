"use client";

import { authClient } from "@/lib/auth-client";

/** Déconnexion puis retour à l'écran de connexion (rechargement complet pour vider les caches). */
export async function signOut() {
  await authClient.signOut();
  window.location.href = "/connexion";
}
