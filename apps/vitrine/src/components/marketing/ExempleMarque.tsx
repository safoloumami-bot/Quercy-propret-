/* eslint-disable @next/next/no-img-element */
import { CalendarDays, Clock, Heart, MapPin, Plus, ShoppingBag, Star, UserRound, UtensilsCrossed } from "lucide-react";
import { cx } from "@/components/ui";

// Exemple de réalisation complète pour un restaurant fictif, « Olivette » : un logo, un site,
// une appli pour ses clients (commander, réserver, fidélité) et une identité, aux mêmes
// couleurs. Sert d'illustration, ce n'est pas un client réel. Les photos (public/exemples)
// sont de vraies photos libres de droits ; à remplacer par celles du client dans un vrai projet.

const olive = "#2c3620";
const oliveClair = "#55663a";
const tomate = "#c2452d";
const creme = "#f7f1e4";
const papier = "#fffdf7";
const encre = "#1d1a14";
const gris = "#6f6a5d";
const serif = "'Fraunces Variable', Georgia, serif";

const plats = [
  ["/exemples/burger.jpg", "Burger du Quercy", "Bœuf fermier, cantal, pain du boulanger", "16 €"],
  ["/exemples/riz.jpg", "Riz safrané aux gambas", "Safran du Quercy, chorizo, citron", "19 €"],
  ["/exemples/potager.jpg", "Assiette du potager", "Légumes du marché, huile d'olive", "14 €"],
] as const;

/** Le logo : le nom en italique, avec une olive à la place du point du i. */
export function LogoExemple({ taille = 22, couleur = olive, point = tomate }: { taille?: number; couleur?: string; point?: string }) {
  return (
    <span
      role="img"
      aria-label="Logo Olivette"
      className="inline-flex items-baseline leading-none whitespace-nowrap"
      style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 560, fontSize: taille, letterSpacing: "-0.035em", color: couleur }}
    >
      ol
      <span className="relative">
        ı
        <span className="absolute left-1/2 rounded-full" style={{ width: "0.2em", height: "0.25em", top: "0.1em", background: point, transform: "translateX(-35%) rotate(18deg)" }} />
      </span>
      vette
    </span>
  );
}

/** Le sceau : la version ronde du logo, pour l'icône de l'appli et les petits formats. */
export function SceauExemple({ taille = 40, fond = olive, couleur = creme, point = tomate }: { taille?: number; fond?: string; couleur?: string; point?: string }) {
  return (
    <span className="relative grid shrink-0 place-items-center rounded-full" style={{ width: taille, height: taille, background: fond }} aria-hidden>
      <span style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 600, fontSize: taille * 0.62, lineHeight: 1, color: couleur, transform: "translateY(-6%)" }}>o</span>
      <span className="absolute rounded-full" style={{ width: taille * 0.14, height: taille * 0.14, right: taille * 0.2, top: taille * 0.2, background: point }} />
    </span>
  );
}

function Photo({ src, className }: { src: string; className?: string }) {
  return <img src={src} alt="" loading="lazy" decoding="async" className={cx("object-cover", className)} />;
}

/** Le site : accueil complet (menu, accroche, photo, carte, horaires, réservation). */
export function SiteExemple({ className }: { className?: string }) {
  return (
    <div className={cx("overflow-hidden rounded-2xl border border-creme/10 bg-nuit-2 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)]", className)} aria-hidden>
      <div className="flex items-center gap-3 border-b border-creme/[0.08] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-creme/15" />
          <span className="size-2.5 rounded-full bg-creme/15" />
          <span className="size-2.5 rounded-full bg-creme/15" />
        </div>
        <div className="flex-1 rounded-md bg-creme/[0.05] px-3 py-1 font-mono text-[11px] text-taupe">olivette-cahors.fr</div>
      </div>
      <div style={{ background: creme, color: encre }}>
        <div className="flex items-center justify-between px-5 py-3.5 sm:px-7">
          <LogoExemple taille={24} />
          <span className="hidden items-center gap-5 text-[11px] font-medium sm:flex" style={{ color: gris }}>
            <span>La carte</span>
            <span>Le lieu</span>
            <span>À emporter</span>
            <span className="rounded-full px-3.5 py-1.5" style={{ background: olive, color: creme }}>Réserver</span>
          </span>
        </div>

        <div className="grid gap-5 px-5 pb-6 sm:grid-cols-[1fr_1.1fr] sm:items-center sm:px-7">
          <div>
            <p className="text-[9.5px] font-semibold tracking-[0.2em] uppercase" style={{ color: tomate }}>Cuisine du marché · Cahors</p>
            <p className="mt-3 text-[30px] leading-[1.02] sm:text-[38px]" style={{ fontFamily: serif, fontWeight: 480, letterSpacing: "-0.03em" }}>
              Ce que le marché <span style={{ fontStyle: "italic", color: oliveClair }}>a de meilleur</span>, chaque midi.
            </p>
            <p className="mt-3.5 max-w-[34ch] text-[12px] leading-relaxed" style={{ color: gris }}>
              Une carte courte qui change avec les saisons, des producteurs du Lot, et une table où l&apos;on prend son temps.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span className="rounded-full px-4 py-2.5 text-[11.5px] font-medium" style={{ background: tomate, color: papier }}>Réserver une table</span>
              <span className="rounded-full px-4 py-2.5 text-[11.5px] font-medium" style={{ boxShadow: `inset 0 0 0 1px ${olive}`, color: olive }}>Commander à emporter</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-[10.5px]" style={{ color: gris }}>
              <span className="flex items-center gap-1.5"><Clock className="size-3.5" style={{ color: olive }} /> Mardi au samedi, midi et soir</span>
              <span className="flex items-center gap-1.5"><MapPin className="size-3.5" style={{ color: olive }} /> 12 rue du Portail, Cahors</span>
            </div>
          </div>
          <div className="relative">
            <Photo src="/exemples/table.jpg" className="aspect-[4/3] w-full rounded-xl" />
            <div className="absolute -bottom-3 left-3 rounded-lg px-3 py-2 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.45)]" style={{ background: papier }}>
              <p className="text-[9px] tracking-[0.14em] uppercase" style={{ color: gris }}>Menu du midi</p>
              <p className="text-[13px]" style={{ fontFamily: serif, fontWeight: 520 }}>Entrée, plat, dessert · 24 €</p>
            </div>
          </div>
        </div>

        <div className="px-5 pt-2 pb-6 sm:px-7">
          <div className="flex items-baseline justify-between">
            <p className="text-[17px]" style={{ fontFamily: serif, fontWeight: 520, letterSpacing: "-0.02em" }}>À la carte cette semaine</p>
            <p className="text-[10.5px] underline underline-offset-2" style={{ color: olive }}>Voir toute la carte</p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {plats.map(([src, nom, detail, prix]) => (
              <div key={nom}>
                <Photo src={src} className="aspect-[4/3] w-full rounded-lg" />
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <p className="text-[11px] leading-tight font-semibold sm:text-[12px]">{nom}</p>
                  <p className="hidden shrink-0 text-[11px] sm:block" style={{ color: tomate }}>{prix}</p>
                </div>
                <p className="mt-0.5 hidden text-[9.5px] leading-snug sm:block" style={{ color: gris }}>{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** L'appli des clients du restaurant : commander à emporter, réserver, cumuler des points. */
export function AppliExemple({ className }: { className?: string }) {
  return (
    <div className={cx("w-[236px] rounded-[40px] bg-black p-[7px] shadow-[0_50px_110px_-25px_rgba(0,0,0,0.95)] ring-1 ring-creme/15", className)} aria-hidden>
      <div className="relative overflow-hidden rounded-[33px]" style={{ background: creme, color: encre }}>
        <div className="flex items-center justify-between px-5 pt-2.5 text-[9px] font-semibold">
          <span>12:08</span>
          <span className="h-[15px] w-[62px] rounded-full bg-black" />
          <span>5G</span>
        </div>
        <div className="flex items-center justify-between px-4 pt-3">
          <span>
            <span className="block text-[9px]" style={{ color: gris }}>Bonjour Léa</span>
            <LogoExemple taille={19} />
          </span>
          <span className="grid size-7 place-items-center rounded-full" style={{ background: papier, boxShadow: "inset 0 0 0 1px #e6dcc6" }}>
            <ShoppingBag className="size-3.5" style={{ color: olive }} />
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-full p-1 text-center text-[9.5px] font-medium" style={{ background: "#ebe2cf", margin: "12px 16px 0" }}>
          <span className="rounded-full py-1.5" style={{ background: olive, color: creme }}>À emporter</span>
          <span className="py-1.5" style={{ color: gris }}>Réserver une table</span>
        </div>

        <div className="relative mx-4 mt-3 overflow-hidden rounded-2xl">
          <Photo src="/exemples/riz.jpg" className="h-[92px] w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute right-3 bottom-2.5 left-3 flex items-end justify-between" style={{ color: papier }}>
            <span className="min-w-0">
              <span className="block text-[7.5px] tracking-[0.14em] uppercase opacity-85">Plat du jour</span>
              <span className="block text-[12px] leading-tight whitespace-nowrap" style={{ fontFamily: serif, fontWeight: 520 }}>Riz safrané aux gambas</span>
            </span>
            <span className="shrink-0 rounded-full px-2 py-1 text-[9.5px] font-semibold whitespace-nowrap" style={{ background: tomate }}>19 €</span>
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between px-4">
          <p className="text-[12.5px]" style={{ fontFamily: serif, fontWeight: 560 }}>La carte</p>
          <p className="text-[8.5px]" style={{ color: gris }}>Prêt en 20 min</p>
        </div>
        <div className="mt-1.5 space-y-1.5 px-4">
          {[plats[0], plats[2]].map(([src, nom, detail, prix], i) => (
            <div key={nom} className="flex items-center gap-2.5 rounded-xl p-1.5" style={{ background: papier, boxShadow: "inset 0 0 0 1px #ece3cf" }}>
              <Photo src={src} className="size-11 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[10px] font-semibold">{nom}</span>
                <span className="block truncate text-[8px]" style={{ color: gris }}>{detail}</span>
                <span className="text-[9.5px] font-medium" style={{ color: tomate }}>{prix}</span>
              </span>
              <span className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold" style={i === 0 ? { background: olive, color: creme } : { boxShadow: `inset 0 0 0 1px ${olive}`, color: olive }}>
                {i === 0 ? "1" : <Plus className="size-3" />}
              </span>
            </div>
          ))}
        </div>

        <div className="mx-4 mt-2 flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: "#e9ecd9" }}>
          <Star className="size-3.5 shrink-0" style={{ color: oliveClair, fill: oliveClair }} />
          <span className="flex-1 text-[8.5px] leading-tight">
            <span className="block font-semibold">Carte de fidélité · 8 sur 10</span>
            <span style={{ color: gris }}>Encore 2 commandes, un dessert offert</span>
          </span>
        </div>

        <div className="mx-4 mt-2.5 flex items-center justify-between rounded-full px-4 py-2.5 text-[10px] font-medium shadow-[0_10px_22px_-10px_rgba(0,0,0,0.5)]" style={{ background: tomate, color: papier }}>
          <span>Voir le panier · 1 article</span>
          <span className="font-semibold">16 €</span>
        </div>

        <div className="mt-2.5 grid grid-cols-4 border-t px-2 pt-2 pb-3 text-center text-[7.5px] font-medium" style={{ borderColor: "#e6dcc6", background: papier, color: "#9a9486" }}>
          {(
            [
              [UtensilsCrossed, "La carte", true],
              [CalendarDays, "Réserver", false],
              [Heart, "Fidélité", false],
              [UserRound, "Compte", false],
            ] as const
          ).map(([Icone, l, actif]) => (
            <span key={l} className="flex flex-col items-center gap-1" style={actif ? { color: olive } : undefined}>
              <Icone className="size-4" />
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** L'identité : le logo et ses déclinaisons, les couleurs, les polices, les supports. */
export function IdentiteExemple({ className }: { className?: string }) {
  const couleurs = [
    [olive, "Olive"],
    [tomate, "Tomate"],
    [creme, "Crème"],
    [encre, "Encre"],
  ] as const;
  return (
    <div className={cx("rounded-[26px] border border-creme/10 bg-[linear-gradient(160deg,#1d1813_0%,#110e0b_70%)] p-5 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.95)]", className)} aria-hidden>
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-taupe-2">Identité visuelle · restaurant Olivette</p>
        <p className="rounded-full border border-creme/10 px-2 py-0.5 text-[10px] text-taupe-2">Exemple</p>
      </div>
      <div className="mt-4 grid grid-cols-[1.5fr_1fr] gap-2">
        <div className="grid place-items-center rounded-xl py-8" style={{ background: creme }}>
          <LogoExemple taille={34} />
        </div>
        <div className="grid grid-rows-2 gap-2">
          <div className="grid place-items-center rounded-xl" style={{ background: olive }}>
            <LogoExemple taille={19} couleur={creme} />
          </div>
          <div className="grid place-items-center rounded-xl" style={{ background: tomate }}>
            <SceauExemple taille={30} fond={creme} couleur={olive} point={tomate} />
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-taupe">
        Le nom écrit comme à la main, et une olive à la place du point du i : on le reconnaît sans image.
      </p>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {couleurs.map(([c, n]) => (
          <div key={n}>
            <span className="block h-8 rounded-md ring-1 ring-creme/10" style={{ background: c }} />
            <p className="mt-1 text-[9.5px] text-taupe-2">{n}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between rounded-lg border border-creme/[0.08] px-3 py-2.5 text-creme">
        <span className="text-[19px]" style={{ fontFamily: serif, fontWeight: 480, letterSpacing: "-0.02em" }}>
          Titres <span style={{ fontStyle: "italic" }}>Fraunces</span>
        </span>
        <span className="text-[11.5px] text-taupe">Textes en Geist</span>
      </div>
      {/* Supports : carte de fidélité et visuel pour les réseaux */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="flex aspect-[1.6] flex-col justify-between rounded-lg p-3" style={{ background: olive, color: creme }}>
          <LogoExemple taille={15} couleur={creme} />
          <span>
            <span className="flex gap-1">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className="size-2 rounded-full" style={{ background: i < 8 ? tomate : "rgba(247,241,228,0.2)" }} />
              ))}
            </span>
            <span className="mt-1.5 block text-[7.5px] opacity-70">Carte de fidélité</span>
          </span>
        </div>
        <div className="relative aspect-[1.6] overflow-hidden rounded-lg">
          <Photo src="/exemples/cafe.jpg" className="size-full" />
          <div className="absolute inset-0 bg-black/35" />
          <span className="absolute bottom-2.5 left-3" style={{ color: papier }}>
            <LogoExemple taille={15} couleur={papier} point={papier} />
            <span className="mt-1 block text-[7.5px] opacity-85">Visuel pour les réseaux</span>
          </span>
        </div>
      </div>
    </div>
  );
}
