/* global process, console */
/**
 * Prépare l'application terrain pour le logiciel : la page devient un modèle servi par
 * apps/web (route /terrain/<espace>). Les icônes sont dessinées par le logiciel aux couleurs
 * de chaque entreprise ; celles de public/ sont les icônes d'origine.
 *
 *   node apps/terrain/generer.mjs          → régénère
 *   node apps/terrain/generer.mjs --check  → vérifie que le fichier généré est à jour
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ici = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(ici, "../web");
const cible = path.join(web, "src/server/terrain/template.generated.ts");

const html = readFileSync(path.join(ici, "public/index.html"), "utf8");
const contenu =
  "// Fichier généré par apps/terrain/generer.mjs à partir de apps/terrain/public/index.html.\n" +
  "// Ne pas modifier : modifier la page d'origine puis relancer « pnpm terrain:generer ».\n" +
  `export const TERRAIN_TEMPLATE = ${JSON.stringify(html)};\n`;

if (process.argv.includes("--check")) {
  const actuel = readFileSync(cible, "utf8");
  if (actuel !== contenu) {
    console.error(
      "apps/web/src/server/terrain/template.generated.ts n'est pas à jour : lancez « pnpm terrain:generer ».",
    );
    process.exit(1);
  }
  console.info("Application terrain à jour.");
} else {
  mkdirSync(path.dirname(cible), { recursive: true });
  writeFileSync(cible, contenu);
  console.info("Application terrain générée.");
}
