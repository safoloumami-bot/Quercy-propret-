// Génère le projet Android (Trusted Web Activity) d'une application web à partir de son
// manifeste : node generate-twa.mjs <url du manifeste> <identifiant Android> <dossier>
// Variables : KEYSTORE (chemin du fichier de clé), VERSION_CODE, VERSION_NAME.
import { ConsoleLog, TwaGenerator, TwaManifest } from "@bubblewrap/core";

const [manifestUrl, packageId, target] = process.argv.slice(2);
if (!manifestUrl || !packageId || !target)
  throw new Error("Usage : generate-twa.mjs <manifeste> <identifiant> <dossier>");

const twa = await TwaManifest.fromWebManifest(manifestUrl);
twa.packageId = packageId;
twa.signingKey = { path: process.env.KEYSTORE ?? "android.keystore", alias: "sebt" };
twa.appVersionCode = Number(process.env.VERSION_CODE ?? 1);
twa.appVersionName = process.env.VERSION_NAME ?? "1.0.0";
twa.enableNotifications = true;
twa.fallbackType = "customtabs";
twa.minSdkVersion = 24;
await new TwaGenerator().createTwaProject(target, twa, new ConsoleLog("twa"));
console.log(`Projet Android généré dans ${target} (${twa.name}, ${twa.startUrl}).`);
