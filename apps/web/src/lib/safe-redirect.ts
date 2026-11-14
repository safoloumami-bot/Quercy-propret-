/**
 * Chemin de retour sûr après connexion : uniquement un chemin interne (« /… »),
 * jamais une URL externe ni « //domaine » (protection contre les redirections ouvertes).
 */
export function safeNext(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\"))
    return fallback;
  return value;
}
