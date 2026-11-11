import { CalendarDays, Check, FileText, Hammer, Home, MessageCircle, Phone, Ruler, Star, TreePine } from "lucide-react";
import { cx } from "@/components/ui";

// Exemple de réalisation complète pour une entreprise fictive, « Atelier Martin », menuiserie
// sur mesure : un logo qui raconte le métier, un site, une appli client et des supports, tous
// aux mêmes couleurs. Sert d'illustration (ce n'est pas un client réel) : tout est dessiné en
// HTML et SVG, sans image à charger.

const vert = "#1f3d2e";
const vertClair = "#2f5a44";
const bois = "#c98f52";
const lin = "#f6f0e4";
const encre = "#18241d";

/** Le logo : un M taillé comme deux pignons de toit, posé sur une planche. */
export function LogoExemple({ taille = 40, fond = vert, trait = lin, accent = bois }: { taille?: number; fond?: string; trait?: string; accent?: string }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 64 64" role="img" aria-label="Logo Atelier Martin">
      <rect width="64" height="64" rx="15" fill={fond} />
      <path d="M14 43 V25 L24 15 L32 25 L40 15 L50 25 V43" fill="none" stroke={trait} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 50 H52" stroke={accent} strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="38" r="2.6" fill={accent} />
    </svg>
  );
}

function NomMarque({ clair = false, petit = false }: { clair?: boolean; petit?: boolean }) {
  return (
    <span className="leading-none whitespace-nowrap">
      <span className={cx("block font-semibold tracking-[-0.02em]", petit ? "text-[11px]" : "text-[15px]")} style={{ color: clair ? lin : encre }}>
        Atelier Martin
      </span>
      <span className={cx("mt-1 block uppercase", petit ? "text-[6.5px] tracking-[0.16em]" : "text-[8.5px] tracking-[0.18em]")} style={{ color: clair ? "rgba(246,240,228,0.65)" : "#6c7a70" }}>
        Menuiserie sur mesure
      </span>
    </span>
  );
}

/** Photo de substitution : un intérieur en bois, dessiné (plan de travail, étagères, lumière). */
function SceneAtelier({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id="mur" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a6a51" />
          <stop offset="1" stopColor="#1b3427" />
        </linearGradient>
        <linearGradient id="chene" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d9a468" />
          <stop offset="1" stopColor="#b57a3f" />
        </linearGradient>
        <radialGradient id="lampe" cx="0.72" cy="0.2" r="0.6">
          <stop offset="0" stopColor="#ffe9c2" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffe9c2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#mur)" />
      {/* Étagères et objets */}
      <rect x="28" y="52" width="150" height="7" rx="2" fill="url(#chene)" />
      <rect x="28" y="104" width="150" height="7" rx="2" fill="url(#chene)" />
      <rect x="42" y="22" width="16" height="30" rx="3" fill="#f6f0e4" opacity="0.9" />
      <rect x="64" y="30" width="12" height="22" rx="3" fill="#c98f52" />
      <circle cx="108" cy="40" r="12" fill="#f6f0e4" opacity="0.75" />
      <rect x="136" y="26" width="26" height="26" rx="4" fill="#132a1f" />
      <rect x="40" y="76" width="44" height="28" rx="4" fill="#132a1f" />
      <rect x="94" y="82" width="14" height="22" rx="3" fill="#f6f0e4" opacity="0.85" />
      <rect x="116" y="72" width="40" height="32" rx="16" fill="#c98f52" opacity="0.9" />
      {/* Suspension */}
      <path d="M288 0 V44" stroke="#f6f0e4" strokeOpacity="0.5" strokeWidth="2" />
      <path d="M262 44 h52 l14 26 h-80 z" fill="#f6f0e4" opacity="0.92" />
      <rect width="400" height="240" fill="url(#lampe)" />
      {/* Plan de travail et façades */}
      <rect x="0" y="150" width="400" height="14" fill="url(#chene)" />
      <rect x="0" y="164" width="400" height="76" fill="#254a38" />
      {[20, 116, 212, 308].map((x) => (
        <g key={x}>
          <rect x={x} y="174" width="84" height="56" rx="4" fill="#2f5a44" />
          <rect x={x + 34} y="182" width="16" height="4" rx="2" fill="#c98f52" />
        </g>
      ))}
      {/* Sur le plan : planche, bol, plante */}
      <rect x="204" y="138" width="70" height="12" rx="4" fill="#8a5a2c" />
      <path d="M300 150 q0 -22 24 -22 q24 0 24 22 z" fill="#f6f0e4" />
      <path d="M362 150 v-34 M362 128 q-16 -8 -14 -26 q16 6 14 26 M362 122 q16 -10 12 -28 q-16 8 -12 28" stroke="#9ed1ae" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Le site : accueil complet (menu, accroche, visuel, prestations, avis, demande de devis). */
export function SiteExemple({ className }: { className?: string }) {
  const prestations = [
    [Home, "Cuisines", "Chêne, noyer ou frêne, au millimètre."],
    [Ruler, "Dressings", "Du sol au plafond, sous pente comprise."],
    [Hammer, "Escaliers", "Création et rénovation, pose incluse."],
  ] as const;
  return (
    <div className={cx("overflow-hidden rounded-2xl border border-creme/10 bg-nuit-2 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)]", className)} aria-hidden>
      <div className="flex items-center gap-3 border-b border-creme/[0.08] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-creme/15" />
          <span className="size-2.5 rounded-full bg-creme/15" />
          <span className="size-2.5 rounded-full bg-creme/15" />
        </div>
        <div className="flex-1 rounded-md bg-creme/[0.05] px-3 py-1 font-mono text-[11px] text-taupe">atelier-martin.fr</div>
      </div>
      <div style={{ background: lin, color: encre }}>
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="flex items-center gap-2.5">
            <LogoExemple taille={30} />
            <NomMarque petit />
          </span>
          <span className="hidden items-center gap-4 text-[10.5px] font-medium sm:flex" style={{ color: "#4b5a50" }}>
            <span>Réalisations</span>
            <span>Prestations</span>
            <span>L&apos;atelier</span>
            <span className="rounded-full px-3 py-1.5 text-[10.5px]" style={{ background: vert, color: lin }}>Demander un devis</span>
          </span>
        </div>
        <div className="grid gap-5 px-5 pt-3 pb-6 sm:grid-cols-[1.05fr_1fr] sm:items-center">
          <div>
            <p className="text-[9px] font-semibold tracking-[0.18em] uppercase" style={{ color: bois }}>Cahors et le Lot · depuis 1998</p>
            <p className="mt-2.5 text-[25px] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-[29px]">
              Des meubles faits pour votre maison, <span style={{ color: vertClair }}>pas pour un catalogue.</span>
            </p>
            <p className="mt-3 max-w-[30ch] text-[11.5px] leading-relaxed" style={{ color: "#4b5a50" }}>
              Cuisines, dressings et escaliers dessinés avec vous, fabriqués dans notre atelier et posés par nos soins.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <span className="rounded-full px-4 py-2 text-[11px] font-medium" style={{ background: vert, color: lin }}>Demander un devis gratuit</span>
              <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: vert }}>
                <Phone className="size-3.5" /> Être rappelé
              </span>
            </div>
            <p className="mt-4 flex items-center gap-1 text-[10px]" style={{ color: "#4b5a50" }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="size-3" style={{ color: bois, fill: bois }} />
              ))}
              <span className="ml-1.5">Garantie 10 ans sur chaque pose</span>
            </p>
          </div>
          <div className="relative">
            <SceneAtelier className="aspect-[5/3.4] w-full rounded-xl" />
            <div className="absolute -bottom-3 left-3 flex items-center gap-2 rounded-lg px-3 py-2 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)]" style={{ background: "#fffdf8" }}>
              <TreePine className="size-4" style={{ color: vertClair }} />
              <span className="text-[9.5px] leading-tight">
                <span className="block font-semibold">Bois des forêts du Sud-Ouest</span>
                <span style={{ color: "#6c7a70" }}>Chêne certifié PEFC</span>
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5 px-5 pb-5">
          {prestations.map(([Icone, titre, texte]) => (
            <div key={titre} className="rounded-xl p-3" style={{ background: "#fffdf8", boxShadow: "inset 0 0 0 1px #e6dcc8" }}>
              <span className="grid size-7 place-items-center rounded-lg" style={{ background: "#e4efe6" }}>
                <Icone className="size-3.5" style={{ color: vert }} />
              </span>
              <p className="mt-2 text-[11.5px] font-semibold">{titre}</p>
              <p className="mt-0.5 hidden text-[9.5px] leading-snug sm:block" style={{ color: "#6c7a70" }}>{texte}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-3.5" style={{ background: vert, color: lin }}>
          <span className="text-[11px]">
            <span className="font-semibold">Un projet ?</span> <span className="opacity-75">Réponse sous 48 h, devis gratuit.</span>
          </span>
          <span className="shrink-0 rounded-full px-3.5 py-1.5 text-[10.5px] font-medium" style={{ background: bois, color: encre }}>Prendre rendez-vous</span>
        </div>
      </div>
    </div>
  );
}

/** L'appli client : suivi du chantier, rendez-vous, devis et factures, à ses couleurs. */
export function AppliExemple({ className }: { className?: string }) {
  const etapes = [
    ["Prise de mesures", "Fait le 28 oct.", "fait"],
    ["Fabrication à l'atelier", "En cours · 70 %", "cours"],
    ["Pose chez vous", "Jeu. 14 nov.", "avenir"],
  ] as const;
  return (
    <div className={cx("w-[232px] rounded-[38px] bg-black p-[7px] shadow-[0_50px_110px_-25px_rgba(0,0,0,0.95)] ring-1 ring-creme/15", className)} aria-hidden>
      <div className="overflow-hidden rounded-[32px]" style={{ background: lin, color: encre }}>
        <div className="px-4 pt-3 pb-5" style={{ background: vert, color: lin }}>
          <div className="flex items-center justify-between text-[9px] font-medium opacity-80">
            <span>9:41</span>
            <span className="h-[14px] w-[58px] rounded-full bg-black/60" />
            <span>5G</span>
          </div>
          <div className="mt-3.5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <LogoExemple taille={26} fond={lin} trait={vert} />
              <NomMarque clair petit />
            </span>
            <span className="grid size-6 place-items-center rounded-full bg-white/10 text-[9px] font-semibold">CL</span>
          </div>
          <p className="mt-4 text-[10px] opacity-70">Bonjour Claire,</p>
          <p className="text-[15px] leading-tight font-semibold tracking-[-0.02em]">Votre cuisine en chêne avance bien.</p>
        </div>
        <div className="-mt-2.5 space-y-2 px-3 pb-2.5">
          <div className="rounded-2xl p-3 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.35)]" style={{ background: "#fffdf8" }}>
            <div className="flex items-center justify-between">
              <p className="text-[10.5px] font-semibold">Suivi du chantier</p>
              <p className="text-[9px] font-medium" style={{ color: vertClair }}>Étape 2 sur 3</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "#e6dcc8" }}>
              <div className="h-full w-[62%] rounded-full" style={{ background: bois }} />
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {etapes.map(([t, d, etat]) => (
                <li key={t} className="flex items-center gap-2">
                  <span
                    className="grid size-4 shrink-0 place-items-center rounded-full"
                    style={{ background: etat === "fait" ? vert : etat === "cours" ? bois : "transparent", boxShadow: etat === "avenir" ? "inset 0 0 0 1.5px #c9bfa9" : undefined }}
                  >
                    {etat === "fait" && <Check className="size-2.5" style={{ color: lin }} />}
                  </span>
                  <span className="flex-1 text-[10px] font-medium">{t}</span>
                  <span className="text-[8.5px]" style={{ color: "#6c7a70" }}>{d}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2.5 rounded-2xl p-3" style={{ background: "#e4efe6" }}>
            <span className="grid size-8 shrink-0 place-items-center rounded-xl" style={{ background: vert }}>
              <CalendarDays className="size-4" style={{ color: lin }} />
            </span>
            <span className="flex-1 leading-tight">
              <span className="block text-[10px] font-semibold">Pose · jeudi 14 novembre</span>
              <span className="text-[9px]" style={{ color: "#4b5a50" }}>8 h 30, avec Julien et Samir</span>
            </span>
            <span className="rounded-full px-2 py-1 text-[8.5px] font-medium" style={{ background: "#fffdf8" }}>Déplacer</span>
          </div>
          <div className="rounded-2xl p-3" style={{ background: "#fffdf8" }}>
            {[
              ["Devis DE-0087", "Signé en ligne", vertClair],
              ["Facture d'acompte", "Payée · 2 400 €", vertClair],
              ["Facture de solde", "À la pose", "#6c7a70"],
            ].map(([t, e, c], i) => (
              <div key={t} className={cx("flex items-center gap-2 py-1.5", i > 0 && "border-t")} style={{ borderColor: "#eee5d3" }}>
                <FileText className="size-3.5 shrink-0" style={{ color: bois }} />
                <span className="flex-1 text-[10px] font-medium">{t}</span>
                <span className="text-[8.5px] font-medium" style={{ color: c }}>{e}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 border-t px-2 pt-2 pb-3 text-center text-[7.5px] font-medium" style={{ borderColor: "#e6dcc8", background: "#fffdf8", color: "#8a968d" }}>
          {[
            [Home, "Accueil", true],
            [Hammer, "Chantier", false],
            [FileText, "Documents", false],
            [MessageCircle, "Messages", false],
          ].map(([Icone, l, actif]) => {
            const I = Icone as typeof Home;
            return (
              <span key={l as string} className="flex flex-col items-center gap-1" style={actif ? { color: vert } : undefined}>
                <I className="size-4" />
                {l as string}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** L'identité : le logo et ses déclinaisons, les couleurs, la typographie, la carte de visite. */
export function IdentiteExemple({ className }: { className?: string }) {
  const couleurs = [
    [vert, "Vert forêt"],
    [bois, "Chêne"],
    [lin, "Lin"],
    [encre, "Encre"],
  ] as const;
  return (
    <div className={cx("rounded-[26px] border border-creme/10 bg-[linear-gradient(160deg,#1d1813_0%,#110e0b_70%)] p-5 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.95)]", className)} aria-hidden>
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-taupe-2">Identité visuelle · Atelier Martin</p>
        <p className="rounded-full border border-creme/10 px-2 py-0.5 text-[10px] text-taupe-2">Exemple</p>
      </div>
      <div className="mt-4 grid grid-cols-[1.25fr_1fr] gap-2">
        <div className="flex items-center justify-center gap-3 rounded-xl px-4 py-6" style={{ background: lin }}>
          <LogoExemple taille={46} />
          <NomMarque />
        </div>
        <div className="grid grid-rows-2 gap-2">
          <div className="grid place-items-center rounded-xl" style={{ background: vert }}>
            <LogoExemple taille={30} fond="transparent" />
          </div>
          <div className="grid place-items-center rounded-xl" style={{ background: bois }}>
            <LogoExemple taille={30} fond="transparent" trait={encre} accent={lin} />
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-taupe">
        Un M taillé comme deux pignons de toit, posé sur une planche : la maison et le bois, en un seul trait.
      </p>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {couleurs.map(([c, n]) => (
          <div key={n}>
            <span className="block h-8 rounded-md ring-1 ring-creme/10" style={{ background: c }} />
            <p className="mt-1 text-[9.5px] text-taupe-2">{n}</p>
          </div>
        ))}
      </div>
      {/* Carte de visite, recto et verso */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="flex aspect-[1.7] flex-col justify-between rounded-lg p-3" style={{ background: vert }}>
          <LogoExemple taille={22} fond={lin} trait={vert} />
          <NomMarque clair petit />
        </div>
        <div className="flex aspect-[1.7] flex-col justify-between rounded-lg p-3" style={{ background: lin, color: encre }}>
          <span className="leading-tight">
            <span className="block text-[10px] font-semibold">Paul Martin</span>
            <span className="text-[7.5px]" style={{ color: "#6c7a70" }}>Menuisier ébéniste</span>
          </span>
          <span className="text-[7.5px] leading-snug" style={{ color: "#4b5a50" }}>
            05 00 00 00 00
            <br />
            atelier-martin.fr
          </span>
        </div>
      </div>
    </div>
  );
}
