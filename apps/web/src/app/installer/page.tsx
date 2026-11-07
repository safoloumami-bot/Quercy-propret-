import type { Metadata } from "next";

import { InstallGuide } from "./install-guide";

export const metadata: Metadata = {
  title: "Installer l'application",
  description: "Installer sebt sur iPhone, Samsung et les autres téléphones Android.",
};

/** Dépôt où le flux « Application Android » publie les APK (version « android »). */
const APK_BASE = "https://github.com/safoloumami-bot/Quercy-propret-/releases/download/android";

/**
 * Page publique (sans connexion) à envoyer aux équipes : installer le logiciel, ou
 * l'application terrain d'une entreprise (`?appli=terrain&e=<identifiant>`), sur téléphone.
 */
export default async function InstallPage({
  searchParams,
}: {
  searchParams: Promise<{ appli?: string; e?: string }>;
}) {
  const { appli, e } = await searchParams;
  const slug = e && /^[a-z0-9-]{1,60}$/.test(e) ? e : null;
  const terrain = appli === "terrain" && slug !== null;
  return (
    <InstallGuide
      name={terrain ? "sebt Terrain" : "sebt"}
      path={terrain ? `/terrain/${slug}` : "/"}
      apk={`${APK_BASE}/${terrain ? "sebt-terrain.apk" : "sebt.apk"}`}
      icon={terrain ? "/terrain-quercy/icone-192.png" : "/app/icone-192.png"}
    />
  );
}
