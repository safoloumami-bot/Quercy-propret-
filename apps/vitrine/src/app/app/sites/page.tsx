"use client";

import { useState } from "react";
import { Layers, Search } from "lucide-react";
import { TitrePage } from "@/components/app/Coque";
import { CarteSite, Vide, infosType } from "@/components/app/commun";
import { LienBouton, cx } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { TypeSite } from "@/lib/types";

export default function Sites() {
  const { etat } = useStore();
  const [filtre, setFiltre] = useState<TypeSite | "tous">("tous");
  const [q, setQ] = useState("");
  const liste = etat.sites.filter((s) => (filtre === "tous" || s.type === filtre) && (s.nom + s.domaine).toLowerCase().includes(q.toLowerCase()));
  const types = Array.from(new Set(etat.sites.map((s) => s.type)));

  return (
    <>
      <TitrePage titre="Sites & applications" description="Tout ce que vous hébergez chez sebt." actions={<LienBouton href="/app/sites/nouveau">Nouveau projet</LienBouton>} />
      {etat.sites.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(["tous", ...types] as const).map((t) => (
              <button key={t} onClick={() => setFiltre(t)} className={cx("cursor-pointer rounded-full px-3.5 py-1.5 text-[13px] transition", filtre === t ? "bg-encre text-ecume" : "bg-white text-encre/70 ring-1 ring-sable hover:text-encre")}>
                {t === "tous" ? `Tous (${etat.sites.length})` : infosType[t].label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gris" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" className="h-9 w-64 rounded-full border border-sable bg-white pr-3 pl-9 text-sm outline-none focus:border-encre/30" />
          </div>
        </div>
      )}
      {liste.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{liste.map((s) => <CarteSite key={s.id} site={s} />)}</div>
      ) : (
        <Vide icone={Layers} titre={etat.sites.length ? "Aucun résultat" : "Aucun projet"} texte="Créez un site avec l'IA, installez WordPress ou déployez votre code." action={<LienBouton href="/app/sites/nouveau">Créer un projet</LienBouton>} />
      )}
    </>
  );
}
