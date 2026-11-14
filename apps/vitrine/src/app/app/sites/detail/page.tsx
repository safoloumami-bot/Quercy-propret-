"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ArrowLeft, ExternalLink, RefreshCw, GitBranch, GitCommit, CheckCircle2, XCircle, Loader2, Database, RotateCcw, Plus, Trash2,
  Gauge, Activity, Leaf, Globe, Wand2, Copy, Eye, EyeOff, Bot, Download, Share2,
} from "lucide-react";
import { TitrePage, Modale } from "@/components/app/Coque";
import { StatutSite, Miniature, infosType } from "@/components/app/commun";
import { Bouton, Carte, Champ, Interrupteur, LienBouton, Pastille, Sparkline, cx } from "@/components/ui";
import { useStore, depuis, dateHeure } from "@/lib/store";
import type { Site, Deploiement } from "@/lib/types";

const onglets = ["Aperçu", "Déploiements", "Sauvegardes", "Domaines", "Variables", "Performance", "Paramètres"] as const;

function lignesJournal(site: Site, d: Deploiement) {
  const base = [
    `▸ Clonage de ${site.depot ?? "l'espace de travail"} (${d.branche} @ ${d.commit})`,
    "▸ Allocation du conteneur · Europe (Francfort)",
  ];
  const parType: Record<Site["type"], string[]> = {
    git: ["▸ Détection : " + site.pile, "$ pnpm install --frozen-lockfile", "  Packages: +412 · terminé en 6,2 s", "$ pnpm build", "  ✓ Compilé avec succès", "  ✓ 18 pages générées", "▸ Image construite (142 Mo)"],
    docker: [`$ docker pull ${site.depot ?? "image"}`, "  Status: Downloaded newer image", "▸ Vérification de santé sur le port exposé"],
    wordpress: ["▸ Téléchargement de WordPress 6.8 (fr_FR)", "▸ Création de la base MariaDB", "▸ Installation de LiteCache et du pare-feu", "▸ Durcissement : XML-RPC désactivé, clés regénérées"],
    ia: ["▸ Rendu des pages générées", "▸ Optimisation des images (WebP, AVIF)", "▸ Génération du sitemap et des balises SEO"],
    statique: ["▸ Envoi de 48 fichiers", "▸ Compression Brotli"],
  };
  return [...base, ...parType[site.type], "▸ Émission du certificat SSL (Let's Encrypt)", "▸ Propagation sur le CDN (12 points de présence)", `✓ En ligne sur https://${site.domaine}`];
}

function Journal({ site, d }: { site: Site; d: Deploiement }) {
  const lignes = lignesJournal(site, d);
  const [n, setN] = useState(d.statut === "en_cours" ? 1 : lignes.length);
  useEffect(() => {
    if (d.statut !== "en_cours") return setN(lignes.length);
    const t = setInterval(() => setN((x) => Math.min(lignes.length - 1, x + 1)), 380);
    return () => clearInterval(t);
  }, [d.statut, lignes.length]);
  return (
    <div className="defile max-h-80 overflow-y-auto rounded-xl bg-encre p-4 font-mono text-[12.5px] leading-6 text-ecume/80">
      {lignes.slice(0, n).map((l, i) => (
        <div key={i} className={cx(l.startsWith("✓") && "text-lagon", l.startsWith("$") && "text-ecume")}>
          <span className="mr-3 text-ecume/30 select-none">{String(i + 1).padStart(2, "0")}</span>
          {l}
        </div>
      ))}
      {d.statut === "echec" && <div className="text-corail"><span className="mr-3 text-ecume/30">!!</span>Erreur : test « calcul TVA » en échec. La production n&apos;a pas été modifiée.</div>}
      {d.statut === "en_cours" && <span className="inline-block h-4 w-2 animate-clignote bg-lagon align-middle" />}
    </div>
  );
}

function Detail() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const store = useStore();
  const { etat, redeployer, majSite, sauvegarder, restaurer, supprimerSite, lierDomaine } = store;
  const site = etat.sites.find((s) => s.id === id);
  const [onglet, setOnglet] = useState<(typeof onglets)[number]>("Aperçu");
  const [depOuvert, setDepOuvert] = useState<string | null>(null);
  const [cle, setCle] = useState("");
  const [valeur, setValeur] = useState("");
  const [voir, setVoir] = useState(false);
  const [suppr, setSuppr] = useState(false);
  const [restau, setRestau] = useState<string | null>(null);

  useEffect(() => {
    if (site && site.deploiements[0]?.statut === "en_cours") {
      setOnglet("Déploiements");
      setDepOuvert(site.deploiements[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site?.deploiements[0]?.id]);

  if (!site)
    return (
      <div className="py-20 text-center">
        <p className="titre text-xl">Projet introuvable</p>
        <LienBouton href="/app/sites" variante="secondaire" className="mt-4">Retour aux projets</LienBouton>
      </div>
    );

  const domainesLies = etat.domaines.filter((d) => d.siteId === site.id);
  const visites = site.visites7j.reduce((a, b) => a + b, 0);
  const I = infosType[site.type].icone;

  return (
    <>
      <Link href="/app/sites" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gris hover:text-encre"><ArrowLeft className="size-4" /> Projets</Link>
      <TitrePage
        titre={site.nom}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatutSite statut={site.statut} />
            <a href="#" className="flex items-center gap-1 hover:text-encre">{site.domaine} <ExternalLink className="size-3" /></a>
            <span className="flex items-center gap-1"><I className="size-3.5" /> {site.pile}</span>
          </span>
        }
        actions={
          <>
            {site.type === "ia" && <LienBouton href={`/app/createur?site=${site.id}`} variante="secondaire"><Wand2 className="size-4" /> Modifier le site</LienBouton>}
            <Bouton variante="secondaire" onClick={() => redeployer(site.id)} disabled={site.statut === "deploiement"}><RefreshCw className={cx("size-4", site.statut === "deploiement" && "animate-spin")} /> Redéployer</Bouton>
            <LienBouton href={`/app/agent?q=${encodeURIComponent(`Analyse ${site.domaine}`)}`}><Bot className="size-4" /> Analyser</LienBouton>
          </>
        }
      />

      <div className="defile mb-6 flex gap-1 overflow-x-auto border-b border-sable">
        {onglets.map((o) => (
          <button key={o} onClick={() => setOnglet(o)} className={cx("-mb-px cursor-pointer border-b-2 px-3.5 py-2.5 text-sm whitespace-nowrap transition", onglet === o ? "border-encre font-medium text-encre" : "border-transparent text-gris hover:text-encre")}>
            {o}
          </button>
        ))}
      </div>

      {onglet === "Aperçu" && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Carte className="overflow-hidden">
            <Miniature site={site} className="h-72" />
            <div className="grid grid-cols-3 divide-x divide-sable border-t border-sable text-center">
              <div className="p-4"><p className="text-xs text-gris">Visites · 7 j</p><p className="titre mt-1 text-xl">{visites.toLocaleString("fr-FR")}</p></div>
              <div className="p-4"><p className="text-xs text-gris">Temps de réponse</p><p className="titre mt-1 text-xl">{site.tempsReponseMs} ms</p></div>
              <div className="p-4"><p className="text-xs text-gris">Disponibilité</p><p className="titre mt-1 text-xl">{site.disponibilite.toLocaleString("fr-FR")} %</p></div>
            </div>
          </Carte>
          <div className="space-y-4">
            <Carte className="p-5">
              <p className="text-sm font-medium">Dernier déploiement</p>
              {site.deploiements[0] ? (
                <div className="mt-3 text-sm">
                  <p className="flex items-center gap-2">{site.deploiements[0].statut === "en_cours" ? <Loader2 className="size-4 animate-spin text-ambre" /> : <CheckCircle2 className="size-4 text-lagon" />} {site.deploiements[0].message}</p>
                  <p className="mt-1 text-[13px] text-gris">{site.deploiements[0].branche} · {site.deploiements[0].commit} · {depuis(site.deploiements[0].date)}</p>
                </div>
              ) : <p className="mt-2 text-sm text-gris">Aucun déploiement.</p>}
            </Carte>
            <Carte className="p-5">
              <p className="text-sm font-medium">Fonctions</p>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between"><span>Cache et CDN</span><Interrupteur label="Cache" actif={site.cache} onChange={(v) => majSite(site.id, (s) => { s.cache = v; s.tempsReponseMs = v ? Math.round(s.tempsReponseMs * 0.45) : Math.round(s.tempsReponseMs / 0.45); s.scorePerf = Math.min(99, s.scorePerf + (v ? 18 : -18)); })} /></div>
                <div className="flex items-center justify-between"><span>Préproduction</span><Interrupteur label="Préproduction" actif={site.preproduction} onChange={(v) => { majSite(site.id, (s) => { s.preproduction = v; }); if (v) redeployer(site.id, "preproduction", "Création de la préproduction"); }} /></div>
              </div>
              {site.preproduction && <p className="mt-3 rounded-lg bg-ecume px-3 py-2 font-mono text-xs">preprod-{site.domaine.replace(/\./g, "-")}.sebt.site</p>}
            </Carte>
            <Carte className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium">Page de statut publique</p>
                <p className="text-[13px] text-gris">statut.sebt.cloud/{site.id.slice(0, 8)}</p>
              </div>
              <Bouton variante="secondaire" taille="sm"><Share2 className="size-3.5" /> Partager</Bouton>
            </Carte>
          </div>
        </div>
      )}

      {onglet === "Déploiements" && (
        <Carte className="divide-y divide-sable">
          {site.deploiements.length === 0 && <p className="p-6 text-sm text-gris">Ce projet n&apos;a pas encore de déploiement. {site.type === "ia" && "Publiez-le depuis le créateur IA."}</p>}
          {site.deploiements.map((d) => (
            <div key={d.id}>
              <button onClick={() => setDepOuvert(depOuvert === d.id ? null : d.id)} className="flex w-full cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-left text-sm hover:bg-ecume/40">
                {d.statut === "reussi" ? <CheckCircle2 className="size-4 text-lagon" /> : d.statut === "echec" ? <XCircle className="size-4 text-corail" /> : <Loader2 className="size-4 animate-spin text-ambre" />}
                <span className="min-w-0 flex-1 truncate font-medium">{d.message}</span>
                <Pastille ton={d.environnement === "production" ? "sombre" : d.environnement === "preproduction" ? "ambre" : "neutre"}>{d.environnement}</Pastille>
                <span className="flex items-center gap-1 font-mono text-xs text-gris"><GitBranch className="size-3" />{d.branche}</span>
                <span className="flex items-center gap-1 font-mono text-xs text-gris"><GitCommit className="size-3" />{d.commit}</span>
                <span className="w-20 text-right text-xs text-gris">{d.statut === "en_cours" ? "en cours" : `${d.dureeSec} s`}</span>
                <span className="w-24 text-right text-xs text-gris">{depuis(d.date)}</span>
              </button>
              {depOuvert === d.id && (
                <div className="px-5 pb-5">
                  <Journal site={site} d={d} />
                  {d.environnement === "apercu" && d.statut === "reussi" && <p className="mt-3 text-[13px] text-gris">URL d&apos;aperçu : <span className="font-mono text-encre">{d.branche.replace(/\//g, "-")}--{site.domaine.split(".")[0]}.sebt.site</span></p>}
                  {d.statut === "reussi" && d !== site.deploiements[0] && <Bouton variante="secondaire" taille="sm" className="mt-3" onClick={() => redeployer(site.id, "production", `Retour à ${d.commit}`)}><RotateCcw className="size-3.5" /> Revenir à cette version</Bouton>}
                </div>
              )}
            </div>
          ))}
        </Carte>
      )}

      {onglet === "Sauvegardes" && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gris">Sauvegarde automatique chaque nuit, conservée 30 jours. Stockée dans un second centre de données.</p>
            <div className="flex gap-2">
              <Bouton variante="secondaire"><Download className="size-4" /> Exporter tout</Bouton>
              <Bouton onClick={() => sauvegarder(site.id)}><Database className="size-4" /> Sauvegarder maintenant</Bouton>
            </div>
          </div>
          <Carte className="divide-y divide-sable">
            {site.sauvegardes.length === 0 && <p className="p-6 text-sm text-gris">La première sauvegarde automatique aura lieu cette nuit.</p>}
            {site.sauvegardes.slice(0, 15).map((b) => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                <Database className="size-4 text-gris" />
                <span className="flex-1">{dateHeure(b.date)} {b.note && <span className="text-gris">· {b.note}</span>}</span>
                <Pastille ton={b.type === "manuelle" ? "lagon" : b.type === "avant_action" ? "ambre" : "neutre"}>{b.type === "auto" ? "Automatique" : b.type === "manuelle" ? "Manuelle" : "Avant action"}</Pastille>
                <span className="w-20 text-right text-xs text-gris">{b.tailleMo} Mo</span>
                <Bouton variante="fantome" taille="sm" onClick={() => setRestau(b.id)}><RotateCcw className="size-3.5" /> Restaurer</Bouton>
              </div>
            ))}
          </Carte>
          <Modale ouverte={!!restau} fermer={() => setRestau(null)} titre="Restaurer cette sauvegarde ?">
            <p className="text-sm text-gris">Le site reviendra à cet état. Une sauvegarde de l&apos;état actuel sera créée juste avant : vous pourrez revenir en arrière.</p>
            <div className="mt-6 flex justify-end gap-2">
              <Bouton variante="secondaire" onClick={() => setRestau(null)}>Annuler</Bouton>
              <Bouton onClick={() => { restaurer(site.id, restau!); setRestau(null); }}>Restaurer</Bouton>
            </div>
          </Modale>
        </>
      )}

      {onglet === "Domaines" && (
        <Carte className="p-5">
          <p className="text-sm font-medium">Adresses de ce projet</p>
          <div className="mt-3 divide-y divide-sable rounded-xl border border-sable">
            <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="font-mono">{site.domaine.endsWith(".sebt.site") ? site.domaine : `${site.id.slice(0, 8)}.sebt.site`}</span><Pastille>Adresse technique</Pastille></div>
            {domainesLies.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="flex items-center gap-2 font-mono"><Globe className="size-4 text-lagon-fonce" />{d.nom}</span>
                <span className="flex items-center gap-2"><Pastille ton="lagon">SSL actif</Pastille><Bouton variante="fantome" taille="sm" onClick={() => lierDomaine(d.id, undefined)}>Détacher</Bouton></span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm font-medium">Relier un domaine</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {etat.domaines.filter((d) => d.siteId !== site.id).map((d) => (
              <Bouton key={d.id} variante="secondaire" taille="sm" onClick={() => lierDomaine(d.id, site.id)}><Plus className="size-3.5" /> {d.nom}</Bouton>
            ))}
            <LienBouton href="/app/domaines" taille="sm">Acheter un domaine</LienBouton>
          </div>
        </Carte>
      )}

      {onglet === "Variables" && (
        <Carte className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Variables d&apos;environnement</p>
            <Bouton variante="fantome" taille="sm" onClick={() => setVoir(!voir)}>{voir ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {voir ? "Masquer" : "Afficher"}</Bouton>
          </div>
          <p className="mt-1 text-[13px] text-gris">Chiffrées au repos. Un changement déclenche un redéploiement.</p>
          <div className="mt-4 divide-y divide-sable rounded-xl border border-sable font-mono text-[13px]">
            {site.variables.length === 0 && <p className="px-4 py-3 font-sans text-sm text-gris">Aucune variable.</p>}
            {site.variables.map((v) => (
              <div key={v.cle} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-56 shrink-0 truncate font-medium">{v.cle}</span>
                <span className="flex-1 truncate text-gris">{voir ? v.valeur : "••••••••••••"}</span>
                <button className="cursor-pointer text-gris hover:text-encre" aria-label="Copier" onClick={() => navigator.clipboard?.writeText(v.valeur)}><Copy className="size-3.5" /></button>
                <button className="cursor-pointer text-gris hover:text-corail" aria-label="Supprimer" onClick={() => majSite(site.id, (s) => { s.variables = s.variables.filter((x) => x.cle !== v.cle); })}><Trash2 className="size-3.5" /></button>
              </div>
            ))}
          </div>
          <form
            className="mt-4 grid gap-2 sm:grid-cols-[220px_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!cle) return;
              majSite(site.id, (s) => { s.variables = [...s.variables.filter((x) => x.cle !== cle), { cle: cle.toUpperCase(), valeur }]; });
              setCle(""); setValeur("");
              redeployer(site.id, "production", `Variable ${cle.toUpperCase()} modifiée`);
            }}
          >
            <Champ placeholder="NOM_VARIABLE" value={cle} onChange={(e) => setCle(e.target.value.replace(/[^A-Za-z0-9_]/g, ""))} className="font-mono" />
            <Champ placeholder="valeur" value={valeur} onChange={(e) => setValeur(e.target.value)} className="font-mono" />
            <Bouton type="submit">Ajouter</Bouton>
          </form>
        </Carte>
      )}

      {onglet === "Performance" && (
        <div className="grid gap-4 md:grid-cols-3">
          <Carte className="p-5">
            <p className="flex items-center gap-2 text-sm text-gris"><Gauge className="size-4" /> Score de performance</p>
            <p className={cx("titre mt-2 text-5xl", site.scorePerf >= 90 ? "text-lagon-fonce" : site.scorePerf >= 70 ? "text-[#b07800]" : "text-corail")}>{site.scorePerf}</p>
            <div className="mt-3 space-y-1.5 text-[13px]">
              {[["LCP", site.cache ? "0,9 s" : "2,6 s"], ["INP", "84 ms"], ["CLS", "0,02"]].map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-gris">{k}</span><span>{v}</span></div>)}
            </div>
          </Carte>
          <Carte className="p-5">
            <p className="flex items-center gap-2 text-sm text-gris"><Activity className="size-4" /> Visites par jour</p>
            <div className="mt-4"><Sparkline valeurs={site.visites7j} hauteur={90} /></div>
          </Carte>
          <Carte className="p-5">
            <p className="flex items-center gap-2 text-sm text-gris"><Leaf className="size-4" /> Empreinte par visite</p>
            <p className="titre mt-2 text-5xl">{site.co2gParVisite.toLocaleString("fr-FR")} <span className="text-lg text-gris">g CO₂e</span></p>
            <p className="mt-2 text-[13px] text-gris">{site.co2gParVisite < 0.3 ? "Plus sobre que 80 % des sites mesurés." : "Images lourdes et cache désactivé : l'agent peut corriger ça."}</p>
          </Carte>
          {site.scorePerf < 90 && (
            <div className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-encre p-5 text-ecume md:col-span-3 md:flex-row md:items-center">
              <p className="flex items-center gap-2"><Bot className="size-5 text-lagon" /> L&apos;agent a repéré 3 optimisations possibles pour ce site.</p>
              <LienBouton href={`/app/agent?q=${encodeURIComponent(`Optimise ${site.domaine}`)}`} variante="lagon">Voir les propositions</LienBouton>
            </div>
          )}
        </div>
      )}

      {onglet === "Paramètres" && (
        <div className="space-y-4">
          <Carte className="p-5">
            <p className="text-sm font-medium">Nom du projet</p>
            <Champ className="mt-2 max-w-md" defaultValue={site.nom} onBlur={(e) => majSite(site.id, (s) => { s.nom = e.target.value || s.nom; })} />
          </Carte>
          <Carte className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div><p className="text-sm font-medium">Transférer à un client</p><p className="text-[13px] text-gris">Le client devient propriétaire et payeur. Vous gardez un accès si vous le souhaitez.</p></div>
            <Bouton variante="secondaire">Transférer</Bouton>
          </Carte>
          <Carte className="flex flex-wrap items-center justify-between gap-3 border-corail/40 p-5">
            <div><p className="text-sm font-medium text-[#b8391c]">Supprimer le projet</p><p className="text-[13px] text-gris">Une archive complète est conservée 30 jours.</p></div>
            <Bouton variante="danger" onClick={() => setSuppr(true)}><Trash2 className="size-4" /> Supprimer</Bouton>
          </Carte>
          <Modale ouverte={suppr} fermer={() => setSuppr(false)} titre={`Supprimer « ${site.nom} » ?`}>
            <p className="text-sm text-gris">Le site sera mis hors ligne immédiatement. Ses domaines resteront dans votre compte.</p>
            <div className="mt-6 flex justify-end gap-2">
              <Bouton variante="secondaire" onClick={() => setSuppr(false)}>Annuler</Bouton>
              <Bouton variante="danger" onClick={() => { supprimerSite(site.id); router.push("/app/sites"); }}>Supprimer définitivement</Bouton>
            </div>
          </Modale>
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Detail />
    </Suspense>
  );
}
