import type { ReactNode } from "react";
import { ArrowRight, Clock, Mail, MapPin, Menu, Minus, Phone, Plus } from "lucide-react";
import type { SectionSite, SiteGenere, Typo } from "@/lib/generateur";
import { contraste, lisible, luminance, melanger, texteSur } from "@/lib/couleurs";
import { Visuel } from "@/components/Visuel";
import { photoPlat, photosPour, urlPhoto } from "@/lib/photos";

// Rendu d'un site généré. La mise en page s'adapte à la largeur de son conteneur (requêtes de
// conteneur), pas à celle de la fenêtre : le même composant sert pour l'aperçu ordinateur,
// l'aperçu mobile et les miniatures.

const polices: Record<Typo, { titres: string; poids: number; interlettrage: string }> = {
  elegante: { titres: "'Fraunces Variable', Georgia, serif", poids: 480, interlettrage: "-0.02em" },
  editoriale: { titres: "'Playfair Display Variable', Georgia, serif", poids: 560, interlettrage: "-0.015em" },
  moderne: { titres: "var(--font-geist-sans), system-ui, sans-serif", poids: 600, interlettrage: "-0.04em" },
  chaleureuse: { titres: "'Bricolage Grotesque Variable', system-ui, sans-serif", poids: 640, interlettrage: "-0.035em" },
};

const rayons = {
  pilule: { bouton: "rounded-full", carte: "rounded-3xl", image: "rounded-3xl" },
  doux: { bouton: "rounded-xl", carte: "rounded-2xl", image: "rounded-2xl" },
  net: { bouton: "rounded-[6px]", carte: "rounded-md", image: "rounded-md" },
};

/** Police des titres d'un site généré (aussi utilisée pour son logo). */
export function policeTitres(site: SiteGenere) {
  return polices[site.typo ?? (site.police === "serif" ? "elegante" : "moderne")];
}

/**
 * Image d'un site généré : une vraie photo du métier quand il en existe une série, posée sur
 * l'illustration dessinée (qui reste visible si la photo ne se charge pas).
 * `graine` : 1 à 3 = haut de page, 7 = à propos, 10 et plus = galerie.
 */
function Image({ site, graine, sombre = false, className }: { site: SiteGenere; graine: number; sombre?: boolean; className?: string }) {
  const serie = photosPour(site.secteur);
  if (!serie) return <Visuel palette={site.palette} motif={site.motif} graine={graine} sombre={sombre} className={className} />;
  const id = graine >= 10 ? serie.galerie[(graine - 10) % serie.galerie.length]![0] : graine === 7 ? serie.apropos : serie.hero;
  const calque = { gridArea: "1 / 1", minWidth: 0, minHeight: 0 } as const;
  return (
    <span className={className} style={{ display: "grid", overflow: "hidden" }} aria-hidden>
      <Visuel palette={site.palette} motif={site.motif} graine={graine} sombre={sombre} className="h-full w-full" style={calque} />
      <span className="bg-cover bg-center" style={{ ...calque, backgroundImage: `url("${urlPhoto(id, graine <= 3 ? 1400 : 800)}")` }} />
      {sombre && <span style={{ ...calque, background: "rgba(0,0,0,0.28)" }} />}
    </span>
  );
}

function theme(site: SiteGenere) {
  const { fond, texte, accent, doux } = site.palette;
  const typo: Typo = site.typo ?? (site.police === "serif" ? "elegante" : "moderne");
  const clair = luminance(fond) > 0.4;
  return {
    fond,
    texte,
    accent,
    doux,
    clair,
    typo,
    police: polices[typo],
    r: rayons[site.arrondi ?? "pilule"],
    // Accent lisible comme texte sur le fond, et texte lisible sur l'accent
    accentTexte: lisible(accent, fond, texte, 4.5),
    surAccent: texteSur(accent, clair ? texte : "#141414"),
    discret: lisible(melanger(texte, fond, 0.38), fond, texte, 4.6),
    ligne: melanger(texte, fond, 0.86),
    carte: clair ? melanger(fond, "#ffffff", 0.6) : melanger(fond, texte, 0.05),
    pied: clair ? (contraste(texte, fond) > 7 ? texte : "#141414") : doux,
    surPied: clair ? fond : texte,
  };
}
type Theme = ReturnType<typeof theme>;

function Titre({ t, children, className, as: Balise = "h2" }: { t: Theme; children: ReactNode; className?: string; as?: "h1" | "h2" | "h3" | "p" }) {
  return (
    <Balise className={className} style={{ fontFamily: t.police.titres, fontWeight: t.police.poids, letterSpacing: t.police.interlettrage, textWrap: "balance" } as React.CSSProperties}>
      {children}
    </Balise>
  );
}

function Bouton({ t, children, variante = "plein", inverse = false }: { t: Theme; children: ReactNode; variante?: "plein" | "contour"; inverse?: boolean }) {
  const style =
    variante === "plein"
      ? inverse
        ? { background: t.surAccent, color: t.accent }
        : { background: t.accent, color: t.surAccent }
      : { border: `1px solid ${inverse ? "rgba(255,255,255,0.55)" : t.ligne}`, color: inverse ? "#fff" : t.texte };
  return (
    <span style={style} className={`inline-flex h-11 items-center justify-center gap-2 px-5 text-[14.5px] font-medium whitespace-nowrap @3xl:h-12 @3xl:px-6 ${t.r.bouton}`}>
      {children}
    </span>
  );
}

function Conteneur({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1120px] px-6 @3xl:px-12 ${className}`}>{children}</div>;
}

function EnTeteSection({ t, s, centre = false }: { t: Theme; s: SectionSite; centre?: boolean }) {
  return (
    <div className={centre ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {s.surtitre && <p style={{ color: t.accentTexte }} className="text-[12.5px] font-medium tracking-[0.14em] uppercase">{s.surtitre}</p>}
      <Titre t={t} className="mt-3 text-[2rem] leading-[1.08] @3xl:text-[2.9rem]">{s.titre}</Titre>
      {s.texte && <p style={{ color: t.discret }} className="mt-4 text-[16px] leading-relaxed @3xl:text-lg">{s.texte}</p>}
    </div>
  );
}

/* ---------- Premier écran ---------- */

function Navigation({ t, site, surImage }: { t: Theme; site: SiteGenere; surImage: boolean }) {
  const liens = site.sections.filter((s) => ["menu", "services", "tarifs", "galerie", "apropos", "contact"].includes(s.type)).slice(0, 4);
  const couleur = surImage ? "#ffffff" : t.texte;
  return (
    <nav className={surImage ? "absolute inset-x-0 top-0 z-10" : ""} style={{ color: couleur }}>
      <Conteneur className="flex h-[72px] items-center justify-between gap-6">
        {/* Logo : le nom dans la police des titres, ponctué d'un point à la couleur de la marque. */}
        <Titre t={t} as="p" className="shrink-0 text-[21px] whitespace-nowrap @3xl:text-[23px]">
          {site.nom}
          <span style={{ color: surImage ? "#ffffff" : t.accentTexte, opacity: surImage ? 0.85 : 1 }}>.</span>
        </Titre>
        <span className="hidden items-center gap-7 text-[14.5px] whitespace-nowrap @5xl:flex" style={{ opacity: 0.82 }}>
          {liens.map((s) => (
            <span key={s.titre}>{s.type === "contact" ? "Contact" : (s.surtitre ?? s.titre)}</span>
          ))}
        </span>
        <span className="hidden @3xl:block">
          <Bouton t={t}>{site.hero.cta}</Bouton>
        </span>
        <Menu className="size-6 @3xl:hidden" aria-hidden />
      </Conteneur>
    </nav>
  );
}

function Hero({ t, site }: { t: Theme; site: SiteGenere }) {
  const mise = site.mise ?? "partage";
  const h = site.hero;

  if (mise === "plein") {
    return (
      <header className="relative isolate overflow-hidden">
        <Image site={site} graine={1} sombre className="absolute inset-0 -z-20 h-full w-full" />
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.6) 100%)" }} />
        <Navigation t={t} site={site} surImage />
        <Conteneur className="flex min-h-[540px] flex-col justify-end pt-32 pb-14 text-white @3xl:min-h-[620px] @3xl:pb-20">
          <p className="text-[12.5px] font-medium tracking-[0.16em] uppercase opacity-85">{h.surtitre}</p>
          <Titre t={t} as="h1" className="mt-4 max-w-4xl text-[2.6rem] leading-[1.02] @3xl:text-[4.6rem]">{h.titre}</Titre>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed opacity-90 @3xl:text-lg">{h.sousTitre}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Bouton t={t}>{h.cta} <ArrowRight className="size-4" /></Bouton>
            {h.ctaSecondaire && <Bouton t={t} variante="contour" inverse>{h.ctaSecondaire}</Bouton>}
          </div>
        </Conteneur>
      </header>
    );
  }

  if (mise === "editorial") {
    const court = h.titre.length < 24;
    return (
      <header>
        <Navigation t={t} site={site} surImage={false} />
        <Conteneur className="pt-14 pb-12 text-center @3xl:pt-20 @3xl:pb-16">
          <p style={{ color: t.accentTexte }} className="text-[12.5px] font-medium tracking-[0.16em] uppercase">{h.surtitre}</p>
          <Titre t={t} as="h1" className={`mx-auto mt-5 max-w-5xl leading-[0.98] ${court ? "text-[3.4rem] @3xl:text-[7.5rem]" : "text-[2.6rem] @3xl:text-[5rem]"}`}>{h.titre}</Titre>
          <p style={{ color: t.discret }} className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed @3xl:text-lg">{h.sousTitre}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Bouton t={t}>{h.cta}</Bouton>
            {h.ctaSecondaire && <Bouton t={t} variante="contour">{h.ctaSecondaire}</Bouton>}
          </div>
        </Conteneur>
        <Conteneur className="pb-16 @3xl:pb-24">
          <div className={`overflow-hidden ${t.r.image}`}>
            <Image site={site} graine={2} className="block aspect-[4/3] w-full @3xl:aspect-[21/9]" />
          </div>
        </Conteneur>
      </header>
    );
  }

  return (
    <header>
      <Navigation t={t} site={site} surImage={false} />
      <Conteneur className="grid items-center gap-10 pt-8 pb-16 @3xl:grid-cols-[1.05fr_1fr] @3xl:gap-14 @3xl:pt-14 @3xl:pb-24">
        <div>
          <p style={{ color: t.accentTexte }} className="text-[12.5px] font-medium tracking-[0.16em] uppercase">{h.surtitre}</p>
          <Titre t={t} as="h1" className="mt-4 text-[2.5rem] leading-[1.04] @3xl:text-[3.9rem]">{h.titre}</Titre>
          <p style={{ color: t.discret }} className="mt-5 max-w-lg text-[17px] leading-relaxed @3xl:text-lg">{h.sousTitre}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Bouton t={t}>{h.cta} <ArrowRight className="size-4" /></Bouton>
            {h.ctaSecondaire && <Bouton t={t} variante="contour">{h.ctaSecondaire}</Bouton>}
          </div>
        </div>
        <div className="relative">
          <div className={`overflow-hidden ${t.r.image}`}>
            <Image site={site} graine={3} className="block aspect-[4/3] w-full @3xl:aspect-[4/5]" />
          </div>
          {site.infos?.bandeau && (
            <div
              style={{ background: t.carte, color: t.texte, borderColor: t.ligne }}
              className={`absolute -bottom-5 left-4 hidden max-w-[300px] items-start gap-3 border p-4 text-[13.5px] leading-snug shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] @xl:flex ${t.r.carte === "rounded-3xl" ? "rounded-2xl" : t.r.carte}`}
            >
              <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: t.accent }} />
              {site.infos.bandeau.split(" · ")[0]}
            </div>
          )}
        </div>
      </Conteneur>
    </header>
  );
}

/* ---------- Sections ---------- */

function Atouts({ t, s }: { t: Theme; s: SectionSite }) {
  return (
    <Conteneur className="py-14 @3xl:py-20">
      <h2 className="sr-only">{s.titre}</h2>
      <div className="grid gap-8 @3xl:grid-cols-3 @3xl:gap-10">
        {(s.items ?? []).map((it, i) => (
          <div key={it.titre} className="border-t pt-6" style={{ borderColor: t.ligne }}>
            <p style={{ color: t.accentTexte, fontFamily: t.police.titres }} className="text-[15px]">{String(i + 1).padStart(2, "0")}</p>
            <Titre t={t} as="h3" className="mt-3 text-[1.35rem] leading-tight">{it.titre}</Titre>
            {it.texte && <p style={{ color: t.discret }} className="mt-2 text-[15.5px] leading-relaxed">{it.texte}</p>}
          </div>
        ))}
      </div>
    </Conteneur>
  );
}

function Carte({ t, s }: { t: Theme; s: SectionSite }) {
  // Les plats qui ont une vraie photo sont mis en avant au-dessus de la carte.
  const illustres = (s.items ?? []).filter((it) => photoPlat(it.titre));
  return (
    <Conteneur className="py-16 @3xl:py-24">
      <EnTeteSection t={t} s={s} />
      {illustres.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-4 @3xl:mt-14 @3xl:grid-cols-4">
          {illustres.map((it) => (
            <figure key={it.titre}>
              <span className={`block aspect-[4/5] bg-cover bg-center ${t.r.image}`} style={{ background: `${t.doux} url("${urlPhoto(photoPlat(it.titre)!, 600)}") center / cover` }} />
              <figcaption className="mt-3 flex items-baseline justify-between gap-3 text-[14.5px]">
                <span className="font-medium">{it.titre}</span>
                <span style={{ color: t.accentTexte }} className="whitespace-nowrap">{it.prix}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <div className="mt-10 grid gap-x-16 @3xl:mt-14 @3xl:grid-cols-2">
        {(s.items ?? []).map((it) => (
          <div key={it.titre} className="border-b py-5" style={{ borderColor: t.ligne }}>
            <div className="flex items-baseline gap-3">
              <Titre t={t} as="h3" className="text-[1.2rem] leading-snug">{it.titre}</Titre>
              <span aria-hidden className="mb-1.5 min-w-6 flex-1 border-b border-dotted" style={{ borderColor: t.discret }} />
              <span style={{ color: t.accentTexte }} className="font-medium whitespace-nowrap">{it.prix}</span>
            </div>
            {it.texte && <p style={{ color: t.discret }} className="mt-1 text-[14.5px]">{it.texte}</p>}
          </div>
        ))}
      </div>
    </Conteneur>
  );
}

function Services({ t, s }: { t: Theme; s: SectionSite }) {
  return (
    <Conteneur className="py-16 @3xl:py-24">
      <EnTeteSection t={t} s={s} />
      <div className="mt-10 grid gap-4 @2xl:grid-cols-2 @3xl:mt-14 @4xl:grid-cols-3">
        {(s.items ?? []).map((it, i) => (
          <div key={it.titre} style={{ background: t.carte, borderColor: t.ligne }} className={`border p-7 ${t.r.carte}`}>
            <span
              style={{ background: melanger(t.accent, t.fond, 0.82), color: t.accentTexte, fontFamily: t.police.titres }}
              className={`grid size-10 place-items-center text-[15px] font-semibold ${t.r.bouton === "rounded-full" ? "rounded-full" : "rounded-md"}`}
            >
              {i + 1}
            </span>
            <Titre t={t} as="h3" className="mt-6 text-[1.3rem] leading-tight">{it.titre}</Titre>
            {it.texte && <p style={{ color: t.discret }} className="mt-2 text-[15px] leading-relaxed">{it.texte}</p>}
            {it.prix && <p style={{ color: t.accentTexte }} className="mt-4 font-medium">{it.prix}</p>}
          </div>
        ))}
      </div>
    </Conteneur>
  );
}

function Tarifs({ t, s }: { t: Theme; s: SectionSite }) {
  return (
    <Conteneur className="py-16 @3xl:py-24">
      <EnTeteSection t={t} s={s} />
      <div className="mt-10 grid gap-4 @2xl:grid-cols-2 @3xl:mt-14 @4xl:grid-cols-3">
        {(s.items ?? []).map((it) => (
          <div key={it.titre} style={{ background: t.carte, borderColor: it.tag ? t.accent : t.ligne, borderWidth: it.tag ? 2 : 1 }} className={`flex flex-col p-7 ${t.r.carte}`}>
            <div className="flex items-start justify-between gap-3">
              <Titre t={t} as="h3" className="text-[1.25rem] leading-tight">{it.titre}</Titre>
              {it.tag && <span style={{ background: t.accent, color: t.surAccent }} className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium">{it.tag}</span>}
            </div>
            {it.texte && <p style={{ color: t.discret }} className="mt-2 text-[14.5px]">{it.texte}</p>}
            <Titre t={t} as="p" className="mt-6 text-[2.2rem] leading-none">{it.prix}</Titre>
            <p style={{ color: t.accentTexte }} className="mt-6 flex items-center gap-1.5 text-[14.5px] font-medium">Réserver <ArrowRight className="size-4" /></p>
          </div>
        ))}
      </div>
    </Conteneur>
  );
}

function Galerie({ t, s, site }: { t: Theme; s: SectionSite; site: SiteGenere }) {
  const base = s.items?.length ? s.items : [{ titre: "" }, { titre: "" }, { titre: "" }, { titre: "" }];
  // Avec de vraies photos, chaque image garde sa propre légende (le prix d'un produit est conservé).
  const serie = photosPour(site.secteur);
  const items: NonNullable<SectionSite["items"]> = serie ? serie.galerie.map(([, legende], i) => ({ titre: legende, prix: base[i]?.prix })) : base;
  const produits = items.some((x) => x.prix);
  const mosaique = !produits && items.length === 4;
  const grille = mosaique ? "grid-cols-2 @3xl:grid-cols-4 @3xl:grid-rows-[230px_230px]" : produits ? "grid-cols-2 @3xl:grid-cols-4" : "grid-cols-2 @3xl:grid-cols-3";
  return (
    <Conteneur className="py-16 @3xl:py-24">
      <EnTeteSection t={t} s={s} />
      <div className={`mt-10 grid gap-4 @3xl:mt-14 ${grille}`}>
        {items.map((it, i) => {
          const place = mosaique ? (i === 0 ? "col-span-2 @3xl:row-span-2" : i === 3 ? "col-span-2" : "") : "";
          const forme = mosaique ? "h-full min-h-[180px]" : produits ? "aspect-[4/5]" : "aspect-[4/3]";
          return (
            <figure key={i} className={`relative ${place}`}>
              <div className={`overflow-hidden ${t.r.image} ${forme}`}>
                <Image site={site} graine={10 + i} className="block h-full w-full" />
              </div>
              {produits ? (
                <figcaption className="mt-3 flex items-baseline justify-between gap-3 text-[15px]">
                  <span>{it.titre}</span>
                  <span style={{ color: t.accentTexte }} className="font-medium">{it.prix}</span>
                </figcaption>
              ) : (
                (it.titre || it.tag) && (
                  <figcaption style={{ background: t.carte, color: t.texte }} className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium shadow-sm">
                    {it.titre}
                    {it.tag && <span style={{ color: t.discret }} className="font-normal">· {it.tag}</span>}
                  </figcaption>
                )
              )}
            </figure>
          );
        })}
      </div>
    </Conteneur>
  );
}

function APropos({ t, s, site }: { t: Theme; s: SectionSite; site: SiteGenere }) {
  return (
    <Conteneur className="grid items-center gap-10 py-16 @3xl:grid-cols-2 @3xl:gap-16 @3xl:py-24">
      <div className={`overflow-hidden ${t.r.image}`}>
        <Image site={site} graine={7} className="block aspect-[4/3] w-full" />
      </div>
      <div>
        <EnTeteSection t={t} s={{ ...s, texte: undefined }} />
        {s.texte && <p style={{ color: t.discret }} className="mt-5 text-[17px] leading-relaxed">{s.texte}</p>}
        <Titre t={t} as="p" className="mt-7 text-lg italic opacity-80">— {site.nom}</Titre>
      </div>
    </Conteneur>
  );
}

function Chiffres({ t, s }: { t: Theme; s: SectionSite }) {
  return (
    <Conteneur className="py-16 @3xl:py-24">
      <EnTeteSection t={t} s={s} />
      <div className="mt-10 grid gap-8 @3xl:grid-cols-3">
        {(s.items ?? []).map((it) => (
          <div key={it.titre} className="border-t pt-6" style={{ borderColor: t.ligne }}>
            <Titre t={t} as="p" className="text-5xl">{it.titre}</Titre>
            {it.texte && <p style={{ color: t.discret }} className="mt-2">{it.texte}</p>}
          </div>
        ))}
      </div>
    </Conteneur>
  );
}

function Etapes({ t, s }: { t: Theme; s: SectionSite }) {
  const n = s.items?.length ?? 0;
  return (
    <Conteneur className="py-16 @3xl:py-24">
      <EnTeteSection t={t} s={s} />
      <ol className={`mt-10 grid gap-8 @3xl:mt-14 ${n >= 4 ? "@2xl:grid-cols-2 @4xl:grid-cols-4" : "@3xl:grid-cols-3"}`}>
        {(s.items ?? []).map((it, i) => (
          <li key={it.titre} className="relative">
            <span style={{ borderColor: t.accent, color: t.accentTexte, fontFamily: t.police.titres }} className="grid size-11 place-items-center rounded-full border-2 text-[16px] font-semibold">
              {i + 1}
            </span>
            {i < n - 1 && <span aria-hidden className="absolute top-[22px] right-2 left-16 hidden border-t @4xl:block" style={{ borderColor: t.ligne }} />}
            <Titre t={t} as="h3" className="mt-5 text-[1.25rem] leading-tight">{it.titre}</Titre>
            {it.texte && <p style={{ color: t.discret }} className="mt-2 text-[15px] leading-relaxed">{it.texte}</p>}
          </li>
        ))}
      </ol>
    </Conteneur>
  );
}

function Faq({ t, s }: { t: Theme; s: SectionSite }) {
  return (
    <Conteneur className="grid gap-10 py-16 @3xl:grid-cols-[1fr_1.5fr] @3xl:py-24">
      <EnTeteSection t={t} s={s} />
      <div className="border-t" style={{ borderColor: t.ligne }}>
        {(s.items ?? []).map((it, i) => (
          <div key={it.titre} className="border-b py-5" style={{ borderColor: t.ligne }}>
            <div className="flex items-start justify-between gap-4">
              <Titre t={t} as="h3" className="text-[1.15rem] leading-snug">{it.titre}</Titre>
              {i === 0 ? <Minus className="mt-1 size-4 shrink-0" aria-hidden /> : <Plus className="mt-1 size-4 shrink-0" aria-hidden />}
            </div>
            {i === 0 && it.texte && <p style={{ color: t.discret }} className="mt-3 max-w-xl text-[15.5px] leading-relaxed">{it.texte}</p>}
          </div>
        ))}
      </div>
    </Conteneur>
  );
}

function Horaires({ t, items }: { t: Theme; items: NonNullable<SectionSite["items"]> }) {
  return (
    <div style={{ background: t.carte, borderColor: t.ligne }} className={`border p-6 ${t.r.carte}`}>
      <p className="flex items-center gap-2 font-medium">
        <Clock className="size-4" style={{ color: t.accentTexte }} aria-hidden /> Horaires
      </p>
      <dl className="mt-4 space-y-2.5 text-[15px]">
        {items.map((it) => (
          <div key={it.titre} className="flex justify-between gap-4">
            <dt style={{ color: t.discret }}>{it.titre}</dt>
            <dd className="text-right">{it.texte}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Appel({ t, s }: { t: Theme; s: SectionSite }) {
  return (
    <div style={{ background: t.accent, color: t.surAccent }}>
      <Conteneur className="flex flex-col items-start justify-between gap-8 py-16 @3xl:flex-row @3xl:items-center @3xl:py-20">
        <div className="max-w-2xl">
          <Titre t={t} className="text-[2.1rem] leading-[1.06] @3xl:text-[3.2rem]">{s.titre}</Titre>
          {s.texte && <p className="mt-4 text-[17px] opacity-85">{s.texte}</p>}
        </div>
        {s.cta && (
          <Bouton t={t} inverse>
            {s.cta} <ArrowRight className="size-4" />
          </Bouton>
        )}
      </Conteneur>
    </div>
  );
}

function Champ({ t, label, haut = false }: { t: Theme; label: string; haut?: boolean }) {
  return (
    <div>
      <p className="text-[13px] font-medium">{label}</p>
      <div style={{ borderColor: t.ligne, background: t.fond }} className={`mt-1.5 border ${haut ? "h-24" : "h-11"} ${t.r.bouton === "rounded-full" ? "rounded-xl" : t.r.bouton}`} />
    </div>
  );
}

function Contact({ t, s, site, horaires }: { t: Theme; s: SectionSite; site: SiteGenere; horaires?: SectionSite["items"] }) {
  const infos = site.infos ?? {};
  return (
    <Conteneur className="grid gap-12 py-16 @3xl:grid-cols-2 @3xl:gap-16 @3xl:py-24">
      <div>
        <EnTeteSection t={t} s={s} />
        <ul className="mt-8 space-y-4 text-[16px]">
          <li className="flex items-center gap-3"><MapPin className="size-5 shrink-0" style={{ color: t.accentTexte }} aria-hidden /> {infos.adresse ?? site.ville ?? "[Votre adresse]"}</li>
          <li className="flex items-center gap-3"><Phone className="size-5 shrink-0" style={{ color: t.accentTexte }} aria-hidden /> {infos.telephone ?? "05 00 00 00 00"}</li>
          <li className="flex items-center gap-3"><Mail className="size-5 shrink-0" style={{ color: t.accentTexte }} aria-hidden /> {infos.email ?? "contact@votresite.fr"}</li>
        </ul>
        {horaires && horaires.length > 0 && (
          <div className="mt-8 max-w-sm">
            <Horaires t={t} items={horaires} />
          </div>
        )}
      </div>
      <div style={{ background: t.carte, borderColor: t.ligne }} className={`space-y-4 border p-6 @3xl:p-8 ${t.r.carte}`}>
        <div className="grid gap-4 @xl:grid-cols-2">
          <Champ t={t} label="Nom" />
          <Champ t={t} label="Email" />
        </div>
        <Champ t={t} label="Téléphone" />
        <Champ t={t} label="Message" haut />
        <div className="pt-2">
          <Bouton t={t}>Envoyer</Bouton>
        </div>
      </div>
    </Conteneur>
  );
}

function Pied({ t, site, horaires }: { t: Theme; site: SiteGenere; horaires?: SectionSite["items"] }) {
  const infos = site.infos ?? {};
  return (
    <footer style={{ background: t.pied, color: t.surPied }}>
      <Conteneur className="grid gap-10 py-14 @3xl:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Titre t={t} as="p" className="text-2xl">{site.nom}</Titre>
          <p className="mt-3 max-w-xs text-[14.5px] leading-relaxed opacity-70">{site.hero.sousTitre}</p>
        </div>
        <div className="text-[14.5px]">
          <p className="font-medium">Contact</p>
          <p className="mt-3 opacity-70">{infos.adresse ?? site.ville ?? "[Votre adresse]"}</p>
          <p className="mt-1 opacity-70">{infos.telephone ?? "05 00 00 00 00"}</p>
          <p className="mt-1 opacity-70">{infos.email ?? "contact@votresite.fr"}</p>
        </div>
        {horaires && horaires.length > 0 ? (
          <div className="text-[14.5px]">
            <p className="font-medium">Horaires</p>
            <div className="mt-3 space-y-1">
              {horaires.map((h) => (
                <p key={h.titre} className="opacity-70">{h.titre} : {h.texte}</p>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-[14.5px]">
            <p className="font-medium">Le site</p>
            <div className="mt-3 space-y-1">
              {site.sections
                .filter((x) => x.type !== "appel" && x.type !== "atouts")
                .slice(0, 4)
                .map((x) => (
                  <p key={x.titre} className="opacity-70">{x.surtitre ?? x.titre}</p>
                ))}
            </div>
          </div>
        )}
      </Conteneur>
      <div className="border-t" style={{ borderColor: "currentcolor", opacity: 0.15 }} />
      <Conteneur className="flex flex-wrap justify-between gap-3 py-6 text-[13px] opacity-60">
        <span>© {new Date().getFullYear()} {site.nom}</span>
        <span>Mentions légales · Confidentialité</span>
      </Conteneur>
    </footer>
  );
}

export function ApercuSite({ site }: { site: SiteGenere; compact?: boolean }) {
  const t = theme(site);
  const horaires = site.sections.find((s) => s.type === "horaires")?.items;
  const aContact = site.sections.some((s) => s.type === "contact");
  let alterne = 0;

  return (
    <div style={{ background: t.fond, color: t.texte, fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }} className="@container min-h-full text-left antialiased">
      {site.infos?.bandeau && (
        <div style={{ background: t.clair ? t.pied : t.doux, color: t.clair ? t.fond : t.texte }} className="px-6 py-2.5 text-center text-[12.5px]">
          {site.infos.bandeau}
        </div>
      )}
      <Hero t={t} site={site} />

      {site.sections.map((s, i) => {
        if (s.type === "horaires" && aContact) return null;
        if (s.type === "appel") return <Appel key={i} t={t} s={s} />;
        // Alternance des fonds pour rythmer la page (atouts et contact restent sur le fond principal)
        const surDoux = s.type !== "contact" && s.type !== "atouts" && alterne++ % 2 === 0;
        let contenu: ReactNode = null;
        switch (s.type) {
          case "atouts": contenu = <Atouts t={t} s={s} />; break;
          case "menu": contenu = <Carte t={t} s={s} />; break;
          case "services": contenu = s.items?.every((x) => x.prix && !x.texte) ? <Carte t={t} s={s} /> : <Services t={t} s={s} />; break;
          case "tarifs": contenu = (s.items?.length ?? 0) > 6 ? <Carte t={t} s={s} /> : <Tarifs t={t} s={s} />; break;
          case "galerie": contenu = <Galerie t={t} s={s} site={site} />; break;
          case "apropos": contenu = <APropos t={t} s={s} site={site} />; break;
          case "chiffres": contenu = <Chiffres t={t} s={s} />; break;
          case "etapes": contenu = <Etapes t={t} s={s} />; break;
          case "faq": contenu = <Faq t={t} s={s} />; break;
          case "horaires":
            contenu = (
              <Conteneur className="py-16">
                <EnTeteSection t={t} s={s} />
                <div className="mt-8 max-w-md"><Horaires t={t} items={s.items ?? []} /></div>
              </Conteneur>
            );
            break;
          case "contact": contenu = <Contact t={t} s={s} site={site} horaires={horaires} />; break;
        }
        return (
          <section key={i} style={surDoux ? { background: t.doux } : undefined}>
            {contenu}
          </section>
        );
      })}

      <Pied t={t} site={site} horaires={horaires} />
    </div>
  );
}
