import Link from "next/link";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Logo } from "@/components/ui";

export function CadreAuth({ titre, sousTitre, children }: { titre: string; sousTitre: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/sites"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="titre text-3xl">{titre}</h1>
          <p className="mt-2 text-[15px] text-gris">{sousTitre}</p>
          <div className="mt-8">{children}</div>
        </div>
        <p className="text-xs text-gris">Démo : aucune donnée n&apos;est envoyée, tout reste dans votre navigateur.</p>
      </div>
      <div className="grain-sombre relative hidden overflow-hidden bg-encre p-12 text-ecume lg:flex lg:flex-col lg:justify-end">
        <svg viewBox="0 0 600 600" className="absolute -top-20 -right-24 w-[620px] opacity-60" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M0 ${120 + i * 45}c75 0 75-40 150-40s75 40 150 40 75-40 150-40 75 40 150 40`} fill="none" stroke={i % 3 === 0 ? "#c9a97c" : "#f5efe4"} strokeOpacity={i % 3 === 0 ? 0.7 : 0.12} strokeWidth="2" />
          ))}
        </svg>
        <div className="relative max-w-md">
          <p className="titre text-4xl leading-tight">Votre site en ligne avant la fin de votre café.</p>
          <ul className="mt-8 space-y-3 text-[15px] text-ecume/75">
            {["14 jours d'essai, sans carte bancaire", "Le même prix au renouvellement", "Migration de votre site existant offerte", "Données hébergées en Europe"].map((t) => (
              <li key={t} className="flex gap-3"><Check className="mt-0.5 size-4 text-lagon" />{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
