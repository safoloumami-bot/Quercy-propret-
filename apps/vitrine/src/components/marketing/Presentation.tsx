import { existsSync } from "node:fs";
import { join } from "node:path";

import { TitreSection } from "./Sections";
import { VideoPresentation } from "./VideoPresentation";

const VIDEO = "/video/sebt-presentation.mp4";
const POSTER = "/video/sebt-presentation-poster.jpg";

/** Section « sebt en une minute » : affichée seulement si la vidéo est dans public/video. */
export function Presentation() {
  const dossier = join(process.cwd(), "public");
  if (!existsSync(join(dossier, VIDEO))) return null;
  const poster = existsSync(join(dossier, POSTER)) ? POSTER : undefined;
  return (
    <section id="presentation" aria-label="Présentation en vidéo" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24 md:py-28">
      <TitreSection centre surtitre="En une minute" affirmation="Voyez sebt à l'œuvre." precision="Du devis à la facture payée." />
      <div className="mt-12">
        <VideoPresentation src={VIDEO} poster={poster} />
      </div>
    </section>
  );
}
