"use client";

import * as React from "react";

/** Compte la visite de la page (statistiques de l'entreprise, sans cookie ni traceur). */
export function VisitBeacon() {
  React.useEffect(() => {
    void fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname, referrer: document.referrer || null }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);
  return null;
}
