import type { NextConfig } from "next";

// STATIC_EXPORT=1 produit un site statique (dossier out/) pour une démo sans serveur.
const isStatic = process.env.STATIC_EXPORT === "1";

// Adresse du logiciel (même réglage que src/config/marque.ts).
const logiciel = (
  process.env.NEXT_PUBLIC_URL_LOGICIEL || "https://sebt-t5gw.onrender.com"
).replace(/\/$/, "");

// Protections du navigateur (les mêmes que le logiciel).
const enTetesSecurite = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; upgrade-insecure-requests",
  },
];

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  ...(isStatic
    ? { output: "export", trailingSlash: true, images: { unoptimized: true } }
    : {
        // Les anciennes pages de démonstration (compte et espace client simulés) mènent au
        // vrai logiciel : un visiteur ne tombe jamais sur un faux compte.
        async headers() {
          return [{ source: "/:chemin*", headers: enTetesSecurite }];
        },
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
