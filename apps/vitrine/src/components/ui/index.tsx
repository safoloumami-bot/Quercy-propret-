import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

export { clsx as cx };

export function Logo({ clair = false, className }: { clair?: boolean; className?: string }) {
  // clair = logo pour fond sombre (lettres crème). Fichiers d'origine dans /public/marque.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={clair ? "/marque/sebt-logo-sombre.svg" : "/marque/sebt-logo-clair.svg"}
      alt="sebt"
      width={71}
      height={28}
      className={clsx("h-7 w-auto shrink-0", className)}
    />
  );
}

type Variante = "primaire" | "lagon" | "secondaire" | "fantome" | "clair" | "danger" | "nuit" | "fantomeNuit";

const variantes: Record<Variante, string> = {
  primaire: "bg-encre text-ecume hover:bg-encre-3",
  lagon: "bg-lagon text-encre hover:brightness-95",
  secondaire: "bg-white text-encre ring-1 ring-sable hover:ring-encre/30",
  fantome: "text-encre hover:bg-encre/5",
  clair: "bg-ecume text-encre hover:bg-white",
  danger: "bg-corail text-white hover:brightness-95",
  // Site public (fond sombre)
  nuit: "bg-creme/[0.06] text-creme ring-1 ring-creme/12 hover:bg-creme/10",
  fantomeNuit: "text-creme/85 hover:bg-creme/[0.06] hover:text-creme",
};

const tailles = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
  xl: "h-[52px] px-7 text-base gap-2",
};

interface BoutonProps extends ComponentProps<"button"> {
  variante?: Variante;
  taille?: keyof typeof tailles;
}

export function Bouton({ variante = "primaire", taille = "md", className, ...props }: BoutonProps) {
  return (
    <button
      className={clsx(
        "inline-flex cursor-pointer items-center justify-center rounded-[10px] font-medium whitespace-nowrap transition-[background-color,color,box-shadow,filter,transform] duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagon active:scale-[0.98]",
        variantes[variante],
        tailles[taille],
        className,
      )}
      {...props}
    />
  );
}

export function LienBouton({
  href,
  variante = "primaire",
  taille = "md",
  className,
  children,
}: {
  href: string;
  variante?: Variante;
  taille?: keyof typeof tailles;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center justify-center rounded-[10px] font-medium whitespace-nowrap transition-[background-color,color,box-shadow,filter,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagon active:scale-[0.98]",
        variantes[variante],
        tailles[taille],
        className,
      )}
    >
      {children}
    </Link>
  );
}

const tons = {
  neutre: "bg-encre/5 text-encre/70",
  lagon: "bg-lagon-pale text-lagon-fonce",
  corail: "bg-corail-pale text-[#b8391c]",
  ambre: "bg-[#fdf0d2] text-[#8a5a00]",
  sombre: "bg-encre text-ecume",
};

export function Pastille({ ton = "neutre", children, className }: { ton?: keyof typeof tons; children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap", tons[ton], className)}>
      {children}
    </span>
  );
}

export function Carte({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div className={clsx("rounded-2xl border border-sable bg-white", className)} {...props}>
      {children}
    </div>
  );
}

export function Champ({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={clsx(
        "h-10 w-full rounded-xl border border-sable bg-white px-3 text-sm outline-none transition placeholder:text-gris/70 focus:border-encre/40 focus:ring-4 focus:ring-lagon/20",
        className,
      )}
      {...props}
    />
  );
}

export function Etiquette({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-encre/80">
      {children}
    </label>
  );
}

export function Interrupteur({ actif, onChange, label }: { actif: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={label}
      onClick={() => onChange(!actif)}
      className={clsx("relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition", actif ? "bg-lagon" : "bg-sable")}
    >
      <span className={clsx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]", actif ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function Point({ statut }: { statut: "ok" | "attente" | "erreur" | "arret" }) {
  const c = { ok: "bg-lagon", attente: "bg-ambre", erreur: "bg-corail", arret: "bg-gris/50" }[statut];
  return (
    <span className="relative inline-flex size-2">
      {statut === "attente" && <span className={clsx("absolute inset-0 animate-ping rounded-full opacity-70", c)} />}
      <span className={clsx("relative inline-flex size-2 rounded-full", c)} />
    </span>
  );
}

export function Sparkline({ valeurs, couleur = "#c9a97c", hauteur = 36 }: { valeurs: number[]; couleur?: string; hauteur?: number }) {
  if (valeurs.length < 2) return null;
  const max = Math.max(...valeurs, 1);
  const min = Math.min(...valeurs) * 0.8;
  const w = 120;
  const pts = valeurs.map((v, i) => [(i / (valeurs.length - 1)) * w, hauteur - ((v - min) / (max - min || 1)) * (hauteur - 4) - 2]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x!.toFixed(1)},${y!.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${hauteur}`} className="w-full" style={{ height: hauteur }} preserveAspectRatio="none" aria-hidden>
      <path d={`${d} L${w},${hauteur} L0,${hauteur} Z`} fill={couleur} opacity="0.12" />
      <path d={d} fill="none" stroke={couleur} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Jauge({ valeur, max, ton = "lagon", reserve = false }: { valeur: number; max: number; ton?: "lagon" | "corail" | "ambre"; reserve?: boolean }) {
  const p = Math.min(100, Math.round((valeur / max) * 100));
  // reserve : la jauge mesure ce qui reste (crédits), donc plein = bien
  const c = reserve ? (p < 10 ? "bg-corail" : p < 25 ? "bg-ambre" : "bg-lagon") : p > 90 ? "bg-corail" : p > 75 ? "bg-ambre" : { lagon: "bg-lagon", corail: "bg-corail", ambre: "bg-ambre" }[ton];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-encre/8">
      <div className={clsx("h-full rounded-full", c)} style={{ width: `${p}%` }} />
    </div>
  );
}

/** Tampon de statut, comme sur un bon d'intervention : contour à l'encre, légèrement de travers. */
export function Tampon({ ton = "ok", children, className }: { ton?: "ok" | "attente" | "retard"; children: ReactNode; className?: string }) {
  const c = { ok: "border-[#2d6a3e]/55 text-[#2d6a3e]", attente: "border-[#7a5a1c]/55 text-[#7a5a1c]", retard: "border-[#a3361f]/55 text-[#a3361f]" }[ton];
  return (
    <span className={clsx("inline-block -rotate-2 rounded-[4px] border px-1.5 py-px font-mono text-[10.5px] leading-4 whitespace-nowrap", c, className)}>
      {children}
    </span>
  );
}
