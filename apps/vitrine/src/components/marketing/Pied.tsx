import Link from "next/link";
import { Logo } from "@/components/ui";
import { marque, liensLogiciel } from "@/config/marque";

const colonnes = [
  {
    titre: "Logiciel",
    liens: [
      ["Modules", "/#modules"],
      ["Corps de métier", "/#metiers"],
      ["Assistant IA", "/#assistant"],
      ["Application terrain", "/#terrain"],
      ["Tarifs", "/tarifs"],
    ],
  },
  {
    titre: "Sites et applis",
    liens: [
      ["Aperçu gratuit de votre site", "/sites#createur"],
      ["Sites, applis et logo sur mesure", "/sites#sur-mesure"],
      ["Questions sur les sites", "/sites#questions"],
    ],
  },
  {
    titre: "Ressources",
    liens: [
      ["sebt en vidéo", "/#presentation"],
      ["Partout, même hors ligne", "/#partout"],
      ["Sécurité", "/#securite"],
      ["Questions fréquentes", "/#faq"],
    ],
  },
  {
    titre: "sebt",
    liens: [
      ["Se connecter", liensLogiciel.connexion],
      ["Contact commercial", liensLogiciel.contact],
      ["Support", `mailto:${marque.emailSupport}`],
    ],
  },
];

export function Pied() {
  return (
    <footer className="border-t border-creme/[0.06] bg-nuit text-creme">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="col-span-2 md:col-span-1">
            <Logo clair className="h-6" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-taupe">{marque.slogan} Le logiciel de gestion des TPE, PME et indépendants.</p>
          </div>
          {colonnes.map((c) => (
            <nav key={c.titre} aria-label={c.titre}>
              <p className="text-[13px] font-medium text-creme">{c.titre}</p>
              <ul className="mt-4 space-y-2.5">
                {c.liens.map(([l, h]) => (
                  <li key={l}>
                    <Link href={h!} className="text-[13.5px] text-taupe transition hover:text-creme">{l}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-16 flex flex-col justify-between gap-4 border-t border-creme/[0.06] pt-6 text-[13px] text-taupe-2 md:flex-row">
          <p>© {marque.annee} {marque.nom}. Prix affichés hors taxes.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/#" className="hover:text-creme">Mentions légales</Link>
            <Link href="/#" className="hover:text-creme">Confidentialité</Link>
            <Link href="/#" className="hover:text-creme">CGV</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
