"use client";

import * as React from "react";

/** Vrai quand la requête média correspond (faux au rendu serveur). */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Écran de téléphone (moins de 640 px de large). */
export const PHONE_QUERY = "(max-width: 639px)";
