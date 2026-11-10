import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { marque } from "@/config/marque";
import { FournisseurStore } from "@/lib/store";
// Polices des sites générés (chargées seulement quand un aperçu les utilise)
import "@fontsource-variable/fraunces";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${marque.nom} : le logiciel de gestion des TPE et PME`, template: `%s · ${marque.nom}` },
  description: marque.accroche,
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.ico" }], apple: "/apple-touch-icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">
        <FournisseurStore>{children}</FournisseurStore>
      </body>
    </html>
  );
}
