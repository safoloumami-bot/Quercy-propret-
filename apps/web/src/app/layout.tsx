import "./globals.css";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import type * as React from "react";

import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "Quercy", template: "%s · Quercy" },
  description: "Le logiciel de gestion tout-en-un, modulaire, pour les PME et les indépendants.",
  applicationName: "Quercy",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FCFDFD" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1719" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
