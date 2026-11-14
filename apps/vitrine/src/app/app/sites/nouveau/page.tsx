"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2, FileCode2, FolderGit2 as Github, Box, Upload, ArrowRightLeft, Check, Lock, GitBranch, ArrowLeft } from "lucide-react";
import { TitrePage } from "@/components/app/Coque";
import { Bouton, Champ, Etiquette, Carte, Pastille, cx } from "@/components/ui";
import { useStore } from "@/lib/store";

type Choix = "wordpress" | "git" | "docker" | "statique";

const options = [
  { id: "ia", titre: "Créateur IA", texte: "Décrivez votre activité, l'IA construit le site.", icone: Wand2, tag: "Le plus simple" },
  { id: "wordpress", titre: "WordPress", texte: "Installé, sécurisé et mis en cache en 30 secondes.", icone: FileCode2 },
  { id: "git", titre: "Depuis Git", texte: "GitHub ou GitLab : Next.js, Nuxt, Astro, Laravel, Django…", icone: Github, tag: "Développeurs" },
  { id: "docker", titre: "Image Docker", texte: "N'importe quelle image publique ou privée, avec ports et volumes.", icone: Box },
  { id: "statique", titre: "Fichiers statiques", texte: "Glissez un dossier ou une archive ZIP de votre site.", icone: Upload },
  { id: "migration", titre: "Migrer un site", texte: "L'agent copie votre site depuis votre ancien hébergeur, sans coupure.", icone: ArrowRightLeft, tag: "Offert" },
] as const;

const depots = [
  { nom: "camille-martin/commandes", cadre: "Next.js", maj: "il y a 3 h", prive: true },
  { nom: "camille-martin/api-stocks", cadre: "Node.js · Express", maj: "hier", prive: true },
  { nom: "camille-martin/site-recettes", cadre: "Astro", maj: "il y a 6 j", prive: false },
  { nom: "camille-martin/outils-python", cadre: "Python · FastAPI", maj: "il y a 2 sem.", prive: true },
];

export default function Nouveau() {
  const router = useRouter();
  const { creerSite } = useStore();
  const [choix, setChoix] = useState<Choix | null>(null);
  const [nom, setNom] = useState("");
  const [depot, setDepot] = useState(depots[0]!);
  const [branche, setBranche] = useState("main");
  const [image, setImage] = useState("ghcr.io/n8n-io/n8n:latest");
  const [port, setPort] = useState("5678");
  const [admin, setAdmin] = useState("");

  function choisir(id: string) {
    if (id === "ia") return router.push("/app/createur");
    if (id === "migration") return router.push(`/app/agent?q=${encodeURIComponent("Migre mon site existant")}`);
    setChoix(id as Choix);
  }

  function creer(e: React.FormEvent) {
    e.preventDefault();
    let id = "";
    if (choix === "wordpress") id = creerSite({ nom: nom || "Mon site WordPress", type: "wordpress", pile: "WordPress 6.8 · PHP 8.4" });
    if (choix === "git") id = creerSite({ nom: nom || depot.nom.split("/")[1]!, type: "git", pile: depot.cadre, depot: `github.com/${depot.nom}`, branche });
    if (choix === "docker") id = creerSite({ nom: nom || image.split("/").pop()!.split(":")[0]!, type: "docker", pile: `Docker · port ${port}`, depot: image });
    if (choix === "statique") id = creerSite({ nom: nom || "Site statique", type: "statique", pile: "HTML statique" });
    router.push(`/app/sites/detail?id=${id}`);
  }

  if (!choix)
    return (
      <>
        <TitrePage titre="Nouveau projet" description="Choisissez comment démarrer. Vous pourrez tout changer ensuite." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {options.map((o) => (
            <button key={o.id} onClick={() => choisir(o.id)} className="group cursor-pointer rounded-2xl border border-sable bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-encre/25 hover:shadow-[0_20px_50px_-30px_rgba(31,27,22,0.45)]">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-ecume transition group-hover:bg-encre"><o.icone className="size-5 text-lagon-fonce group-hover:text-lagon" /></span>
                {"tag" in o && <Pastille ton="lagon">{o.tag}</Pastille>}
              </div>
              <p className="titre mt-5 text-lg">{o.titre}</p>
              <p className="mt-1 text-sm text-gris">{o.texte}</p>
            </button>
          ))}
        </div>
      </>
    );

  const titre = { wordpress: "Installer WordPress", git: "Déployer depuis Git", docker: "Déployer une image Docker", statique: "Publier des fichiers statiques" }[choix];

  return (
    <>
      <button onClick={() => setChoix(null)} className="mb-4 flex cursor-pointer items-center gap-1.5 text-sm text-gris hover:text-encre"><ArrowLeft className="size-4" /> Retour</button>
      <TitrePage titre={titre} />
      <form onSubmit={creer} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Carte className="space-y-5 p-6">
          <div>
            <Etiquette htmlFor="nom">Nom du projet</Etiquette>
            <Champ id="nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder={choix === "git" ? depot.nom.split("/")[1] : "Mon projet"} />
          </div>

          {choix === "git" && (
            <>
              <div>
                <Etiquette>Dépôt</Etiquette>
                <div className="divide-y divide-sable overflow-hidden rounded-xl border border-sable">
                  {depots.map((d) => (
                    <button type="button" key={d.nom} onClick={() => setDepot(d)} className={cx("flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm transition", depot.nom === d.nom ? "bg-lagon-pale/50" : "hover:bg-ecume/50")}>
                      <span className="flex items-center gap-2.5">
                        <Github className="size-4" />
                        <span className="font-mono text-[13px]">{d.nom}</span>
                        {d.prive && <Lock className="size-3 text-gris" />}
                      </span>
                      <span className="flex items-center gap-3 text-xs text-gris">{d.cadre} · {d.maj} {depot.nom === d.nom && <Check className="size-4 text-lagon-fonce" />}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Etiquette htmlFor="br">Branche de production</Etiquette>
                  <Champ id="br" value={branche} onChange={(e) => setBranche(e.target.value)} />
                </div>
                <div>
                  <Etiquette>Cadre détecté</Etiquette>
                  <div className="flex h-10 items-center gap-2 rounded-xl bg-ecume px-3 text-sm"><Check className="size-4 text-lagon-fonce" /> {depot.cadre}</div>
                </div>
              </div>
              <p className="flex items-start gap-2 rounded-xl bg-ecume/70 p-3 text-[13px] text-encre/70">
                <GitBranch className="mt-0.5 size-4 shrink-0" /> Chaque push sur <b className="mx-1 font-medium">{branche}</b> est déployé en production. Les autres branches reçoivent une URL d&apos;aperçu.
              </p>
            </>
          )}

          {choix === "docker" && (
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <div>
                <Etiquette htmlFor="img">Image</Etiquette>
                <Champ id="img" value={image} onChange={(e) => setImage(e.target.value)} className="font-mono" />
              </div>
              <div>
                <Etiquette htmlFor="port">Port</Etiquette>
                <Champ id="port" value={port} onChange={(e) => setPort(e.target.value)} />
              </div>
            </div>
          )}

          {choix === "wordpress" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Etiquette htmlFor="adm">Email administrateur</Etiquette>
                <Champ id="adm" type="email" value={admin} onChange={(e) => setAdmin(e.target.value)} placeholder="vous@entreprise.fr" />
              </div>
              <div>
                <Etiquette>Langue</Etiquette>
                <div className="flex h-10 items-center rounded-xl bg-ecume px-3 text-sm">Français</div>
              </div>
            </div>
          )}

          {choix === "statique" && (
            <label className="grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-sable bg-ecume/40 py-12 text-center text-sm text-gris transition hover:border-lagon">
              <Upload className="size-6 text-lagon-fonce" />
              <span className="mt-2">Glissez votre dossier ou une archive .zip ici</span>
              <input type="file" className="hidden" />
            </label>
          )}

          <div>
            <Etiquette>Région</Etiquette>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {["Francfort", "Paris", "Madrid"].map((r, i) => (
                <div key={r} className={cx("rounded-xl border px-3 py-2.5", i === 0 ? "border-encre bg-encre text-ecume" : "border-sable text-gris")}>{r}</div>
              ))}
            </div>
          </div>
        </Carte>

        <div className="space-y-4">
          <Carte className="p-5 text-sm">
            <p className="font-medium">Inclus automatiquement</p>
            <ul className="mt-3 space-y-2 text-encre/75">
              {["Certificat SSL", "Sous-domaine .sebt.site", "Sauvegardes quotidiennes", "CDN et cache", "Surveillance de disponibilité"].map((x) => (
                <li key={x} className="flex gap-2"><Check className="mt-0.5 size-4 text-lagon-fonce" /> {x}</li>
              ))}
            </ul>
          </Carte>
          <Bouton type="submit" taille="lg" className="w-full">Créer et déployer</Bouton>
        </div>
      </form>
    </>
  );
}
