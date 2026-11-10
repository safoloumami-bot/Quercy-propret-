import { PLANS, TRIAL_DAYS, formatCents } from "@quercy/core";
import {
  CalendarDaysIcon,
  CheckIcon,
  FileTextIcon,
  GlobeIcon,
  type LucideIcon,
  SmartphoneIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "sebt — le logiciel de gestion des entreprises de services",
  description:
    "Clients, devis, factures, planning des équipes, application terrain et site web : tout votre métier au même endroit. Essai gratuit, sans carte bancaire.",
};

/*
 * Vitrine de sebt : page d'accueil des visiteurs non connectés (le filtre de connexion y
 * renvoie « / »). Couleurs de la marque, pas les jetons de l'espace : brun très foncé et
 * sable, comme les écrans de connexion.
 */

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: UsersIcon,
    title: "Clients et contacts",
    text: "Toutes vos entreprises, contacts, affaires et échanges au même endroit, retrouvés en une seconde.",
  },
  {
    icon: FileTextIcon,
    title: "Devis et factures",
    text: "Devis en deux minutes, factures récurrentes, relances automatiques et facture électronique prête pour 2027.",
  },
  {
    icon: CalendarDaysIcon,
    title: "Planning des équipes",
    text: "Les interventions se planifient toutes seules à partir des contrats ; une absence se remplace en un clic.",
  },
  {
    icon: SmartphoneIcon,
    title: "Application terrain",
    text: "Vos agents pointent, prennent des photos et font signer le client sur leur téléphone, même sans réseau.",
  },
  {
    icon: GlobeIcon,
    title: "Votre site web",
    text: "Décrivez votre activité en quelques phrases : l'assistant rédige votre site, vous relisez et publiez.",
  },
  {
    icon: SparklesIcon,
    title: "Assistant intégré",
    text: "Posez une question, préparez une relance, lisez une facture fournisseur : l'assistant fait le travail, vous validez.",
  },
];

const TRADES = [
  "Nettoyage",
  "Plomberie",
  "Électricité",
  "Bâtiment",
  "Espaces verts",
  "Immobilier",
  "Sécurité",
  "Services à domicile",
];

const PRICED = (["FREE", "PRO", "BUSINESS"] as const).map((key) => PLANS[key]);

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#FBF8F2] text-[#1F1B16]">
      <header className="bg-[#110e0b] text-[#f5efe4]">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo vectoriel de la marque */}
          <img
            src="/brand/sebt-logo-sombre.svg"
            alt="sebt"
            width={78}
            height={31}
            className="h-7 w-auto"
          />
          <div className="flex items-center gap-2 text-sm">
            <a
              href="#tarifs"
              className="hidden px-3 py-2 text-[#f5efe4]/80 hover:text-[#f5efe4] sm:block"
            >
              Tarifs
            </a>
            <Link
              href="/connexion"
              className="rounded-lg px-3 py-2 text-[#f5efe4]/90 hover:bg-white/10"
            >
              Se connecter
            </Link>
            <Link
              href="/inscription"
              className="rounded-lg bg-[#e2c99f] px-3 py-2 font-medium text-[#110e0b] hover:bg-[#ecd8b6]"
            >
              Essai gratuit
            </Link>
          </div>
        </nav>

        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 -right-40 h-[620px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(226,201,159,0.2),transparent)] blur-2xl"
          />
          <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-20 md:px-8 md:pt-20 md:pb-28">
            <p className="font-mono text-xs tracking-wide text-[#e2c99f] uppercase">
              Logiciel de gestion
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-[-0.03em] md:text-6xl">
              Tout votre métier au même endroit.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#f5efe4]/75">
              Clients, devis, factures, planning des équipes, application terrain et site web : sebt
              réunit ce dont une entreprise de services a besoin, sur ordinateur comme sur
              téléphone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/inscription"
                className="rounded-xl bg-[#e2c99f] px-5 py-3 font-medium text-[#110e0b] hover:bg-[#ecd8b6]"
              >
                Essayer gratuitement {TRIAL_DAYS} jours
              </Link>
              <Link
                href="/connexion"
                className="rounded-xl border border-white/20 px-5 py-3 font-medium hover:bg-white/10"
              >
                J&apos;ai déjà un compte
              </Link>
            </div>
            <p className="mt-4 text-sm text-[#f5efe4]/60">
              Sans carte bancaire · Vos données circulent chiffrées et restent isolées par
              entreprise
            </p>
          </div>
        </section>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Les modules dont vous avez besoin, rien de plus.
          </h2>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="rounded-2xl border border-[#e8dcc6] bg-white p-6 shadow-xs"
              >
                <f.icon className="size-6 text-[#82623A]" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-[#5C5247]">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-[#F1E6D3]">
          <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
            <h2 className="text-2xl font-semibold tracking-tight">Pensé pour votre métier</h2>
            <p className="mt-2 max-w-2xl text-[#5C5247]">
              À l&apos;inscription, sebt s&apos;adapte à votre activité : prestations, modèles de
              devis et écrans utiles, prêts dès le premier jour.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {TRADES.map((t) => (
                <li key={t} className="rounded-full bg-white px-4 py-2 text-sm font-medium">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="tarifs" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 md:px-8 md:py-24">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Des prix simples</h2>
          <p className="mt-2 text-[#5C5247]">
            Prix hors taxes, par utilisateur et par mois. {TRIAL_DAYS} jours d&apos;essai de
            l&apos;offre Business, sans engagement.
          </p>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {PRICED.map((plan) => (
              <li
                key={plan.key}
                className={`flex flex-col rounded-2xl border bg-white p-6 ${
                  plan.key === "BUSINESS" ? "border-[#82623A] shadow-md" : "border-[#e8dcc6]"
                }`}
              >
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-[#5C5247]">{plan.tagline}</p>
                <p className="mt-4 text-3xl font-semibold tabular-nums">
                  {plan.monthlyPricePerSeat ? formatCents(plan.monthlyPricePerSeat) : "0 €"}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex gap-2">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-[#82623A]" aria-hidden />
                      {h}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/inscription"
                  className={`mt-6 rounded-xl px-4 py-2.5 text-center font-medium ${
                    plan.key === "BUSINESS"
                      ? "bg-[#82623A] text-white hover:bg-[#6f5331]"
                      : "border border-[#d9c9ad] hover:bg-[#F6F1E8]"
                  }`}
                >
                  {plan.key === "FREE" ? "Commencer gratuitement" : "Essayer gratuitement"}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-[#110e0b] text-[#f5efe4]">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between md:px-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Prêt à gagner du temps ?
              </h2>
              <p className="mt-2 text-[#f5efe4]/70">Votre espace est prêt en deux minutes.</p>
            </div>
            <Link
              href="/inscription"
              className="rounded-xl bg-[#e2c99f] px-5 py-3 font-medium text-[#110e0b] hover:bg-[#ecd8b6]"
            >
              Créer mon espace
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-[#5C5247] md:px-8">
        <span>© {new Date().getFullYear()} sebt</span>
        <div className="flex gap-4">
          <Link href="/installer" className="hover:text-[#1F1B16]">
            Installer l&apos;application
          </Link>
          <Link href="/connexion" className="hover:text-[#1F1B16]">
            Se connecter
          </Link>
        </div>
      </footer>
    </div>
  );
}
