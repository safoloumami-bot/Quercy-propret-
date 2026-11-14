"use client";

import Link from "next/link";
import { Wand2, FolderGit2 as Github, Box, FileCode2, Globe, ExternalLink } from "lucide-react";
import type { Site, TypeSite } from "@/lib/types";
import { Point, Pastille, Sparkline, cx } from "@/components/ui";
import { ApercuSite } from "@/components/ApercuSite";

export const infosType: Record<TypeSite, { label: string; icone: typeof Wand2 }> = {
  ia: { label: "Créateur IA", icone: Wand2 },
  wordpress: { label: "WordPress", icone: FileCode2 },
  git: { label: "Git", icone: Github },
  docker: { label: "Docker", icone: Box },
  statique: { label: "Statique", icone: Globe },
};

export function StatutSite({ statut }: { statut: Site["statut"] }) {
  const m = {
    en_ligne: { p: "ok" as const, t: "En ligne", ton: "lagon" as const },
    deploiement: { p: "attente" as const, t: "Déploiement…", ton: "ambre" as const },
    arrete: { p: "arret" as const, t: "Arrêté", ton: "neutre" as const },
    erreur: { p: "erreur" as const, t: "Erreur", ton: "corail" as const },
  }[statut];
  return (
    <Pastille ton={m.ton}>
      <Point statut={m.p} /> {m.t}
    </Pastille>
  );
}

export function Miniature({ site, className }: { site: Site; className?: string }) {
  if (site.genere)
    return (
      <div className={cx("pointer-events-none relative overflow-hidden", className)}>
        <div className="absolute top-0 left-0 w-[400%] origin-top-left scale-[0.25]">
          <ApercuSite site={site.genere} compact />
        </div>
      </div>
    );
  const I = infosType[site.type].icone;
  const fonds: Record<TypeSite, string> = {
    ia: "from-lagon/30 to-lagon-pale",
    wordpress: "from-[#21759b]/25 to-[#e6f1f6]",
    git: "from-encre/80 to-encre-3",
    docker: "from-[#1d63ed]/30 to-[#e8efff]",
    statique: "from-ambre/30 to-[#fdf5e3]",
  };
  return (
    <div className={cx("relative grid place-items-center overflow-hidden bg-gradient-to-br", fonds[site.type], className)}>
      <div className="absolute inset-x-6 top-6 space-y-2 opacity-40">
        <div className={cx("h-2 w-1/3 rounded-full", site.type === "git" ? "bg-ecume/40" : "bg-encre/25")} />
        <div className={cx("h-2 w-2/3 rounded-full", site.type === "git" ? "bg-ecume/25" : "bg-encre/15")} />
        <div className={cx("h-2 w-1/2 rounded-full", site.type === "git" ? "bg-ecume/25" : "bg-encre/15")} />
      </div>
      <I className={cx("relative size-8", site.type === "git" ? "text-lagon" : "text-encre/60")} />
    </div>
  );
}

export function CarteSite({ site }: { site: Site }) {
  const I = infosType[site.type].icone;
  const visites = site.visites7j.reduce((a, b) => a + b, 0);
  return (
    <Link href={`/app/sites/detail?id=${site.id}`} className="group block overflow-hidden rounded-2xl border border-sable bg-white transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-30px_rgba(31,27,22,0.45)]">
      <Miniature site={site} className="h-36 border-b border-sable" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{site.nom}</p>
            <p className="flex items-center gap-1 truncate text-[13px] text-gris">{site.domaine} <ExternalLink className="size-3 opacity-0 transition group-hover:opacity-100" /></p>
          </div>
          <StatutSite statut={site.statut} />
        </div>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="text-[12px] text-gris">
            <p className="flex items-center gap-1.5"><I className="size-3.5" /> {site.pile}</p>
            <p className="mt-1"><span className="font-medium text-encre">{visites.toLocaleString("fr-FR")}</span> visites · 7 j</p>
          </div>
          <div className="w-24"><Sparkline valeurs={site.visites7j} hauteur={28} /></div>
        </div>
      </div>
    </Link>
  );
}

export function Stat({ label, valeur, detail, icone: I }: { label: string; valeur: string; detail?: string; icone: typeof Wand2 }) {
  return (
    <div className="rounded-2xl border border-sable bg-white p-5">
      <div className="flex items-center justify-between text-[13px] text-gris">
        {label}
        <I className="size-4" />
      </div>
      <p className="titre mt-2 text-3xl">{valeur}</p>
      {detail && <p className="mt-1 text-[13px] text-gris">{detail}</p>}
    </div>
  );
}

export function Vide({ icone: I, titre, texte, action }: { icone: typeof Wand2; titre: string; texte: string; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-sable bg-white/50 px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-ecume"><I className="size-5 text-lagon-fonce" /></span>
      <p className="titre mt-4 text-lg">{titre}</p>
      <p className="mt-1 max-w-sm text-sm text-gris">{texte}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
