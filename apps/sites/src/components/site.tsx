import { WEEK_DAYS, type WebsiteContent, type WebsiteImage } from "@quercy/core";
import { ArrowRight, ArrowUpRight, Mail, MapPin, Navigation, Phone } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { type PublishedSite, imageUrl } from "@/lib/api";
import { contrast, mix, onColor, readable } from "@/lib/colors";

import { ContactForm } from "./contact-form";

const UNITS: Record<string, string> = {
  unit: "l'unité",
  hour: "de l'heure",
  day: "la journée",
  flat: "forfait",
  month: "par mois",
  sqm: "le m²",
  kg: "le kg",
};
const RADII = {
  net: { btn: "6px", card: "8px", img: "6px" },
  doux: { btn: "12px", card: "20px", img: "18px" },
  pilule: { btn: "999px", card: "28px", img: "26px" },
} as const;

const euros = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: n % 1 ? 2 : 0,
  });
const dateFr = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
/** « 08:00 » → « 8 h », « 12:30 » → « 12 h 30 ». */
const heure = (hhmm: string) => {
  const [h, m] = hhmm.split(":");
  return `${Number(h)} h${m && m !== "00" ? ` ${m}` : ""}`;
};
const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** Jour et minute à Paris (le site est généré côté serveur, rafraîchi toutes les 30 s). */
function parisNow(): { day: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    day: get("weekday").toLowerCase().slice(0, 3),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

function today(c: WebsiteContent) {
  if (c.hours.days.length === 0) return null;
  const now = parisNow();
  const day = c.hours.days.find((d) => d.day === now.day);
  const slots = day && !day.closed ? day.slots : [];
  const open = slots.some((s) => now.minutes >= toMin(s.from) && now.minutes < toMin(s.to));
  const label = slots.length
    ? slots.map((s) => `${heure(s.from)} – ${heure(s.to)}`).join(", ")
    : null;
  return { day: now.day, open, label };
}

function palette(site: PublishedSite) {
  const { accent, background: bg, text } = site.theme;
  const light = contrast(text, bg) >= 4.5 && contrast("#000000", bg) > contrast("#ffffff", bg);
  const dark = light
    ? contrast(text, "#ffffff") > 9
      ? text
      : "#18140f"
    : mix(bg, "#000000", 0.35);
  return {
    "--bg": bg,
    "--text": text,
    "--accent": accent,
    "--accent-text": readable(accent, bg, text, 4.5),
    "--on-accent": onColor(accent),
    "--muted": readable(mix(text, bg, 0.4), bg, text, 4.6),
    "--line": mix(text, bg, 0.87),
    "--soft": site.theme.soft,
    "--card": light ? mix(bg, "#ffffff", 0.65) : mix(bg, text, 0.06),
    "--dark": dark,
    "--on-dark": mix(bg, "#ffffff", 0.4),
    "--on-dark-muted": mix(dark, bg, 0.62),
    "--accent-on-dark": readable(accent, dark, "#ffffff", 4.5),
    "--r-btn": RADII[site.theme.radius].btn,
    "--r-card": RADII[site.theme.radius].card,
    "--r-img": RADII[site.theme.radius].img,
  } as CSSProperties;
}

function Img({
  site,
  image,
  className,
  priority = false,
}: {
  site: PublishedSite;
  image: WebsiteImage;
  className?: string;
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- photos servies par le logiciel, déjà redimensionnées
    <img
      src={imageUrl(site, image.fileId)}
      alt={image.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className={className}
    />
  );
}

function Wrap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[1200px] px-6 md:px-10 ${className}`}>{children}</div>
  );
}

function Eyebrow({
  n,
  children,
  onDark = false,
}: {
  n?: number;
  children: ReactNode;
  onDark?: boolean;
}) {
  return (
    <p
      className="flex items-center gap-3 text-[12.5px] font-medium tracking-[0.16em] uppercase"
      style={{ color: onDark ? "var(--accent-on-dark)" : "var(--accent-text)" }}
    >
      {n !== undefined ? <span className="tabular-nums">{String(n).padStart(2, "0")}</span> : null}
      {n !== undefined ? <span aria-hidden className="h-px w-8 bg-current opacity-50" /> : null}
      {children}
    </p>
  );
}

function Heading({
  n,
  eyebrow,
  title,
  intro,
  id,
}: {
  n: number;
  eyebrow: string;
  title: string;
  intro?: string;
  id: string;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:items-end md:gap-16">
      <div>
        <Eyebrow n={n}>{eyebrow}</Eyebrow>
        <h2 id={id} className="titre mt-5 text-[2.2rem] leading-[1.04] md:text-[3.4rem]">
          {title}
        </h2>
      </div>
      {intro ? (
        <p className="max-w-md text-[17px] leading-relaxed text-[var(--muted)]">{intro}</p>
      ) : null}
    </div>
  );
}

function ButtonLink({
  href,
  children,
  variant = "solid",
  onDark = false,
}: {
  href: string;
  children: ReactNode;
  variant?: "solid" | "line";
  onDark?: boolean;
}) {
  const solid = variant === "solid";
  return (
    <a
      href={href}
      className="group inline-flex h-12 items-center gap-2 px-6 text-[15px] font-medium transition-[transform,background-color] duration-200 hover:-translate-y-0.5"
      style={{
        borderRadius: "var(--r-btn)",
        background: solid ? "var(--accent)" : "transparent",
        color: solid ? "var(--on-accent)" : onDark ? "var(--on-dark)" : "var(--text)",
        boxShadow: solid
          ? "0 10px 30px -12px color-mix(in srgb, var(--accent) 70%, transparent)"
          : `inset 0 0 0 1px ${onDark ? "color-mix(in srgb, var(--on-dark) 35%, transparent)" : "var(--line)"}`,
      }}
    >
      {children}
    </a>
  );
}

export function Site({ site }: { site: PublishedSite }) {
  const { content: c } = site;
  const now = today(c);
  const address = [
    c.contact.address,
    [c.contact.postalCode, c.contact.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const cta = c.hero.ctaLabel || "Nous contacter";

  // Prestations : catalogue (par catégorie) puis prestations libres.
  const groups = new Map<string, { name: string; description: string; price: string }[]>();
  for (const p of site.catalog) {
    const key = p.category?.trim() || "";
    groups.set(key, [
      ...(groups.get(key) ?? []),
      {
        name: p.name,
        description: p.description ?? "",
        price: p.price !== null ? `${euros(p.price)} ${UNITS[p.unit] ?? ""}`.trim() : "",
      },
    ]);
  }
  if (c.services.items.length)
    groups.set(groups.has("") ? "Et aussi" : "", [
      ...(groups.get(groups.has("") ? "Et aussi" : "") ?? []),
      ...c.services.items,
    ]);
  const serviceCount = [...groups.values()].reduce((n, g) => n + g.length, 0);
  const showPricesNote = site.catalog.some((p) => p.price !== null);

  const news = [...c.news].sort((a, b) => b.date.localeCompare(a.date));
  const social = Object.entries(c.social).filter(([, v]) => v);
  const anchors: Record<string, string> = {
    about: "presentation",
    services: "prestations",
    gallery: "realisations",
    news: "actualites",
    hours: "contact",
    contact: "contact",
  };
  const navLabels: Record<string, string> = {
    about: "Présentation",
    services: "Prestations",
    gallery: "Réalisations",
    news: "Actualités",
  };
  const shown = c.sections.filter((s) => {
    if (s === "about") return Boolean(c.about.text || c.about.image);
    if (s === "services") return serviceCount > 0;
    if (s === "gallery") return c.gallery.images.length > 0;
    if (s === "news") return news.length > 0;
    return true;
  });
  const numbered = shown.filter((s) => s !== "hours" && s !== "contact");
  const num = (s: string) => (numbered as string[]).indexOf(s) + 1;
  const showContact = shown.includes("contact") || shown.includes("hours");

  const [lead, ...rest] = c.about.text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks: Record<string, ReactNode> = {
    about: (
      <section
        key="about"
        aria-labelledby="t-presentation"
        id="presentation"
        className="scroll-mt-24 py-24 md:py-32"
      >
        <Wrap>
          {c.about.image ? (
            <Heading
              n={num("about")}
              eyebrow="Présentation"
              title={c.about.title || "Qui sommes-nous"}
              id="t-presentation"
            />
          ) : null}
          <div
            className={`grid gap-12 ${c.about.image ? "mt-14 md:grid-cols-[1.1fr_1fr] md:gap-20" : "md:grid-cols-[0.9fr_1.1fr] md:gap-20"}`}
          >
            {!c.about.image ? (
              <div>
                <Eyebrow n={num("about")}>Présentation</Eyebrow>
                <h2
                  id="t-presentation"
                  className="titre mt-5 text-[2.2rem] leading-[1.04] md:text-[3.4rem]"
                >
                  {c.about.title || "Qui sommes-nous"}
                </h2>
              </div>
            ) : null}
            <div className={c.about.image ? "max-w-2xl" : "max-w-2xl md:pt-12"}>
              {lead ? (
                <p className="titre text-[1.55rem] leading-[1.35] md:text-[1.9rem]">{lead}</p>
              ) : null}
              {rest.length ? (
                <div className="mt-8 space-y-5 text-[17px] leading-[1.75] text-[var(--muted)]">
                  {rest.map((p, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {p}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
            {c.about.image ? (
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute -right-4 -bottom-4 h-2/3 w-2/3 md:-right-6 md:-bottom-6"
                  style={{ background: "var(--soft)", borderRadius: "var(--r-img)" }}
                />
                <Img
                  site={site}
                  image={c.about.image}
                  className="relative aspect-[4/5] w-full object-cover"
                />
              </div>
            ) : null}
          </div>
        </Wrap>
      </section>
    ),
    services: (
      <section
        key="services"
        aria-labelledby="t-prestations"
        id="prestations"
        className="scroll-mt-24 py-24 md:py-32"
        style={{ background: "var(--soft)" }}
      >
        <Wrap>
          <Heading
            n={num("services")}
            eyebrow="Prestations"
            title={c.services.title || "Nos prestations"}
            intro={c.services.intro || undefined}
            id="t-prestations"
          />
          <div
            className={`mt-14 grid gap-x-16 gap-y-12 ${groups.size > 1 && serviceCount > 6 ? "lg:grid-cols-2" : ""}`}
          >
            {[...groups.entries()].map(([group, items]) => (
              <div key={group || "_"}>
                {group ? (
                  <h3 className="mb-2 text-[13px] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                    {group}
                  </h3>
                ) : null}
                <ul
                  className={`border-t ${groups.size === 1 && items.length > 6 ? "grid gap-x-16 lg:grid-cols-2" : ""}`}
                  style={{ borderColor: "color-mix(in srgb, var(--text) 14%, transparent)" }}
                >
                  {items.map((s, i) => (
                    <li
                      key={`${s.name}-${i}`}
                      className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 border-b py-5"
                      style={{ borderColor: "color-mix(in srgb, var(--text) 14%, transparent)" }}
                    >
                      <span className="text-[17px] font-medium">{s.name}</span>
                      {s.price ? (
                        <span
                          className="text-right text-[16px] font-semibold whitespace-nowrap tabular-nums"
                          style={{ color: "var(--accent-text)" }}
                        >
                          {s.price}
                        </span>
                      ) : (
                        <span />
                      )}
                      {s.description ? (
                        <span className="col-span-2 max-w-xl text-[15px] leading-relaxed text-[var(--muted)]">
                          {s.description}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {showPricesNote ? (
            <p className="mt-8 text-sm text-[var(--muted)]">
              Prix indicatifs hors taxes. Chaque intervention fait l&apos;objet d&apos;un devis.
            </p>
          ) : null}
        </Wrap>
      </section>
    ),
    gallery: (
      <section
        key="gallery"
        aria-labelledby="t-realisations"
        id="realisations"
        className="scroll-mt-24 py-24 md:py-32"
      >
        <Wrap>
          <Heading
            n={num("gallery")}
            eyebrow="Réalisations"
            title={c.gallery.title || "Nos réalisations"}
            id="t-realisations"
          />
          <div className="mt-14 grid auto-rows-[180px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-4 md:gap-4">
            {c.gallery.images.slice(0, 9).map((image, i) => (
              <figure
                key={`${image.fileId}-${i}`}
                className={`group relative overflow-hidden ${i === 0 ? "col-span-2 row-span-2" : i === 3 ? "md:col-span-2" : ""}`}
                style={{ borderRadius: "var(--r-img)" }}
              >
                <Img
                  site={site}
                  image={image}
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                {image.alt ? (
                  <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-10 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {image.alt}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </Wrap>
      </section>
    ),
    news: (
      <section
        key="news"
        aria-labelledby="t-actualites"
        id="actualites"
        className="scroll-mt-24 py-24 md:py-32"
        style={{ background: "var(--soft)" }}
      >
        <Wrap>
          <Heading
            n={num("news")}
            eyebrow="Actualités"
            title="Les dernières nouvelles"
            id="t-actualites"
          />
          <ul
            className="mt-14 border-t"
            style={{ borderColor: "color-mix(in srgb, var(--text) 14%, transparent)" }}
          >
            {news.slice(0, 6).map((n) => (
              <li
                key={n.id}
                className="grid gap-6 border-b py-10 md:grid-cols-[180px_1fr_280px] md:gap-10"
                style={{ borderColor: "color-mix(in srgb, var(--text) 14%, transparent)" }}
              >
                <p className="text-sm text-[var(--muted)] tabular-nums">{dateFr(n.date)}</p>
                <div>
                  <h3 className="titre text-[1.6rem] leading-tight">{n.title}</h3>
                  {n.text ? (
                    <p className="mt-3 max-w-xl text-[16px] leading-relaxed whitespace-pre-line text-[var(--muted)]">
                      {n.text}
                    </p>
                  ) : null}
                </div>
                {n.image ? (
                  <Img site={site} image={n.image} className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <span className="hidden md:block" />
                )}
              </li>
            ))}
          </ul>
        </Wrap>
      </section>
    ),
  };

  return (
    <div style={palette(site)} className={`site police-${site.theme.font} min-h-dvh`}>
      {/* Bandeau d'informations pratiques */}
      {now || c.contact.area ? (
        <div
          className="hidden text-[13px] md:block"
          style={{ background: "var(--dark)", color: "var(--on-dark-muted)" }}
        >
          <Wrap className="flex h-10 items-center justify-between gap-6">
            <span className="flex items-center gap-2">
              {now ? (
                <>
                  <span className="relative flex size-2">
                    {now.open ? (
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
                    ) : null}
                    <span
                      className={`relative inline-flex size-2 rounded-full ${now.open ? "bg-emerald-400" : "bg-white/40"}`}
                    />
                  </span>
                  <span style={{ color: "var(--on-dark)" }}>
                    {now.open ? "Ouvert maintenant" : "Fermé pour le moment"}
                  </span>
                  {now.label ? <span>· aujourd&apos;hui {now.label}</span> : null}
                </>
              ) : null}
            </span>
            {c.contact.area ? <span>{c.contact.area}</span> : null}
          </Wrap>
        </div>
      ) : null}

      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          background: "color-mix(in srgb, var(--bg) 86%, transparent)",
          borderColor: "var(--line)",
        }}
      >
        <Wrap className="flex h-[72px] items-center justify-between gap-6">
          <a href="#haut" className="flex min-w-0 items-center gap-3">
            {c.logo ? (
              <Img
                site={site}
                image={c.logo}
                className="h-10 w-auto max-w-[150px] object-contain"
                priority
              />
            ) : null}
            <span className="titre truncate text-[1.2rem] leading-none">{c.name}</span>
          </a>
          <nav
            aria-label="Sections du site"
            className="hidden items-center gap-8 text-[15px] lg:flex"
          >
            {shown
              .filter((s) => navLabels[s])
              .map((s) => (
                <a
                  key={s}
                  href={`#${anchors[s]}`}
                  className="text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                >
                  {navLabels[s]}
                </a>
              ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {c.contact.phone ? (
              <a
                href={tel(c.contact.phone)}
                className="hidden items-center gap-2 px-3 text-[15px] font-medium md:inline-flex"
              >
                <Phone className="size-4" style={{ color: "var(--accent-text)" }} aria-hidden />{" "}
                {c.contact.phone}
              </a>
            ) : null}
            {showContact ? (
              <a
                href="#contact"
                className="inline-flex h-10 items-center px-4 text-sm font-medium"
                style={{
                  borderRadius: "var(--r-btn)",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                }}
              >
                {cta}
              </a>
            ) : null}
          </div>
        </Wrap>
      </header>

      <main id="haut">
        {/* Accueil */}
        {c.hero.image ? (
          <section aria-label="Accueil" className="relative overflow-hidden">
            <Wrap className="grid items-center gap-12 pt-14 pb-20 md:grid-cols-[1.05fr_1fr] md:gap-16 md:pt-20 md:pb-28">
              <div>
                {c.hero.eyebrow ? <Eyebrow>{c.hero.eyebrow}</Eyebrow> : null}
                <h1 className="titre mt-6 text-[2.7rem] leading-[1.02] md:text-[4.4rem]">
                  {c.hero.title}
                </h1>
                {c.hero.subtitle ? (
                  <p className="mt-7 max-w-lg text-[18px] leading-relaxed text-[var(--muted)] md:text-[19px]">
                    {c.hero.subtitle}
                  </p>
                ) : null}
                <div className="mt-10 flex flex-wrap gap-3">
                  {showContact ? (
                    <ButtonLink href="#contact">
                      {cta}{" "}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </ButtonLink>
                  ) : null}
                  {c.contact.phone ? (
                    <ButtonLink href={tel(c.contact.phone)} variant="line">
                      <Phone className="size-4" aria-hidden /> {c.contact.phone}
                    </ButtonLink>
                  ) : null}
                </div>
                {address || c.contact.area ? (
                  <p className="mt-10 flex items-start gap-2 text-[15px] text-[var(--muted)]">
                    <MapPin
                      className="mt-0.5 size-4 shrink-0"
                      style={{ color: "var(--accent-text)" }}
                      aria-hidden
                    />
                    {c.contact.area || address}
                  </p>
                ) : null}
              </div>
              <div className="relative">
                <div
                  className="overflow-hidden shadow-[0_40px_90px_-40px_rgba(0,0,0,0.45)]"
                  style={{ borderRadius: "var(--r-img)" }}
                >
                  <Img
                    site={site}
                    image={c.hero.image}
                    priority
                    className="aspect-[4/5] w-full object-cover md:aspect-[5/6]"
                  />
                </div>
                {now?.label ? (
                  <div
                    className="absolute -bottom-6 left-6 flex items-center gap-4 border p-4 pr-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.4)] md:-left-8"
                    style={{
                      background: "var(--card)",
                      borderColor: "var(--line)",
                      borderRadius: "var(--r-card)",
                    }}
                  >
                    <span
                      className="grid size-11 place-items-center rounded-full"
                      style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                    >
                      <Phone className="size-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-[13px] text-[var(--muted)]">
                        {now.open ? "Ouvert maintenant" : "Aujourd'hui"}
                      </span>
                      <span className="block text-[15px] font-semibold">{now.label}</span>
                    </span>
                  </div>
                ) : null}
              </div>
            </Wrap>
          </section>
        ) : (
          <section aria-label="Accueil" style={{ background: "var(--soft)" }}>
            <Wrap className="py-28 text-center md:py-40">
              {c.hero.eyebrow ? (
                <div className="flex justify-center">
                  <Eyebrow>{c.hero.eyebrow}</Eyebrow>
                </div>
              ) : null}
              <h1 className="titre mx-auto mt-6 max-w-4xl text-[2.8rem] leading-[1.02] md:text-[5rem]">
                {c.hero.title}
              </h1>
              {c.hero.subtitle ? (
                <p className="mx-auto mt-7 max-w-xl text-[18px] leading-relaxed text-[var(--muted)]">
                  {c.hero.subtitle}
                </p>
              ) : null}
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                {showContact ? (
                  <ButtonLink href="#contact">
                    {cta} <ArrowRight className="size-4" />
                  </ButtonLink>
                ) : null}
                {c.contact.phone ? (
                  <ButtonLink href={tel(c.contact.phone)} variant="line">
                    <Phone className="size-4" aria-hidden /> {c.contact.phone}
                  </ButtonLink>
                ) : null}
              </div>
            </Wrap>
          </section>
        )}

        {shown.filter((s) => blocks[s]).map((s) => blocks[s])}

        {/* Contact et horaires */}
        {showContact ? (
          <section
            id="contact"
            aria-labelledby="t-contact"
            className="scroll-mt-24"
            style={{ background: "var(--dark)", color: "var(--on-dark)" }}
          >
            <Wrap className="grid gap-14 py-24 md:grid-cols-[1fr_1.1fr] md:gap-20 md:py-32">
              <div>
                <Eyebrow onDark>Contact</Eyebrow>
                <h2
                  id="t-contact"
                  className="titre mt-5 text-[2.4rem] leading-[1.04] md:text-[3.6rem]"
                >
                  Parlons de votre projet.
                </h2>
                <ul className="mt-12 space-y-6 text-[17px]">
                  {c.contact.phone ? (
                    <li className="flex items-center gap-4">
                      <Phone
                        className="size-5 shrink-0"
                        style={{ color: "var(--accent-on-dark)" }}
                        aria-hidden
                      />
                      <a
                        href={tel(c.contact.phone)}
                        className="text-[1.35rem] font-medium hover:underline"
                      >
                        {c.contact.phone}
                      </a>
                    </li>
                  ) : null}
                  {c.contact.email ? (
                    <li className="flex items-center gap-4">
                      <Mail
                        className="size-5 shrink-0"
                        style={{ color: "var(--accent-on-dark)" }}
                        aria-hidden
                      />
                      <a href={`mailto:${c.contact.email}`} className="break-all hover:underline">
                        {c.contact.email}
                      </a>
                    </li>
                  ) : null}
                  {address ? (
                    <li className="flex items-start gap-4">
                      <MapPin
                        className="mt-1 size-5 shrink-0"
                        style={{ color: "var(--accent-on-dark)" }}
                        aria-hidden
                      />
                      <a
                        href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {address}
                      </a>
                    </li>
                  ) : null}
                  {c.contact.area ? (
                    <li className="flex items-start gap-4">
                      <Navigation
                        className="mt-1 size-5 shrink-0"
                        style={{ color: "var(--accent-on-dark)" }}
                        aria-hidden
                      />
                      <span>{c.contact.area}</span>
                    </li>
                  ) : null}
                </ul>

                {shown.includes("hours") && c.hours.days.length ? (
                  <div className="mt-14">
                    <h3
                      className="text-[13px] font-semibold tracking-[0.12em] uppercase"
                      style={{ color: "var(--on-dark-muted)" }}
                    >
                      Horaires
                    </h3>
                    <dl className="mt-4 text-[15px]">
                      {WEEK_DAYS.map((d) => {
                        const day = c.hours.days.find((x) => x.day === d.key);
                        const isToday = now?.day === d.key;
                        const text =
                          !day || day.closed || day.slots.length === 0
                            ? "Fermé"
                            : day.slots.map((s) => `${heure(s.from)} – ${heure(s.to)}`).join(" · ");
                        return (
                          <div
                            key={d.key}
                            className="flex justify-between gap-6 border-b py-2.5"
                            style={{
                              borderColor: "color-mix(in srgb, var(--on-dark) 12%, transparent)",
                              color: isToday ? "var(--on-dark)" : "var(--on-dark-muted)",
                              fontWeight: isToday ? 600 : 400,
                            }}
                          >
                            <dt>
                              {d.label}
                              {isToday ? " · aujourd'hui" : ""}
                            </dt>
                            <dd className="tabular-nums">{text}</dd>
                          </div>
                        );
                      })}
                    </dl>
                    {c.hours.note ? (
                      <p className="mt-4 text-[15px]" style={{ color: "var(--on-dark-muted)" }}>
                        {c.hours.note}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {c.contact.form && shown.includes("contact") ? (
                <div className="md:pt-4">
                  <ContactForm cta="Envoyer ma demande" />
                </div>
              ) : null}
            </Wrap>
          </section>
        ) : null}
      </main>

      <footer style={{ background: "var(--dark)", color: "var(--on-dark-muted)" }}>
        <Wrap>
          <div
            className="flex flex-col gap-6 border-t py-10 text-sm md:flex-row md:items-center md:justify-between"
            style={{ borderColor: "color-mix(in srgb, var(--on-dark) 12%, transparent)" }}
          >
            <p>
              <span className="titre text-[1.05rem]" style={{ color: "var(--on-dark)" }}>
                {c.name}
              </span>
              {address ? <span> · {address}</span> : null}
            </p>
            <p className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {social.map(([k, v]) => (
                <a
                  key={k}
                  href={v}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[var(--on-dark)]"
                >
                  {k[0]!.toUpperCase() + k.slice(1)}{" "}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              ))}
              <a href="/mentions-legales" className="hover:text-[var(--on-dark)]">
                Mentions légales
              </a>
              <span>© {new Date().getFullYear()}</span>
            </p>
          </div>
        </Wrap>
      </footer>
    </div>
  );
}
