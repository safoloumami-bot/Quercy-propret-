import { WEEK_DAYS, type WebsiteContent, type WebsiteImage } from "@quercy/core";
import { ArrowRight, ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { type CSSProperties, Fragment, type ReactNode } from "react";

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
    <div className={`mx-auto w-full max-w-[1280px] px-5 md:px-10 ${className}`}>{children}</div>
  );
}

/** Titre de section : petit libellé, grand titre, chapeau éventuel. */
function Eyebrow({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <p
      className="flex items-center gap-2.5 text-[12px] font-semibold tracking-[0.18em] uppercase"
      style={{ color: onDark ? "var(--accent-on-dark)" : "var(--accent-text)" }}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </p>
  );
}

/** Met en valeur la fin d'un titre (« Café de spécialité, *torréfié à Cahors* »). */
function Accent({ text }: { text: string }) {
  const cut = text.lastIndexOf(", ");
  if (cut < 8 || text.length - cut < 6) return <>{text}</>;
  return (
    <>
      {text.slice(0, cut + 1)} <em>{text.slice(cut + 2)}</em>
    </>
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
  variant?: "solid" | "line" | "light";
  onDark?: boolean;
}) {
  const styles: Record<string, CSSProperties> = {
    solid: {
      background: "var(--accent)",
      color: "var(--on-accent)",
    },
    light: { background: "#ffffff", color: "#141210" },
    line: {
      color: onDark ? "#ffffff" : "var(--text)",
      boxShadow: `inset 0 0 0 1px ${onDark ? "rgba(255,255,255,0.45)" : "color-mix(in srgb, var(--text) 25%, transparent)"}`,
    },
  };
  return (
    <a
      href={href}
      className="group inline-flex h-[52px] items-center gap-2.5 px-7 text-[15px] font-medium transition-[transform,opacity] duration-200 hover:-translate-y-0.5"
      style={{ borderRadius: "var(--r-btn)", ...styles[variant] }}
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
  const line = "color-mix(in srgb, var(--text) 13%, transparent)";

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
  if (c.services.items.length) {
    const key = groups.size ? "Et aussi" : "";
    groups.set(key, [...(groups.get(key) ?? []), ...c.services.items]);
  }
  const serviceCount = [...groups.values()].reduce((n, g) => n + g.length, 0);
  const hasPrices = [...groups.values()].some((g) => g.some((s) => s.price));
  const showPricesNote = site.catalog.some((p) => p.price !== null);

  const news = [...c.news].sort((a, b) => b.date.localeCompare(a.date));
  const social = Object.entries(c.social).filter(([, v]) => v);
  const anchors: Record<string, string> = {
    about: "presentation",
    services: "prestations",
    gallery: "photos",
    news: "actualites",
  };
  const navLabels: Record<string, string> = {
    about: "Présentation",
    services: c.services.title && c.services.title.length <= 14 ? c.services.title : "Prestations",
    gallery: "Photos",
    news: "Actualités",
  };
  const shown = c.sections.filter((s) => {
    if (s === "about") return Boolean(c.about.text || c.about.image);
    if (s === "services") return serviceCount > 0;
    if (s === "gallery") return c.gallery.images.length > 0;
    if (s === "news") return news.length > 0;
    return true;
  });
  const showContact = shown.includes("contact") || shown.includes("hours");
  const showHours = shown.includes("hours") && c.hours.days.length > 0;

  const [lead, ...rest] = c.about.text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const hoursList = WEEK_DAYS.map((d) => {
    const day = c.hours.days.find((x) => x.day === d.key);
    const text =
      !day || day.closed || day.slots.length === 0
        ? "Fermé"
        : day.slots.map((s) => `${heure(s.from)} – ${heure(s.to)}`).join(" · ");
    return { key: d.key, label: d.label, text, today: now?.day === d.key };
  });

  const status = now ? (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex size-2">
        {now.open ? (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
        ) : null}
        <span
          className={`relative inline-flex size-2 rounded-full ${now.open ? "bg-emerald-400" : "bg-current opacity-50"}`}
        />
      </span>
      {now.open ? "Ouvert maintenant" : "Fermé pour le moment"}
    </span>
  ) : null;

  const blocks: Record<string, ReactNode> = {
    about: (
      <section
        key="about"
        aria-labelledby="t-presentation"
        id="presentation"
        className="scroll-mt-20 py-24 md:py-36"
      >
        <Wrap>
          <div className="grid gap-8 md:grid-cols-12 md:gap-10">
            <div className="md:col-span-3 md:pt-4">
              <Eyebrow>Présentation</Eyebrow>
            </div>
            <div className="md:col-span-9">
              <h2
                id="t-presentation"
                className="titre max-w-[18ch] text-[2.5rem] leading-[1.02] md:text-[4.6rem]"
              >
                <Accent text={c.about.title || "Qui sommes-nous"} />
              </h2>
              {lead ? (
                <p className="mt-8 max-w-[34ch] text-[1.35rem] leading-[1.45] md:mt-10 md:text-[1.75rem]">
                  {lead}
                </p>
              ) : null}
            </div>
          </div>

          {c.about.image || rest.length ? (
            <div className="mt-16 grid gap-10 md:mt-24 md:grid-cols-12 md:gap-10">
              {c.about.image ? (
                <figure className="md:col-span-7">
                  <div className="overflow-hidden" style={{ borderRadius: "var(--r-img)" }}>
                    <Img
                      site={site}
                      image={c.about.image}
                      className="aspect-[4/3] w-full object-cover md:aspect-[7/6]"
                    />
                  </div>
                  {c.about.image.alt ? (
                    <figcaption className="mt-3 text-[13px] text-[var(--muted)]">
                      {c.about.image.alt}
                    </figcaption>
                  ) : null}
                </figure>
              ) : null}
              {rest.length ? (
                <div
                  className={`space-y-6 text-[17px] leading-[1.75] text-[var(--muted)] md:self-end ${c.about.image ? "md:col-span-4 md:col-start-9" : "md:col-span-6 md:col-start-4"}`}
                >
                  {rest.map((p, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {p}
                    </p>
                  ))}
                  <p className="titre pt-2 text-[1.3rem] text-[var(--text)]">— {c.name}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </Wrap>
      </section>
    ),
    services: (
      <section
        key="services"
        aria-labelledby="t-prestations"
        id="prestations"
        className="scroll-mt-20 py-24 md:py-36"
        style={{ background: "var(--soft)" }}
      >
        <Wrap className="grid gap-14 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-4">
            <div className="md:sticky md:top-28">
              <Eyebrow>{serviceCount && hasPrices ? "Tarifs" : "Ce que nous faisons"}</Eyebrow>
              <h2
                id="t-prestations"
                className="titre mt-6 text-[2.5rem] leading-[1.02] md:text-[3.6rem]"
              >
                <Accent text={c.services.title || "Nos prestations"} />
              </h2>
              {c.services.intro ? (
                <p className="mt-6 max-w-sm text-[17px] leading-relaxed text-[var(--muted)]">
                  {c.services.intro}
                </p>
              ) : null}
              {showContact ? (
                <a
                  href="#contact"
                  className="mt-8 inline-flex items-center gap-2 text-[15px] font-medium underline decoration-1 underline-offset-[6px] hover:decoration-2"
                  style={{ color: "var(--accent-text)" }}
                >
                  {cta} <ArrowRight className="size-4" aria-hidden />
                </a>
              ) : null}
            </div>
          </div>
          <div className="space-y-14 md:col-span-7 md:col-start-6">
            {[...groups.entries()].map(([group, items]) => (
              <div key={group || "_"}>
                {group ? (
                  <h3 className="titre mb-3 text-[1.6rem] leading-tight md:text-[1.9rem]">
                    {group}
                  </h3>
                ) : null}
                <ul>
                  {items.map((s, i) => (
                    <li
                      key={`${s.name}-${i}`}
                      className="border-b py-5 last:border-b-0"
                      style={{ borderColor: line }}
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="text-[17px] font-medium md:text-[18px]">{s.name}</span>
                        {s.price ? (
                          <>
                            <span aria-hidden className="pointilles" />
                            <span className="text-[16px] font-medium whitespace-nowrap tabular-nums md:text-[17px]">
                              {s.price}
                            </span>
                          </>
                        ) : null}
                      </div>
                      {s.description ? (
                        <p className="mt-1.5 max-w-[52ch] text-[15px] leading-relaxed text-[var(--muted)]">
                          {s.description}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {showPricesNote ? (
              <p className="text-[13px] text-[var(--muted)]">
                Prix indicatifs hors taxes. Chaque intervention fait l&apos;objet d&apos;un devis.
              </p>
            ) : null}
          </div>
        </Wrap>
      </section>
    ),
    gallery: (
      <section
        key="gallery"
        aria-labelledby="t-photos"
        id="photos"
        className="scroll-mt-20 py-24 md:py-36"
      >
        <Wrap>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <Eyebrow>En images</Eyebrow>
              <h2
                id="t-photos"
                className="titre mt-6 text-[2.5rem] leading-[1.02] md:text-[3.6rem]"
              >
                <Accent text={c.gallery.title || "Nos réalisations"} />
              </h2>
            </div>
            {c.social.instagram && c.gallery.images.length % 2 === 0 ? (
              <a
                href={c.social.instagram}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--muted)] hover:text-[var(--text)]"
              >
                Plus de photos sur Instagram <ArrowUpRight className="size-4" aria-hidden />
              </a>
            ) : null}
          </div>
          <div className="mt-14 grid gap-x-5 gap-y-10 md:grid-cols-12 md:gap-y-14">
            {c.gallery.images.slice(0, 8).map((image, i, all) => {
              // Rangées alternées 7/5 puis 5/7 ; une photo seule en fin de liste est décalée à droite, avec un renvoi à gauche.
              const alone = i === all.length - 1 && i % 2 === 0;
              const wide = alone || i % 4 === 0 || i % 4 === 3;
              const span = alone
                ? "md:col-span-7 md:col-start-6"
                : wide
                  ? "md:col-span-7"
                  : "md:col-span-5";
              return (
                <Fragment key={`${image.fileId}-${i}`}>
                  {alone && (c.social.instagram || showContact) ? (
                    <div className="hidden md:col-span-4 md:flex md:flex-col md:justify-end md:pb-10">
                      <p className="titre text-[2rem] leading-[1.1]">
                        {c.social.instagram ? (
                          <>
                            Et bien d&apos;autres <em>sur Instagram.</em>
                          </>
                        ) : (
                          <>
                            Le mieux, c&apos;est <em>de venir voir.</em>
                          </>
                        )}
                      </p>
                      <a
                        href={c.social.instagram || "#contact"}
                        {...(c.social.instagram ? { target: "_blank", rel: "noreferrer" } : {})}
                        className="mt-6 inline-flex items-center gap-2 text-[15px] font-medium underline decoration-1 underline-offset-[6px] hover:decoration-2"
                        style={{ color: "var(--accent-text)" }}
                      >
                        {c.social.instagram ? "Suivre nos actualités" : cta}
                        <ArrowUpRight className="size-4" aria-hidden />
                      </a>
                    </div>
                  ) : null}
                  <figure className={`group ${span}`}>
                    <div
                      className={`overflow-hidden md:h-[480px]`}
                      style={{ borderRadius: "var(--r-img)" }}
                    >
                      <Img
                        site={site}
                        image={image}
                        className="aspect-[4/3] w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03] md:aspect-auto md:h-full"
                      />
                    </div>
                    {image.alt ? (
                      <figcaption className="mt-3 flex gap-3 text-[14px] text-[var(--muted)]">
                        <span className="tabular-nums" style={{ color: "var(--accent-text)" }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {image.alt}
                      </figcaption>
                    ) : null}
                  </figure>
                </Fragment>
              );
            })}
          </div>
        </Wrap>
      </section>
    ),
    news: (
      <section
        key="news"
        aria-labelledby="t-actualites"
        id="actualites"
        className="scroll-mt-20 border-t py-24 md:py-36"
        style={{ borderColor: line }}
      >
        <Wrap>
          <Eyebrow>Actualités</Eyebrow>
          <h2
            id="t-actualites"
            className="titre mt-6 text-[2.5rem] leading-[1.02] md:text-[3.6rem]"
          >
            Du nouveau <em>chez nous</em>
          </h2>
          <ul className="mt-14 grid gap-x-8 gap-y-14 md:grid-cols-3">
            {news.slice(0, 6).map((n, i) => (
              <li key={n.id}>
                {n.image ? (
                  <div className="mb-6 overflow-hidden" style={{ borderRadius: "var(--r-img)" }}>
                    <Img site={site} image={n.image} className="aspect-[4/3] w-full object-cover" />
                  </div>
                ) : null}
                <p className="text-[13px] font-medium tracking-wide text-[var(--muted)] uppercase tabular-nums">
                  {dateFr(n.date)}
                </p>
                <h3 className="titre mt-3 text-[1.6rem] leading-[1.15]">{n.title}</h3>
                {n.text ? (
                  <p className="mt-3 text-[16px] leading-relaxed whitespace-pre-line text-[var(--muted)]">
                    {n.text}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Wrap>
      </section>
    ),
  };

  const heroActions = (onImage: boolean) => (
    <div className="flex flex-wrap gap-3">
      {showContact ? (
        <ButtonLink href="#contact" variant={onImage ? "light" : "solid"}>
          {cta}
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </ButtonLink>
      ) : null}
      {c.contact.phone ? (
        <span className="hidden sm:contents">
          <ButtonLink href={tel(c.contact.phone)} variant="line" onDark={onImage}>
            <Phone className="size-4" aria-hidden /> {c.contact.phone}
          </ButtonLink>
        </span>
      ) : null}
    </div>
  );

  return (
    <div style={palette(site)} className={`site police-${site.theme.font} min-h-dvh`}>
      <header
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{ background: "color-mix(in srgb, var(--bg) 88%, transparent)" }}
      >
        <Wrap className="flex h-[76px] items-center justify-between gap-6">
          <a href="#haut" className="flex min-w-0 items-center gap-3">
            {c.logo ? (
              <Img
                site={site}
                image={c.logo}
                className="h-10 w-auto max-w-[150px] object-contain"
                priority
              />
            ) : null}
            <span className="titre truncate text-[1.45rem] leading-none">{c.name}</span>
          </a>
          <nav
            aria-label="Sections du site"
            className="hidden items-center gap-9 text-[15px] lg:flex"
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
            {showContact ? (
              <a
                href="#contact"
                className="text-[var(--muted)] transition-colors hover:text-[var(--text)]"
              >
                {showHours ? "Horaires & accès" : "Contact"}
              </a>
            ) : null}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {c.contact.phone ? (
              <a
                href={tel(c.contact.phone)}
                className="hidden h-11 items-center gap-2 px-3 text-[15px] font-medium md:inline-flex"
              >
                {c.contact.phone}
              </a>
            ) : null}
            {showContact ? (
              <a
                href="#contact"
                className="hidden h-11 items-center px-5 text-[14px] font-medium sm:inline-flex"
                style={{
                  borderRadius: "var(--r-btn)",
                  background: "var(--text)",
                  color: "var(--bg)",
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
          <section aria-label="Accueil" className="px-2.5 md:px-4">
            <div
              className="relative isolate flex min-h-[640px] flex-col justify-end overflow-hidden text-white md:h-[calc(100svh-92px)] md:max-h-[880px] md:min-h-[620px]"
              style={{ borderRadius: "calc(var(--r-card) + 4px)" }}
            >
              <Img
                site={site}
                image={c.hero.image}
                priority
                className="absolute inset-0 -z-10 size-full object-cover"
              />
              <div aria-hidden className="absolute inset-0 -z-10 bg-black/35 md:hidden" />
              <div
                aria-hidden
                className="absolute inset-0 -z-10"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(10,8,6,0.05) 0%, rgba(10,8,6,0.1) 35%, rgba(10,8,6,0.78) 100%), linear-gradient(90deg, rgba(10,8,6,0.45) 0%, rgba(10,8,6,0) 60%)",
                }}
              />
              <div className="grid gap-10 p-6 pb-8 md:grid-cols-12 md:items-end md:p-14">
                <div className="md:col-span-8">
                  {c.hero.eyebrow ? (
                    <p className="text-[12px] font-semibold tracking-[0.2em] text-white/80 uppercase">
                      {c.hero.eyebrow}
                    </p>
                  ) : null}
                  <h1 className="titre mt-5 max-w-[14ch] text-[3rem] leading-[0.98] md:text-[5.8rem]">
                    <Accent text={c.hero.title} />
                  </h1>
                  {c.hero.subtitle ? (
                    <p className="mt-6 max-w-[44ch] text-[17px] leading-relaxed text-white/85 md:text-[19px]">
                      {c.hero.subtitle}
                    </p>
                  ) : null}
                  <div className="mt-9">{heroActions(true)}</div>
                </div>
                {now || address ? (
                  <div className="md:col-span-4 md:justify-self-end">
                    <div
                      className="w-full max-w-[340px] border border-white/20 bg-white/10 p-5 text-[14px] backdrop-blur-xl"
                      style={{ borderRadius: "var(--r-card)" }}
                    >
                      {now ? <p className="font-medium text-white">{status}</p> : null}
                      {now?.label ? (
                        <p className="mt-1 text-white/75">Aujourd&apos;hui · {now.label}</p>
                      ) : null}
                      {address ? (
                        <p
                          className={`flex items-start gap-2 text-white/75 ${now ? "mt-4 border-t border-white/15 pt-4" : ""}`}
                        >
                          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                          {address}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <section aria-label="Accueil">
            <Wrap className="py-24 md:py-40">
              {c.hero.eyebrow ? <Eyebrow>{c.hero.eyebrow}</Eyebrow> : null}
              <h1 className="titre mt-7 max-w-[16ch] text-[3rem] leading-[0.98] md:text-[6.4rem]">
                <Accent text={c.hero.title} />
              </h1>
              <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end">
                {c.hero.subtitle ? (
                  <p className="max-w-[44ch] text-[18px] leading-relaxed text-[var(--muted)] md:col-span-6 md:text-[20px]">
                    {c.hero.subtitle}
                  </p>
                ) : null}
                <div className="md:col-span-6 md:justify-self-end">{heroActions(false)}</div>
              </div>
              {now || c.contact.area ? (
                <div
                  className="mt-16 flex flex-wrap gap-x-10 gap-y-3 border-t pt-6 text-[15px] text-[var(--muted)]"
                  style={{ borderColor: line }}
                >
                  {now ? <span className="text-[var(--text)]">{status}</span> : null}
                  {now?.label ? <span>Aujourd&apos;hui · {now.label}</span> : null}
                  {c.contact.area ? <span>{c.contact.area}</span> : null}
                </div>
              ) : null}
            </Wrap>
          </section>
        )}

        {shown.filter((s) => blocks[s]).map((s) => blocks[s])}

        {/* Contact, horaires et accès */}
        {showContact ? (
          <section
            id="contact"
            aria-labelledby="t-contact"
            className="sur-sombre scroll-mt-20 px-2.5 pb-2.5 md:px-4 md:pb-4"
          >
            <div
              className="py-20 md:py-32"
              style={{
                background: "var(--dark)",
                color: "var(--on-dark)",
                borderRadius: "calc(var(--r-card) + 4px)",
              }}
            >
              <Wrap>
                <Eyebrow onDark>{showHours ? "Horaires & accès" : "Contact"}</Eyebrow>
                <h2
                  id="t-contact"
                  className="titre mt-6 max-w-[16ch] text-[2.6rem] leading-[1.02] md:text-[4.6rem]"
                >
                  {address ? (
                    <>
                      Appelez, écrivez <em>ou passez nous voir.</em>
                    </>
                  ) : (
                    <>
                      Appelez-nous <em>ou écrivez-nous.</em>
                    </>
                  )}
                </h2>

                <div className="mt-16 grid gap-14 md:grid-cols-12 md:gap-10">
                  <div className="space-y-12 md:col-span-5">
                    <dl className="space-y-7">
                      {c.contact.phone ? (
                        <div>
                          <dt className="text-[13px]" style={{ color: "var(--on-dark-muted)" }}>
                            Téléphone
                          </dt>
                          <dd className="mt-1.5">
                            <a
                              href={tel(c.contact.phone)}
                              className="titre text-[2rem] leading-none hover:underline md:text-[2.4rem]"
                            >
                              {c.contact.phone}
                            </a>
                          </dd>
                        </div>
                      ) : null}
                      {c.contact.email ? (
                        <div>
                          <dt className="text-[13px]" style={{ color: "var(--on-dark-muted)" }}>
                            Email
                          </dt>
                          <dd className="mt-1.5 text-[17px]">
                            <a
                              href={`mailto:${c.contact.email}`}
                              className="inline-flex items-center gap-2 break-all hover:underline"
                            >
                              <Mail className="size-4 shrink-0" aria-hidden /> {c.contact.email}
                            </a>
                          </dd>
                        </div>
                      ) : null}
                      {address ? (
                        <div>
                          <dt className="text-[13px]" style={{ color: "var(--on-dark-muted)" }}>
                            Adresse
                          </dt>
                          <dd className="mt-1.5 text-[17px]">
                            <a
                              href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-start gap-2 hover:underline"
                            >
                              <MapPin className="mt-1 size-4 shrink-0" aria-hidden /> {address}
                              <ArrowUpRight
                                className="mt-1 size-3.5 shrink-0 opacity-60"
                                aria-hidden
                              />
                            </a>
                          </dd>
                        </div>
                      ) : null}
                      {c.contact.area ? (
                        <div>
                          <dt className="text-[13px]" style={{ color: "var(--on-dark-muted)" }}>
                            Secteur
                          </dt>
                          <dd className="mt-1.5 text-[17px]">{c.contact.area}</dd>
                        </div>
                      ) : null}
                    </dl>

                    {showHours ? (
                      <div
                        className="border p-6 md:p-7"
                        style={{
                          borderColor: "color-mix(in srgb, var(--on-dark) 14%, transparent)",
                          borderRadius: "var(--r-card)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="text-[15px] font-semibold">Horaires</h3>
                          {now ? (
                            <span
                              className="text-[13px]"
                              style={{ color: now.open ? "#6ee7b7" : "var(--on-dark-muted)" }}
                            >
                              {status}
                            </span>
                          ) : null}
                        </div>
                        <dl className="mt-4 text-[15px]">
                          {hoursList.map((d) => (
                            <div
                              key={d.key}
                              className="flex justify-between gap-6 py-2"
                              style={{
                                color: d.today ? "var(--on-dark)" : "var(--on-dark-muted)",
                                fontWeight: d.today ? 600 : 400,
                              }}
                            >
                              <dt>{d.label}</dt>
                              <dd className="text-right tabular-nums">{d.text}</dd>
                            </div>
                          ))}
                        </dl>
                        {c.hours.note ? (
                          <p
                            className="mt-4 border-t pt-4 text-[14px] leading-relaxed"
                            style={{
                              color: "var(--on-dark-muted)",
                              borderColor: "color-mix(in srgb, var(--on-dark) 14%, transparent)",
                            }}
                          >
                            {c.hours.note}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {c.contact.form && shown.includes("contact") ? (
                    <div className="md:col-span-6 md:col-start-7">
                      <ContactForm cta="Envoyer mon message" />
                    </div>
                  ) : null}
                </div>
              </Wrap>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="pb-24 md:pb-0">
        <Wrap className="py-12 md:py-16">
          <p
            aria-hidden
            className="titre truncate text-[18vw] leading-[0.85] md:text-[10.5rem]"
            style={{ color: "color-mix(in srgb, var(--text) 9%, transparent)" }}
          >
            {c.name}
          </p>
          <div
            className="mt-10 flex flex-col gap-5 border-t pt-8 text-[14px] text-[var(--muted)] md:flex-row md:items-center md:justify-between"
            style={{ borderColor: line }}
          >
            <p>
              © {new Date().getFullYear()} {c.name}
              {address ? <span> · {address}</span> : null}
            </p>
            <p className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {social.map(([k, v]) => (
                <a
                  key={k}
                  href={v}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[var(--text)]"
                >
                  {k === "linkedin" ? "LinkedIn" : k[0]!.toUpperCase() + k.slice(1)}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              ))}
              <a href="/mentions-legales" className="hover:text-[var(--text)]">
                Mentions légales
              </a>
            </p>
          </div>
        </Wrap>
      </footer>

      {/* Mobile : appeler ou écrire, toujours à portée de pouce. */}
      {c.contact.phone || showContact ? (
        <div className="fixed inset-x-3 bottom-3 z-40 flex gap-2 md:hidden">
          {c.contact.phone ? (
            <a
              href={tel(c.contact.phone)}
              className="flex h-14 flex-1 items-center justify-center gap-2 text-[15px] font-medium shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45)]"
              style={{
                borderRadius: "var(--r-btn)",
                background: "var(--text)",
                color: "var(--bg)",
              }}
            >
              <Phone className="size-4" aria-hidden /> Appeler
            </a>
          ) : null}
          {showContact ? (
            <a
              href="#contact"
              className="flex h-14 flex-1 items-center justify-center gap-2 text-[15px] font-medium shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45)]"
              style={{
                borderRadius: "var(--r-btn)",
                background: "var(--accent)",
                color: "var(--on-accent)",
              }}
            >
              {showHours ? "Horaires & accès" : cta}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
