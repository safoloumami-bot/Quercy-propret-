/**
 * Lien entre le site et les applications Android (TWA) : sans lui, l'application affiche
 * une barre d'adresse. Les empreintes SHA-256 des certificats de signature viennent de
 * ANDROID_CERT_SHA256 (plusieurs séparées par des virgules) ; elles sont publiques.
 */
export const dynamic = "force-dynamic";

const ANDROID_PACKAGES = ["app.sebt.logiciel", "app.sebt.terrain"];

export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));
  const body = fingerprints.length
    ? ANDROID_PACKAGES.map((packageName) => ({
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      }))
    : [];
  return Response.json(body, { headers: { "cache-control": "public, max-age=300" } });
}
