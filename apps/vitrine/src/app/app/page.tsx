"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Eye, Activity, HardDrive, Sparkles, ArrowRight, Wand2, AlertTriangle, Bot, Globe, Mail, Cpu, Leaf, PartyPopper } from "lucide-react";
import { TitrePage } from "@/components/app/Coque";
import { CarteSite, Stat, Vide } from "@/components/app/commun";
import { Carte, LienBouton, Jauge, Pastille, Sparkline } from "@/components/ui";
import { useStore, depuis } from "@/lib/store";
import { offresWeb } from "@/config/offres";

function VueEnsemble() {
  const { etat } = useStore();
  const bienvenue = useSearchParams().get("bienvenue");
  const offre = offresWeb.find((o) => o.id === etat.compte.offreId)!;
  const prenom = etat.compte.nom.split(" ")[0];
  const visites = etat.sites.reduce((t, s) => t + s.visites7j.reduce((a, b) => a + b, 0), 0);
  const parJour = Array.from({ length: 7 }, (_, i) => etat.sites.reduce((t, s) => t + (s.visites7j[i] ?? 0), 0));
  const stockage = etat.sites.reduce((t, s) => t + s.stockageMo, 0) / 1024;
  const stockageMax = offre.id === "essentiel" ? 25 : offre.id === "pro" ? 100 : 250;
  const dispo = etat.sites.length ? Math.min(...etat.sites.map((s) => s.disponibilite)) : 100;
  const alertes = [
    ...etat.domaines.filter((d) => !d.renouvellementAuto && new Date(d.expire).getTime() - Date.now() < 30 * 86400000).map((d) => ({ texte: `${d.nom} expire dans ${Math.round((new Date(d.expire).getTime() - Date.now()) / 86400000)} jours`, lien: "/app/domaines", action: "Renouveler" })),
    ...etat.sites.filter((s) => s.scorePerf < 75).map((s) => ({ texte: `${s.domaine} est lent (score ${s.scorePerf}/100)`, lien: `/app/agent?q=${encodeURIComponent(`Optimise ${s.domaine}`)}`, action: "Optimiser avec l'agent" })),
    ...etat.boites.filter((b) => b.utiliseGo / b.quotaGo > 0.75).map((b) => ({ texte: `La boîte ${b.adresse} est pleine à ${Math.round((b.utiliseGo / b.quotaGo) * 100)} %`, lien: "/app/emails", action: "Gérer" })),
  ];

  return (
    <>
      {bienvenue && (
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-encre p-6 text-ecume md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <PartyPopper className="size-6 shrink-0 text-lagon" />
            <div>
              <p className="titre text-xl">Bienvenue, {prenom} !</p>
              <p className="mt-1 text-ecume/65">Par quoi voulez-vous commencer ? Vous pouvez aussi demander à l&apos;agent de migrer votre site existant.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <LienBouton href="/app/createur" variante="lagon"><Wand2 className="size-4" /> Créer avec l&apos;IA</LienBouton>
            <LienBouton href={`/app/agent?q=${encodeURIComponent("Migre mon site existant")}`} variante="clair">Migrer un site</LienBouton>
          </div>
        </div>
      )}

      <TitrePage
        titre={`Bonjour ${prenom}`}
        description={etat.sites.length ? "Voici l'état de vos projets aujourd'hui." : "Votre espace est prêt. Créez votre premier projet."}
        actions={<LienBouton href="/app/sites/nouveau">Nouveau projet</LienBouton>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Visites · 7 jours" valeur={visites.toLocaleString("fr-FR")} detail={`${etat.sites.length} site${etat.sites.length > 1 ? "s" : ""} actif${etat.sites.length > 1 ? "s" : ""}`} icone={Eye} />
        <Stat label="Disponibilité · 30 jours" valeur={`${dispo.toLocaleString("fr-FR")} %`} detail="Vérifiée toutes les minutes" icone={Activity} />
        <div className="rounded-2xl border border-sable bg-white p-5">
          <div className="flex items-center justify-between text-[13px] text-gris">Stockage <HardDrive className="size-4" /></div>
          <p className="titre mt-2 text-3xl">{stockage.toFixed(1).replace(".", ",")} <span className="text-lg text-gris">/ {stockageMax} Go</span></p>
          <div className="mt-3"><Jauge valeur={stockage} max={stockageMax} /></div>
        </div>
        <div className="rounded-2xl border border-sable bg-white p-5">
          <div className="flex items-center justify-between text-[13px] text-gris">Crédits IA <Sparkles className="size-4" /></div>
          <p className="titre mt-2 text-3xl">{etat.compte.creditsIA} <span className="text-lg text-gris">/ {offre.creditsIA}</span></p>
          <div className="mt-3"><Jauge valeur={etat.compte.creditsIA} max={offre.creditsIA} reserve /></div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="titre text-xl">Vos projets</h2>
            <Link href="/app/sites" className="flex items-center gap-1 text-sm text-gris hover:text-encre">Tout voir <ArrowRight className="size-3.5" /></Link>
          </div>
          {etat.sites.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {etat.sites.slice(0, 6).map((s) => <CarteSite key={s.id} site={s} />)}
            </div>
          ) : (
            <Vide icone={Wand2} titre="Aucun projet pour l'instant" texte="Décrivez votre activité au créateur IA, installez WordPress ou connectez un dépôt Git." action={<LienBouton href="/app/sites/nouveau">Créer un projet</LienBouton>} />
          )}

          {etat.sites.length > 0 && (
            <Carte className="mt-6 p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Trafic cumulé</h3>
                <Pastille ton="lagon">7 derniers jours</Pastille>
              </div>
              <div className="mt-4"><Sparkline valeurs={parJour} hauteur={110} /></div>
              <div className="mt-2 flex justify-between text-xs text-gris">
                {Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString("fr-FR", { weekday: "short" })).map((j, i) => <span key={i}>{j}</span>)}
              </div>
            </Carte>
          )}
        </div>

        <div className="space-y-6">
          <Carte className="p-5">
            <h3 className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4 text-ambre" /> À traiter</h3>
            {alertes.length ? (
              <ul className="mt-3 space-y-3">
                {alertes.map((a) => (
                  <li key={a.texte} className="rounded-xl bg-ecume/70 p-3 text-[13px]">
                    <p>{a.texte}</p>
                    <Link href={a.lien} className="mt-1.5 inline-flex items-center gap-1 font-medium text-lagon-fonce hover:underline">{a.action} <ArrowRight className="size-3" /></Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gris">Rien à signaler. Tout fonctionne.</p>
            )}
          </Carte>

          <Carte className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-medium"><Bot className="size-4 text-lagon-fonce" /> Dernières actions de l&apos;agent</h3>
            </div>
            {etat.actions.length ? (
              <ul className="mt-3 space-y-3">
                {etat.actions.slice(0, 3).map((a) => (
                  <li key={a.id} className="text-[13px]">
                    <p className="font-medium">{a.titre}</p>
                    <p className="text-gris">{a.cible} · {depuis(a.date)}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-gris">Aucune action pour l&apos;instant.</p>}
            <LienBouton href="/app/agent" variante="secondaire" taille="sm" className="mt-4 w-full">Ouvrir l&apos;agent</LienBouton>
          </Carte>

          <Carte className="p-5">
            <h3 className="font-medium">Raccourcis</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
              {[
                [Globe, "Acheter un domaine", "/app/domaines"],
                [Mail, "Créer une adresse", "/app/emails"],
                [Cpu, "Lancer un VPS", "/app/vps"],
                [Wand2, "Créateur IA", "/app/createur"],
              ].map(([I, l, h]) => {
                const Icone = I as typeof Globe;
                return (
                  <Link key={l as string} href={h as string} className="flex flex-col gap-2 rounded-xl border border-sable p-3 transition hover:border-encre/25">
                    <Icone className="size-4 text-lagon-fonce" /> {l as string}
                  </Link>
                );
              })}
            </div>
          </Carte>

          {etat.sites.length > 0 && (
            <Carte className="p-5">
              <h3 className="flex items-center gap-2 font-medium"><Leaf className="size-4 text-lagon-fonce" /> Empreinte estimée</h3>
              <p className="titre mt-2 text-2xl">{(Math.round(etat.sites.reduce((t, s) => t + s.co2gParVisite * s.visites7j.reduce((a, b) => a + b, 0), 0) / 7 * 30 / 1000 * 10) / 10).toLocaleString("fr-FR")} kg CO₂e<span className="text-sm font-normal text-gris"> / mois</span></p>
              <p className="mt-1 text-[13px] text-gris">Activer le cache sur le blog réduirait ce chiffre d&apos;environ 35 %.</p>
            </Carte>
          )}
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <VueEnsemble />
    </Suspense>
  );
}
