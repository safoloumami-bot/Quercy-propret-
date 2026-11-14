"use client";

import { useState } from "react";
import { Download, CreditCard, PiggyBank, Check, FileText } from "lucide-react";
import { TitrePage } from "@/components/app/Coque";
import { Bouton, Carte, Jauge, Pastille, cx } from "@/components/ui";
import { useStore, dateCourte } from "@/lib/store";
import { offresWeb, offresVps, euros } from "@/config/offres";

export default function Facturation() {
  const { etat, majCompte } = useStore();
  const [plafond, setPlafond] = useState(etat.compte.plafondMensuel);
  const offre = offresWeb.find((o) => o.id === etat.compte.offreId)!;
  const prixOffre = etat.compte.periode === "annuel" ? offre.prixAnnuel : offre.prixMensuel;
  const vps = etat.vps.reduce((t, v) => t + (offresVps.find((o) => o.id === v.offreId)?.prixMensuel ?? 0), 0);
  const estime = prixOffre + vps;

  return (
    <>
      <TitrePage titre="Facturation" description="Prix hors taxes. Ce que vous payez aujourd'hui est ce que vous paierez au renouvellement." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Carte className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gris">Offre actuelle</p>
              <p className="titre mt-1 text-3xl">{offre.nom} <span className="text-lg font-normal text-gris">· {etat.compte.periode}</span></p>
              <p className="mt-1 text-sm">{euros(prixOffre)}/mois · renouvelé au même prix</p>
            </div>
            <div className="inline-flex rounded-full border border-sable p-1">
              {(["mensuel", "annuel"] as const).map((p) => (
                <button key={p} onClick={() => majCompte({ periode: p })} className={cx("cursor-pointer rounded-full px-4 py-1.5 text-sm capitalize transition", etat.compte.periode === p ? "bg-encre text-ecume" : "text-gris")}>{p}</button>
              ))}
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {offresWeb.map((o) => (
              <button key={o.id} onClick={() => majCompte({ offreId: o.id })} className={cx("cursor-pointer rounded-2xl border p-4 text-left transition", o.id === offre.id ? "border-encre ring-2 ring-encre" : "border-sable hover:border-encre/30")}>
                <div className="flex items-center justify-between"><p className="font-medium">{o.nom}</p>{o.id === offre.id && <Check className="size-4 text-lagon-fonce" />}</div>
                <p className="mt-1 text-sm text-gris">{euros(etat.compte.periode === "annuel" ? o.prixAnnuel : o.prixMensuel)}/mois</p>
                <p className="mt-2 text-xs text-gris">{o.points[0]} · {o.creditsIA} crédits IA</p>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-gris">Changement immédiat, calculé au prorata. Aucuns frais pour passer à une offre inférieure.</p>
        </Carte>

        <Carte className="p-5">
          <p className="flex items-center gap-2 text-sm font-medium"><PiggyBank className="size-4 text-lagon-fonce" /> Plafond de dépenses</p>
          <p className="mt-1 text-[13px] text-gris">Aucune option, ressource ou recharge de crédits ne peut dépasser ce montant sans votre accord.</p>
          <p className="titre mt-4 text-3xl">{euros(plafond)}<span className="text-base font-normal text-gris"> / mois</span></p>
          <input type="range" min={10} max={300} step={5} value={plafond} onChange={(e) => setPlafond(+e.target.value)} onMouseUp={() => majCompte({ plafondMensuel: plafond })} onTouchEnd={() => majCompte({ plafondMensuel: plafond })} className="mt-3 w-full accent-[#c9a97c]" aria-label="Plafond mensuel" />
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-gris"><span>Estimé ce mois : {euros(estime)}</span><span>{Math.round((estime / plafond) * 100)} %</span></div>
            <Jauge valeur={estime} max={plafond} />
          </div>
        </Carte>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Carte className="p-5">
          <p className="flex items-center gap-2 text-sm font-medium"><CreditCard className="size-4" /> Moyen de paiement</p>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-ecume/70 p-3">
            <span className="grid h-8 w-12 place-items-center rounded-md bg-encre text-[10px] font-bold text-ecume">VISA</span>
            <div className="text-sm"><p>•••• 4242</p><p className="text-xs text-gris">Expire 09/28</p></div>
          </div>
          <div className="mt-3 flex gap-2">
            <Bouton variante="secondaire" taille="sm">Modifier</Bouton>
            <Bouton variante="fantome" taille="sm">Ajouter un prélèvement SEPA</Bouton>
          </div>
        </Carte>
        <Carte className="p-5 lg:col-span-2">
          <p className="text-sm font-medium">Détail du prochain prélèvement</p>
          <div className="mt-3 divide-y divide-sable text-sm">
            <div className="flex justify-between py-2"><span>Offre {offre.nom} ({etat.compte.periode})</span><span>{euros(prixOffre)}</span></div>
            {etat.vps.map((v) => { const o = offresVps.find((x) => x.id === v.offreId)!; return <div key={v.id} className="flex justify-between py-2"><span>{o.nom} · {v.nom}</span><span>{euros(o.prixMensuel)}</span></div>; })}
            <div className="flex justify-between py-2 font-medium"><span>Total HT</span><span>{euros(estime)}</span></div>
            <div className="flex justify-between py-2 text-gris"><span>TVA 20 %</span><span>{euros(estime * 0.2)}</span></div>
          </div>
        </Carte>
      </div>

      <h2 className="titre mt-10 mb-4 text-xl">Factures</h2>
      <Carte className="divide-y divide-sable">
        {etat.factures.length === 0 && <p className="p-6 text-sm text-gris">Aucune facture pendant l&apos;essai gratuit.</p>}
        {etat.factures.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5 text-sm">
            <FileText className="size-4 text-gris" />
            <span className="w-32 font-mono text-[13px]">{f.numero}</span>
            <span className="min-w-40 flex-1">{f.libelle}</span>
            <span className="text-gris">{dateCourte(f.date)}</span>
            <span className="w-24 text-right font-medium">{euros(f.montantHT)}</span>
            <Pastille ton="lagon">Payée</Pastille>
            <Bouton variante="fantome" taille="sm"><Download className="size-3.5" /> PDF</Bouton>
          </div>
        ))}
      </Carte>
      <p className="mt-3 text-xs text-gris">Factures électroniques au format Factur-X, transmissibles directement à votre plateforme de facturation.</p>
    </>
  );
}
