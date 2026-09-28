"use client";

import type { Theme } from "@quercy/core";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import * as React from "react";

import { useTRPC } from "@/lib/trpc";

/**
 * Change le thème et l'enregistre dans le profil, pour le retrouver sur tous les appareils
 * (navigateur et application de bureau).
 */
export function useThemePreference() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const trpc = useTRPC();
  const save = useMutation(trpc.profile.updatePreferences.mutationOptions());
  const { mutate } = save;

  const choose = React.useCallback(
    (next: Theme) => {
      setTheme(next);
      mutate({ theme: next });
    },
    [setTheme, mutate],
  );

  return { theme: (theme ?? "system") as Theme, resolvedTheme, setTheme: choose };
}

/** Aligne le thème du navigateur sur celui du profil au chargement. */
export function ThemeSync({ theme }: { theme: Theme }) {
  const { setTheme } = useTheme();
  const applied = React.useRef(false);
  React.useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    setTheme(theme);
  }, [theme, setTheme]);
  return null;
}
