import type { MetadataRoute } from "next";

/**
 * Manifeste du logiciel : installation sur l'écran d'accueil (« Ajouter à l'écran d'accueil »)
 * et application Android (TWA) construite par le flux « Application Android ».
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "sebt",
    short_name: "sebt",
    description: "Le logiciel de gestion de votre entreprise.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FBF8F2",
    theme_color: "#2B2620",
    lang: "fr",
    icons: [
      { src: "/app/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/app/icone-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
