import type { ReactNode } from "react";

import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..600&family=Geist:wght@400..700&display=swap"
        />
      </head>
      <body style={{ fontFamily: "Geist, system-ui, -apple-system, Segoe UI, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
