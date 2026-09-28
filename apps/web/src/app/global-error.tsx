"use client";

/** Dernier filet de sécurité : erreur dans le layout racine lui-même. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 48, textAlign: "center" }}>
        <h1 style={{ fontSize: 18 }}>L&apos;application n&apos;a pas pu démarrer</h1>
        <p style={{ opacity: 0.7 }}>
          Rechargez la page. Si le problème persiste, contactez le support.
        </p>
        <button type="button" onClick={reset} style={{ marginTop: 16, padding: "8px 16px" }}>
          Réessayer
        </button>
      </body>
    </html>
  );
}
