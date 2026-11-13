import { CalendarDays, Heart, Plus, ShoppingBag, Star, UserRound, UtensilsCrossed } from "lucide-react";
import { ApercuSite, policeTitres } from "@/components/ApercuSite";
import { cx } from "@/components/ui";
import { melanger, texteSur } from "@/lib/couleurs";
import { exemplesPrompts, genererSite, type SiteGenere } from "@/lib/generateur";
import { photoPlat, photosPour, urlPhoto } from "@/lib/photos";

// Un seul exemple pour tout le site : le restaurant que le créateur génère par défaut. Son
// site (le vrai rendu du générateur), l'appli de ses clients et son identité reprennent le
// même nom, les mêmes couleurs, la même police et les mêmes photos.

/** Le site d'exemple : exactement ce que produit le créateur pour la première description. */
export const siteExemple: SiteGenere = genererSite(exemplesPrompts[0] ?? "");

export function slugSite(nom: string) {
  return nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function marque(site: SiteGenere) {
  const { fond, texte, accent, doux } = site.palette;
  const police = policeTitres(site);
  return {
    fond,
    texte,
    accent,
    doux,
    surAccent: texteSur(accent, texte),
    discret: melanger(texte, fond, 0.42),
    ligne: melanger(texte, fond, 0.86),
    carte: melanger(fond, "#ffffff", 0.6),
    titres: { fontFamily: police.titres, fontWeight: police.poids, letterSpacing: police.interlettrage } as const,
  };
}

/** Le logo : le nom dans la police des titres, ponctué d'un point à la couleur de la marque. */
export function LogoExemple({ site, taille = 22, couleur, point }: { site: SiteGenere; taille?: number; couleur?: string; point?: string }) {
  const m = marque(site);
  return (
    <span role="img" aria-label={`Logo ${site.nom}`} className="inline-block leading-none whitespace-nowrap" style={{ ...m.titres, fontSize: taille, color: couleur ?? m.texte }}>
      {site.nom}
      <span style={{ color: point ?? m.accent }}>.</span>
    </span>
  );
}

/** Le sceau : l'initiale et le point, pour l'icône de l'appli et les petits formats. */
export function SceauExemple({ site, taille = 40, fond, couleur, point }: { site: SiteGenere; taille?: number; fond?: string; couleur?: string; point?: string }) {
  const m = marque(site);
  const initiales = site.nom.split(/\s+/).filter((mot) => mot.length > 2).map((mot) => mot.charAt(0)).join("").slice(0, 2) || site.nom.charAt(0);
  return (
    <span className="grid shrink-0 place-items-center rounded-[28%]" style={{ width: taille, height: taille, background: fond ?? m.accent }} aria-hidden>
      <span style={{ ...m.titres, fontSize: taille * 0.44, lineHeight: 1, color: couleur ?? m.surAccent }}>
        {initiales}
        <span style={{ color: point ?? couleur ?? m.surAccent, opacity: 0.7 }}>.</span>
      </span>
    </span>
  );
}

function Photo({ id, largeur = 640, className }: { id?: string; largeur?: number; className?: string }) {
  return <span className={cx("block bg-cover bg-center", className)} style={{ backgroundColor: "#d9cdb8", backgroundImage: id ? `url("${urlPhoto(id, largeur)}")` : undefined }} />;
}

/** Le site : le rendu du générateur, dans une fenêtre de navigateur. */
export function SiteExemple({ site, className }: { site: SiteGenere; className?: string }) {
  return (
    <div className={cx("overflow-hidden rounded-2xl border border-creme/10 bg-nuit-2 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)]", className)} aria-hidden>
      <div className="flex items-center gap-3 border-b border-creme/[0.08] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-creme/15" />
          <span className="size-2.5 rounded-full bg-creme/15" />
          <span className="size-2.5 rounded-full bg-creme/15" />
        </div>
        <div className="flex-1 rounded-md bg-creme/[0.05] px-3 py-1 font-mono text-[11px] text-taupe">{slugSite(site.nom)}.sebt.site</div>
      </div>
      <div className="relative max-h-[560px] overflow-hidden md:max-h-[640px]">
        <ApercuSite site={site} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-nuit-2 to-transparent" />
      </div>
    </div>
  );
}

/** L'appli des clients du même commerce : commander, réserver, cumuler des points. */
export function AppliExemple({ site, className }: { site: SiteGenere; className?: string }) {
  const m = marque(site);
  const serie = photosPour(site.secteur);
  const carte = site.sections.find((s) => s.type === "menu")?.items ?? [];
  const [duJour, ...suite] = carte;
  return (
    <div className={cx("w-[236px] rounded-[40px] bg-black p-[7px] shadow-[0_50px_110px_-25px_rgba(0,0,0,0.95)] ring-1 ring-creme/15", className)} aria-hidden>
      <div className="relative overflow-hidden rounded-[33px]" style={{ background: m.fond, color: m.texte }}>
        <div className="flex items-center justify-between px-5 pt-2.5 text-[9px] font-semibold">
          <span>12:08</span>
          <span className="h-[15px] w-[62px] rounded-full bg-black" />
          <span>5G</span>
        </div>
        <div className="flex items-center justify-between px-4 pt-3">
          <span>
            <span className="block text-[9px]" style={{ color: m.discret }}>Bonjour Léa</span>
            <LogoExemple site={site} taille={17} />
          </span>
          <span className="grid size-7 place-items-center rounded-full" style={{ background: m.carte, boxShadow: `inset 0 0 0 1px ${m.ligne}` }}>
            <ShoppingBag className="size-3.5" style={{ color: m.accent }} />
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-full p-1 text-center text-[9.5px] font-medium" style={{ background: m.doux, margin: "12px 16px 0" }}>
          <span className="rounded-full py-1.5" style={{ background: m.texte, color: m.fond }}>À emporter</span>
          <span className="py-1.5" style={{ color: m.discret }}>Réserver une table</span>
        </div>

        {duJour && (
          <div className="relative mx-4 mt-3 overflow-hidden rounded-2xl">
            <Photo id={photoPlat(duJour.titre) ?? serie?.hero} className="h-[92px] w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute right-3 bottom-2.5 left-3 flex items-end justify-between text-white">
              <span className="min-w-0">
                <span className="block text-[7.5px] tracking-[0.14em] uppercase opacity-85">{site.secteur === "Café" ? "À la une" : "Plat du jour"}</span>
                <span className="block text-[12.5px] leading-tight whitespace-nowrap" style={m.titres}>{duJour.titre}</span>
              </span>
              <span className="shrink-0 rounded-full px-2 py-1 text-[9.5px] font-semibold whitespace-nowrap" style={{ background: m.accent, color: m.surAccent }}>{duJour.prix}</span>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-baseline justify-between px-4">
          <p className="text-[12.5px]" style={m.titres}>La carte</p>
          <p className="text-[8.5px]" style={{ color: m.discret }}>Prêt en 20 min</p>
        </div>
        <div className="mt-1.5 space-y-1.5 px-4">
          {suite.slice(0, 2).map((it, i) => (
            <div key={it.titre} className="flex items-center gap-2.5 rounded-xl p-1.5" style={{ background: m.carte, boxShadow: `inset 0 0 0 1px ${m.ligne}` }}>
              <Photo id={photoPlat(it.titre)} largeur={200} className="size-11 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[10px] font-semibold">{it.titre}</span>
                <span className="block truncate text-[8px]" style={{ color: m.discret }}>{it.texte}</span>
                <span className="text-[9.5px] font-medium" style={{ color: m.accent }}>{it.prix}</span>
              </span>
              <span className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold" style={i === 0 ? { background: m.texte, color: m.fond } : { boxShadow: `inset 0 0 0 1px ${m.texte}`, color: m.texte }}>
                {i === 0 ? "1" : <Plus className="size-3" />}
              </span>
            </div>
          ))}
        </div>

        <div className="mx-4 mt-2 flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: m.doux }}>
          <Star className="size-3.5 shrink-0" style={{ color: m.accent, fill: m.accent }} />
          <span className="flex-1 text-[8.5px] leading-tight">
            <span className="block font-semibold">Carte de fidélité · 8 sur 10</span>
            <span style={{ color: m.discret }}>Encore 2 commandes, un dessert offert</span>
          </span>
        </div>

        <div className="mx-4 mt-2.5 flex items-center justify-between rounded-full px-4 py-2.5 text-[10px] font-medium shadow-[0_10px_22px_-10px_rgba(0,0,0,0.5)]" style={{ background: m.accent, color: m.surAccent }}>
          <span>Voir le panier · 1 article</span>
          <span className="font-semibold">{suite[0]?.prix}</span>
        </div>

        <div className="mt-2.5 grid grid-cols-4 border-t px-2 pt-2 pb-3 text-center text-[7.5px] font-medium" style={{ borderColor: m.ligne, background: m.carte, color: m.discret }}>
          {(
            [
              [UtensilsCrossed, "La carte", true],
              [CalendarDays, "Réserver", false],
              [Heart, "Fidélité", false],
              [UserRound, "Compte", false],
            ] as const
          ).map(([Icone, l, actif]) => (
            <span key={l} className="flex flex-col items-center gap-1" style={actif ? { color: m.accent } : undefined}>
              <Icone className="size-4" />
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** L'identité du même commerce : logo et déclinaisons, couleurs, polices, supports. */
export function IdentiteExemple({ site, className }: { site: SiteGenere; className?: string }) {
  const m = marque(site);
  const serie = photosPour(site.secteur);
  const couleurs = [
    [m.accent, "Couleur de marque"],
    [m.texte, "Encre"],
    [m.doux, "Sable"],
    [m.fond, "Papier"],
  ] as const;
  const nomPolice = /'([^']+?)(?: Variable)?'/.exec(m.titres.fontFamily)?.[1] ?? "Geist";
  return (
    <div className={cx("rounded-[26px] border border-creme/10 bg-[linear-gradient(160deg,#1d1813_0%,#110e0b_70%)] p-5 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.95)]", className)} aria-hidden>
      <p className="text-[12px] text-taupe-2">Identité visuelle · {site.nom}</p>
      <div className="mt-4 grid grid-cols-[1.5fr_1fr] gap-2">
        <div className="grid place-items-center rounded-xl px-3 py-8" style={{ background: m.fond }}>
          <LogoExemple site={site} taille={26} />
        </div>
        <div className="grid grid-rows-2 gap-2">
          <div className="grid place-items-center rounded-xl" style={{ background: m.texte }}>
            <LogoExemple site={site} taille={13} couleur={m.fond} />
          </div>
          <div className="grid place-items-center rounded-xl" style={{ background: m.doux }}>
            <SceauExemple site={site} taille={30} />
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-taupe">
        Le même logo, les mêmes couleurs et la même police sur le site, dans l&apos;appli et sur les supports imprimés.
      </p>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {couleurs.map(([c, n]) => (
          <div key={n}>
            <span className="block h-8 rounded-md ring-1 ring-creme/10" style={{ background: c }} />
            <p className="mt-1 text-[9px] leading-tight text-taupe-2">{n}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between rounded-lg border border-creme/[0.08] px-3 py-2.5 text-creme">
        <span className="text-[17px] whitespace-nowrap" style={m.titres}>{nomPolice}</span>
        <span className="text-[11px] whitespace-nowrap text-taupe">pour les titres</span>
      </div>
      {/* Supports : carte de fidélité et visuel pour les réseaux */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="flex aspect-[1.6] flex-col justify-between rounded-lg p-3" style={{ background: m.texte, color: m.fond }}>
          <LogoExemple site={site} taille={12} couleur={m.fond} />
          <span>
            <span className="flex gap-1">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className="size-2 rounded-full" style={{ background: i < 8 ? m.accent : melanger(m.fond, m.texte, 0.75) }} />
              ))}
            </span>
            <span className="mt-1.5 block text-[7.5px] opacity-70">Carte de fidélité</span>
          </span>
        </div>
        <div className="relative aspect-[1.6] overflow-hidden rounded-lg">
          <Photo id={serie?.galerie[3]?.[0] ?? serie?.hero} className="size-full" />
          <div className="absolute inset-0 bg-black/40" />
          <span className="absolute bottom-2.5 left-3 text-white">
            <LogoExemple site={site} taille={12} couleur="#ffffff" point="#ffffff" />
            <span className="mt-1 block text-[7.5px] opacity-85">Visuel pour les réseaux</span>
          </span>
        </div>
      </div>
    </div>
  );
}
