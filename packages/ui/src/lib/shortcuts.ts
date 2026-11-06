/** Détection de la plateforme pour l'affichage des raccourcis (⌘ sur macOS, Ctrl ailleurs). */
export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

/** Libellé de la touche de commande selon la plateforme. */
export function modKeyLabel(): string {
  return isMac() ? "⌘" : "Ctrl";
}

/** Vrai si l'événement vient d'un champ de saisie (on n'intercepte pas les raccourcis simples). */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    target.isContentEditable ||
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.getAttribute("role") === "combobox"
  );
}
