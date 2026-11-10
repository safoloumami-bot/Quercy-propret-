import type { Motif } from "@/lib/generateur";
import { melanger } from "@/lib/couleurs";

// Visuel génératif qui remplace les photos tant que le client n'a pas ajouté les siennes :
// un dégradé « photographique » flou aux couleurs du site, du grain, et une illustration au
// trait propre au métier. Déterministe : même graine, même image (pas d'écart au rendu serveur).

function hasard(graine: number) {
  let t = graine + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Trait({ motif, couleur, variante }: { motif: Motif; couleur: string; variante: number }) {
  const p = { fill: "none", stroke: couleur, strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const v = variante % 4;
  switch (motif) {
    case "assiette":
      return (
        <g {...p} transform={`translate(${400 + (v - 1.5) * 40} 300)`}>
          <circle r="150" />
          <circle r="112" opacity="0.6" />
          <path d="M-215 -110 v220 M-232 -110 v60 q17 22 34 0 v-60" />
          <path d="M215 -110 q30 60 0 120 v100" />
          {v % 2 === 0 ? <path d="M-50 -10 q50 -60 100 0 q-50 40 -100 0z" opacity="0.8" /> : <circle r="38" opacity="0.8" />}
        </g>
      );
    case "pain":
      return (
        <g {...p} transform={`translate(400 ${320 - v * 8}) rotate(${-8 + v * 5})`}>
          <path d="M-230 20 q0 -120 230 -120 q230 0 230 120 q0 50 -230 50 q-230 0 -230 -50z" />
          <path d="M-120 -60 q30 40 0 80 M-30 -80 q30 45 0 95 M60 -80 q30 45 0 95 M150 -60 q30 40 0 80" opacity="0.75" />
          <path d="M-260 110 h520" opacity="0.5" />
        </g>
      );
    case "arche":
      return (
        <g {...p}>
          <path d={`M${250 + v * 10} 520 v-230 a150 150 0 0 1 300 0 v230`} />
          <path d={`M${290 + v * 10} 520 v-220 a110 110 0 0 1 220 0 v220`} opacity="0.55" />
          <circle cx={560 - v * 20} cy="160" r="34" opacity="0.8" />
          <path d="M180 520 h440" opacity="0.5" />
        </g>
      );
    case "outil":
      return (
        <g {...p}>
          <path d="M210 470 v-170 l190 -140 l190 140 v170 z" />
          <path d="M350 470 v-100 h100 v100" opacity="0.7" />
          <path d="M250 330 h300 M250 390 h300" opacity="0.35" />
          <path d={`M${590 - v * 10} 210 l70 -70 m-20 -20 a40 40 0 1 0 40 40`} opacity="0.85" />
          <path d="M150 470 h500" opacity="0.5" />
        </g>
      );
    case "elan":
      return (
        <g {...p}>
          <path d="M140 470 C 300 450, 380 300, 660 140" />
          <path d="M140 500 C 320 480, 420 340, 680 200" opacity="0.55" />
          <path d="M600 140 h60 v60" />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${200 + i * 110} 540 v-${60 + i * 50 + v * 6}`} strokeWidth={14} opacity={0.35 + i * 0.12} />
          ))}
        </g>
      );
    case "objet":
      return (
        <g {...p} transform={`translate(${(v - 1.5) * 30} 0)`}>
          <path d="M150 470 h500" opacity="0.5" />
          <path d="M220 470 v-150 q0 -30 30 -30 h60 q30 0 30 30 v150" />
          <path d="M260 290 v-40 h40 v40" opacity="0.7" />
          <path d="M400 470 q-40 -60 0 -150 q40 90 0 150z" />
          <path d="M490 470 v-110 h120 v110 M610 380 q40 0 40 30 q0 30 -40 30" />
        </g>
      );
    case "cadre":
      // Un paysage abstrait : soleil, horizon et reliefs, comme une photo floue
      return (
        <g {...p}>
          <circle cx={300 + v * 70} cy={250 - v * 10} r={70 + v * 8} opacity="0.9" />
          <path d="M60 400 h680" opacity="0.6" />
          <path d={`M60 470 C 220 ${410 - v * 10}, 330 ${430 + v * 6}, 470 400 S 680 ${380 - v * 8}, 740 420`} />
          <path d="M60 520 C 260 490, 460 530, 740 495" opacity="0.5" />
        </g>
      );
    case "fleur":
      return (
        <g {...p} transform={`translate(${(v - 1.5) * 40} 0)`}>
          {[0, 1, 2].map((i) => {
            const x = 300 + i * 100;
            const y = 230 - (i % 2) * 50;
            return (
              <g key={i} opacity={1 - i * 0.12}>
                <path d={`M${x} ${y + 30} C ${x - 10} ${y + 140}, ${x + 30} ${y + 200}, 400 480`} />
                {[0, 72, 144, 216, 288].map((a) => (
                  <ellipse key={a} cx={x} cy={y - 22} rx="14" ry="26" transform={`rotate(${a} ${x} ${y})`} />
                ))}
                <circle cx={x} cy={y} r="9" />
              </g>
            );
          })}
          <path d="M340 480 h120 l-15 60 h-90 z" opacity="0.8" />
        </g>
      );
    case "colonne":
      return (
        <g {...p}>
          <path d="M200 200 l200 -80 l200 80 z" />
          <path d="M200 210 h400 M200 480 h400" />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${250 + i * 100} 230 v230`} strokeWidth={10} opacity={0.6} />
          ))}
        </g>
      );
    default:
      return (
        <g {...p}>
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M100 ${220 + i * 50} c100 -${40 + v * 6} 200 ${40 + v * 6} 300 0 s200 -${40 + v * 6} 300 0`} opacity={1 - i * 0.16} />
          ))}
        </g>
      );
  }
}

export function Visuel({
  palette,
  motif = "vague",
  graine = 0,
  sombre = false,
  className,
  style,
}: {
  palette: { fond: string; texte: string; accent: string; doux: string };
  motif?: Motif;
  graine?: number;
  /** Version assombrie, pour poser du texte clair par-dessus. */
  sombre?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const r = hasard(graine * 97 + motif.length * 13);
  const id = `v${graine}-${motif}${sombre ? "s" : ""}`;
  const base = sombre ? melanger(palette.accent, "#0b0a09", 0.62) : melanger(palette.doux, palette.accent, 0.18);
  const taches = [
    { c: palette.accent, o: sombre ? 0.75 : 0.85 },
    { c: melanger(palette.accent, "#ffffff", 0.45), o: 0.8 },
    { c: melanger(palette.accent, "#000000", 0.35), o: 0.7 },
    { c: melanger(palette.doux, "#ffffff", 0.3), o: sombre ? 0.25 : 0.9 },
  ].map((t) => ({ ...t, x: 80 + r() * 640, y: 60 + r() * 480, rayon: 180 + r() * 220 }));
  const trait = sombre ? "rgba(255,255,255,0.4)" : melanger(palette.accent, "#ffffff", 0.82);

  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" className={className} style={style} aria-hidden>
      <defs>
        <filter id={`${id}-flou`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="70" />
        </filter>
        <filter id={`${id}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.16" />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="800" height="600" fill={base} />
      <g filter={`url(#${id}-flou)`}>
        {taches.map((t, i) => (
          <circle key={i} cx={t.x} cy={t.y} r={t.rayon} fill={t.c} opacity={t.o} />
        ))}
      </g>
      <Trait motif={motif} couleur={trait} variante={graine} />
      <rect width="800" height="600" filter={`url(#${id}-grain)`} />
    </svg>
  );
}
