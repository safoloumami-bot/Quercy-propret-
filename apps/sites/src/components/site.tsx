import { WEBSITE_SECTIONS, WEEK_DAYS, type WebsiteImage } from "@quercy/core";
import { Mail, MapPin, Navigation, Phone } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { type PublishedSite, imageUrl } from "@/lib/api";

import { ContactForm } from "./contact-form";

const UNITS: Record<string, string> = {
  unit: "l'unité",
  hour: "l'heure",
  day: "la journée",
  flat: "forfait",
  month: "par mois",
  sqm: "le m²",
  kg: "le kg",
};
const RADII = { net: "4px", doux: "14px", pilule: "28px" } as const;
const euros = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: n % 1 ? 2 : 0,
  });
/** « 08:00 » → « 8 h », « 12:30 » → « 12 h 30 ». */
const heure = (hhmm: string) => {
  const [h, m] = hhmm.split(":");
  return `${Number(h)} h${m && m !== "00" ? ` ${m}` : ""}`;
};
const dateFr = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

function Img({
  site,
  image,
  className,
}: {
  site: PublishedSite;
  image: WebsiteImage;
  className?: string;
}) {
  // eslint-disable-next-line @next/next/no-img-element -- photos servies par le logiciel, déjà redimensionnées
  return (
    <img src={imageUrl(site, image.fileId)} alt={image.alt} loading="lazy" className={className} />
  );
}

function Section({
  id,
  title,
  intro,
  soft,
  children,
}: {
  id: string;
  title?: string;
  intro?: string;
  soft?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={soft ? "bg-doux" : undefined}>
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        {title ? <h2 className="text-3xl md:text-4xl">{title}</h2> : null}
        {intro ? <p className="mt-4 max-w-2xl text-lg opacity-75">{intro}</p> : null}
        <div className={title || intro ? "mt-12" : undefined}>{children}</div>
      </div>
    </section>
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-4 text-lg leading-relaxed opacity-85">
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
    </div>
  );
}

export function Site({ site }: { site: PublishedSite }) {
  const { content: c, theme } = site;
  const vars = {
    "--accent": theme.accent,
    "--bg": theme.background,
    "--text": theme.text,
    "--soft": theme.soft,
    "--radius": RADII[theme.radius],
  } as CSSProperties;
  const labels = Object.fromEntries(WEBSITE_SECTIONS.map((s) => [s.key, s.label]));
  const nav = c.sections.filter((s) => s !== "contact");
  const address = [
    c.contact.address,
    [c.contact.postalCode, c.contact.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const services = [
    ...site.catalog.map((p) => ({
      name: p.name,
      description: p.description ?? "",
      price: p.price !== null ? `${euros(p.price)} HT ${UNITS[p.unit] ?? ""}`.trim() : "",
    })),
    ...c.services.items,
  ];
  const news = [...c.news].sort((a, b) => b.date.localeCompare(a.date));
  const social = Object.entries(c.social).filter(([, v]) => v);
  const cta = c.hero.ctaLabel || "Nous contacter";

  const blocks: Record<string, ReactNode> = {
    about:
      c.about.text || c.about.image ? (
        <Section key="about" id="presentation" title={c.about.title || undefined}>
          <div className={c.about.image ? "grid items-center gap-12 md:grid-cols-2" : "max-w-3xl"}>
            {c.about.text ? <Paragraphs text={c.about.text} /> : null}
            {c.about.image ? (
              <Img
                site={site}
                image={c.about.image}
                className="aspect-[4/3] w-full rounded-[var(--radius)] object-cover"
              />
            ) : null}
          </div>
        </Section>
      ) : null,
    services:
      services.length > 0 ? (
        <Section
          key="services"
          id="prestations"
          title={c.services.title || undefined}
          intro={c.services.intro || undefined}
          soft
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <article
                key={`${s.name}-${i}`}
                className="bg-fond flex flex-col rounded-[var(--radius)] p-6 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.25)]"
              >
                <h3 className="text-lg">{s.name}</h3>
                {s.description ? (
                  <p className="mt-2 text-[15px] leading-relaxed opacity-75">{s.description}</p>
                ) : null}
                {s.price ? (
                  <p className="mt-auto pt-5 text-[15px] font-semibold text-accent">{s.price}</p>
                ) : null}
              </article>
            ))}
          </div>
        </Section>
      ) : null,
    gallery:
      c.gallery.images.length > 0 ? (
        <Section key="gallery" id="photos" title={c.gallery.title || undefined}>
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {c.gallery.images.map((image, i) => (
              <Img
                key={`${image.fileId}-${i}`}
                site={site}
                image={image}
                className="mb-4 w-full break-inside-avoid rounded-[var(--radius)]"
              />
            ))}
          </div>
        </Section>
      ) : null,
    news:
      news.length > 0 ? (
        <Section key="news" id="actualites" title="Actualités" soft>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {news.map((n) => (
              <article key={n.id} className="bg-fond overflow-hidden rounded-[var(--radius)]">
                {n.image ? (
                  <Img site={site} image={n.image} className="aspect-[16/10] w-full object-cover" />
                ) : null}
                <div className="p-6">
                  <p className="text-sm opacity-60">{dateFr(n.date)}</p>
                  <h3 className="mt-1 text-xl">{n.title}</h3>
                  {n.text ? (
                    <p className="mt-3 leading-relaxed whitespace-pre-line opacity-80">{n.text}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </Section>
      ) : null,
    hours:
      c.hours.days.length > 0 ? (
        <Section key="hours" id="horaires" title="Horaires">
          <div className="max-w-xl">
            <dl className="divide-y divide-current/10 border-y border-current/10">
              {WEEK_DAYS.map((d) => {
                const day = c.hours.days.find((x) => x.day === d.key);
                return (
                  <div key={d.key} className="flex justify-between py-3 text-[16px]">
                    <dt className="font-medium">{d.label}</dt>
                    <dd className={!day || day.closed ? "opacity-55" : undefined}>
                      {!day || day.closed || day.slots.length === 0
                        ? "Fermé"
                        : day.slots.map((s) => `${heure(s.from)} – ${heure(s.to)}`).join(" · ")}
                    </dd>
                  </div>
                );
              })}
            </dl>
            {c.hours.note ? <p className="mt-4 opacity-75">{c.hours.note}</p> : null}
          </div>
        </Section>
      ) : null,
    contact: (
      <Section key="contact" id="contact" title="Contact" soft>
        <div className="grid gap-12 md:grid-cols-[1fr_1.2fr]">
          <ul className="space-y-5 text-lg">
            {c.contact.phone ? (
              <li className="flex gap-3">
                <Phone className="mt-1 size-5 shrink-0 text-accent" aria-hidden />
                <a href={`tel:${c.contact.phone.replace(/\s/g, "")}`} className="hover:underline">
                  {c.contact.phone}
                </a>
              </li>
            ) : null}
            {c.contact.email ? (
              <li className="flex gap-3">
                <Mail className="mt-1 size-5 shrink-0 text-accent" aria-hidden />
                <a href={`mailto:${c.contact.email}`} className="break-all hover:underline">
                  {c.contact.email}
                </a>
              </li>
            ) : null}
            {address ? (
              <li className="flex gap-3">
                <MapPin className="mt-1 size-5 shrink-0 text-accent" aria-hidden />
                <span>{address}</span>
              </li>
            ) : null}
            {c.contact.area ? (
              <li className="flex gap-3">
                <Navigation className="mt-1 size-5 shrink-0 text-accent" aria-hidden />
                <span>{c.contact.area}</span>
              </li>
            ) : null}
            {social.length ? (
              <li className="flex flex-wrap gap-4 pt-2 text-base">
                {social.map(([k, v]) => (
                  <a
                    key={k}
                    href={v}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    {k[0]!.toUpperCase() + k.slice(1)}
                  </a>
                ))}
              </li>
            ) : null}
          </ul>
          {c.contact.form ? <ContactForm cta="Envoyer" /> : null}
        </div>
      </Section>
    ),
  };

  return (
    <div style={vars} className={`bg-fond text-texte min-h-dvh police-${theme.font}`}>
      <header className="bg-fond/90 sticky top-0 z-20 border-b border-current/10 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <a href="#" className="flex min-w-0 items-center gap-3">
            {c.logo ? (
              <Img site={site} image={c.logo} className="h-9 w-auto max-w-[140px] object-contain" />
            ) : null}
            <span className="truncate text-lg font-semibold tracking-tight">{c.name}</span>
          </a>
          <nav aria-label="Sections" className="hidden items-center gap-6 text-[15px] md:flex">
            {nav.map((s) => (
              <a
                key={s}
                href={`#${{ about: "presentation", services: "prestations", gallery: "photos", news: "actualites", hours: "horaires" }[s] ?? s}`}
                className="opacity-75 hover:opacity-100"
              >
                {labels[s]}
              </a>
            ))}
          </nav>
          <a
            href="#contact"
            className="shrink-0 rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            {cta}
          </a>
        </div>
      </header>

      <main>
        <section
          className={c.hero.image ? "relative isolate overflow-hidden text-white" : "bg-doux"}
        >
          {c.hero.image ? (
            <>
              <Img
                site={site}
                image={c.hero.image}
                className="absolute inset-0 -z-10 size-full object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/45 to-black/10"
              />
            </>
          ) : null}
          <div className="mx-auto max-w-6xl px-6 py-28 md:py-40">
            {c.hero.eyebrow ? (
              <p className="text-sm font-medium tracking-wide uppercase opacity-85">
                {c.hero.eyebrow}
              </p>
            ) : null}
            <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] md:text-6xl">{c.hero.title}</h1>
            {c.hero.subtitle ? (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed opacity-90 md:text-xl">
                {c.hero.subtitle}
              </p>
            ) : null}
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="#contact"
                className="rounded-[var(--radius)] bg-accent px-6 py-3.5 font-medium text-white"
              >
                {cta}
              </a>
              {c.contact.phone ? (
                <a
                  href={`tel:${c.contact.phone.replace(/\s/g, "")}`}
                  className={`rounded-[var(--radius)] px-6 py-3.5 font-medium ring-1 ${c.hero.image ? "ring-white/60" : "ring-current/25"}`}
                >
                  {c.contact.phone}
                </a>
              ) : null}
            </div>
          </div>
        </section>

        {c.sections.map((key) => blocks[key])}
      </main>

      <footer className="border-t border-current/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm opacity-75 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {c.name}
            {address ? ` · ${address}` : ""}
          </p>
          <p className="flex gap-5">
            <a href="/mentions-legales" className="hover:underline">
              Mentions légales
            </a>
            <span>Site réalisé avec sebt</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
