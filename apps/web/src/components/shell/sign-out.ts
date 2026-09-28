"use client";

import { authClient } from "@/lib/auth-client";
import { clearQueue } from "@/lib/offline-queue";

/** Déconnexion puis retour à l'écran de connexion (rechargement complet pour vider les caches). */
export async function signOut() {
  await authClient.signOut();
  // Données hors ligne propres à la personne : effacées à la déconnexion.
  clearQueue();
  if ("caches" in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  window.location.href = "/connexion";
}
