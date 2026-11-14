// Génère src/fonts.generated.ts : polices Geist (OFL) encodées en base64, pour que la
// génération de PDF fonctionne à l'identique dans Next.js, le worker et les tests, sans
// dépendre de l'emplacement des fichiers sur disque.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const font = (name) => readFileSync(join(root, "fonts", name)).toString("base64");
writeFileSync(
  join(root, "src", "fonts.generated.ts"),
  `// Fichier généré par \`pnpm --filter @quercy/documents fonts\` : ne pas modifier.\n` +
    `// Polices Geist, SIL Open Font License 1.1 (voir fonts/OFL-Geist.txt).\n` +
    `export const GEIST_REGULAR = "${font("Geist-Regular.ttf")}";\n` +
    `export const GEIST_SEMIBOLD = "${font("Geist-SemiBold.ttf")}";\n`,
);
