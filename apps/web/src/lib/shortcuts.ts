import { NAV_ITEMS } from "./navigation";

export type ShortcutAction =
  | { type: "palette" }
  | { type: "help" }
  | { type: "sidebar" }
  | { type: "create" }
  | { type: "navigate"; href: string };

export interface ShortcutDefinition {
  keys: string[];
  description: string;
  group: "Général" | "Navigation" | "Tableaux";
}

/** Liste affichée dans l'aide (`?`). « mod » = Ctrl (ou ⌘ sur macOS). */
export const SHORTCUTS: ShortcutDefinition[] = [
  { keys: ["mod", "K"], description: "Ouvrir la palette de commandes", group: "Général" },
  { keys: ["/"], description: "Rechercher", group: "Général" },
  { keys: ["mod", "B"], description: "Replier ou déplier la barre latérale", group: "Général" },
  { keys: ["?"], description: "Afficher les raccourcis clavier", group: "Général" },
  { keys: ["Échap"], description: "Fermer la fenêtre ou le menu ouvert", group: "Général" },
  { keys: ["C"], description: "Créer (sur une liste)", group: "Général" },
  { keys: ["J"], description: "Ligne suivante", group: "Tableaux" },
  { keys: ["K"], description: "Ligne précédente", group: "Tableaux" },
  { keys: ["Entrée"], description: "Ouvrir la ligne dans le panneau", group: "Tableaux" },
  { keys: ["O"], description: "Ouvrir la fiche en pleine page", group: "Tableaux" },
  { keys: ["E"], description: "Modifier la première cellule modifiable", group: "Tableaux" },
  { keys: ["X"], description: "Sélectionner ou désélectionner la ligne", group: "Tableaux" },
  ...NAV_ITEMS.filter((item) => item.goKey).map((item) => ({
    keys: ["G", item.goKey!.toUpperCase()],
    description: `Aller à : ${item.label}`,
    group: "Navigation" as const,
  })),
];

export interface KeyInput {
  key: string;
  /** Ctrl ou ⌘ enfoncé. */
  mod: boolean;
  alt: boolean;
  /** L'événement vient d'un champ de saisie. */
  typing: boolean;
}

export interface ShortcutState {
  /** Horodatage de l'appui sur « G » (séquences G puis X), ou null. */
  pendingGoAt: number | null;
}

/** Délai maximal entre « G » et la seconde touche. */
export const GO_SEQUENCE_TIMEOUT_MS = 1_200;

/**
 * Résout une touche en action de raccourci. Fonction pure, testée unitairement.
 * Les raccourcis avec Ctrl/⌘ fonctionnent partout ; les autres sont ignorés pendant la saisie.
 */
export function resolveShortcut(
  input: KeyInput,
  state: ShortcutState,
  now: number,
): { action: ShortcutAction | null; state: ShortcutState } {
  const key = input.key.toLowerCase();
  const idle: ShortcutState = { pendingGoAt: null };

  if (input.mod && !input.alt) {
    if (key === "k") return { action: { type: "palette" }, state: idle };
    if (key === "b") return { action: { type: "sidebar" }, state: idle };
    return { action: null, state: idle };
  }
  if (input.typing || input.mod || input.alt) return { action: null, state: idle };

  if (state.pendingGoAt !== null && now - state.pendingGoAt <= GO_SEQUENCE_TIMEOUT_MS) {
    const target = NAV_ITEMS.find((item) => item.goKey === key);
    return { action: target ? { type: "navigate", href: target.href } : null, state: idle };
  }

  if (key === "g") return { action: null, state: { pendingGoAt: now } };
  if (key === "/") return { action: { type: "palette" }, state: idle };
  if (key === "c") return { action: { type: "create" }, state: idle };
  if (input.key === "?") return { action: { type: "help" }, state: idle };
  return { action: null, state: idle };
}
