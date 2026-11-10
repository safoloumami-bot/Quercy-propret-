import type { NextConfig } from "next";

// STATIC_EXPORT=1 produit un site statique (dossier out/) pour une démo sans serveur.
const isStatic = process.env.STATIC_EXPORT === "1";

// Adresse du logiciel (même réglage que src/config/marque.ts).
const logiciel = (
  process.env.NEXT_PUBLIC_URL_LOGICIEL || "https://sebt-t5gw.onrender.com"
).replace(/\/$/, "");

const config: NextConfig = {
  reactStrictMode: true,
  ...(isStatic
    ? { output: "export", trailingSlash: true, images: { unoptimized: true } }
    : {
        // Les anciennes pages de démonstration (compte et espace client simulés) mènent au
        // vrai logiciel : un visiteur ne tombe jamais sur un faux compte.
        async redirects() {
          return [
            { source: "/connexion", destination: `${logiciel}/connexion`, permanent: false },
            { source: "/inscription", destination: `${logiciel}/inscription`, permanent: false },
            { source: "/app", destination: `${logiciel}/connexion`, permanent: false },
            { source: "/app/:chemin*", destination: `${logiciel}/connexion`, permanent: false },
          ];
        },
      }),
};

export default config;
