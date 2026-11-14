"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  LayoutGrid, Layers, Wand2, Globe, Mail, Cpu, Bot, CreditCard, Settings, Bell, Sparkles, LogOut, Plus, Menu, X, RotateCcw, HelpCircle,
} from "lucide-react";
import { Logo, LienBouton, Bouton, cx } from "@/components/ui";
import { useStore, depuis } from "@/lib/store";
import { offresWeb } from "@/config/offres";

const liens = [
  { href: "/app", label: "Vue d'ensemble", icone: LayoutGrid },
  { href: "/app/sites", label: "Sites & applications", icone: Layers },
  { href: "/app/createur", label: "Créateur IA", icone: Wand2 },
  { href: "/app/domaines", label: "Domaines", icone: Globe },
  { href: "/app/emails", label: "Emails", icone: Mail },
  { href: "/app/vps", label: "Serveurs VPS", icone: Cpu },
  { href: "/app/agent", label: "Agent IA", icone: Bot },
];
const liensBas = [
  { href: "/app/facturation", label: "Facturation", icone: CreditCard },
  { href: "/app/parametres", label: "Paramètres", icone: Settings },
];

function Lien({ href, label, icone: I, actif, onClick }: { href: string; label: string; icone: typeof LayoutGrid; actif: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cx("flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] transition", actif ? "bg-ecume/10 text-ecume" : "text-ecume/55 hover:bg-ecume/5 hover:text-ecume")}
    >
      <I className={cx("size-[18px]", actif && "text-lagon")} />
      {label}
    </Link>
  );
}

export function Coque({ children }: { children: ReactNode }) {
  const chemin = usePathname();
  const router = useRouter();
  const { etat, pret, deconnecter, toutLu, reinitialiser } = useStore();
  const [menu, setMenu] = useState(false);
  const [notifs, setNotifs] = useState(false);
  const refNotifs = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const f = (e: MouseEvent) => {
      if (refNotifs.current && !refNotifs.current.contains(e.target as Node)) setNotifs(false);
    };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);

  if (!pret) return <div className="grid min-h-screen place-items-center bg-papier"><span className="size-6 animate-spin rounded-full border-2 border-lagon border-t-transparent" /></div>;

  if (!etat.connecte)
    return (
      <div className="grid min-h-screen place-items-center bg-papier p-6 text-center">
        <div>
          <Logo />
          <h1 className="titre mt-6 text-2xl">Vous êtes déconnecté</h1>
          <p className="mt-2 text-gris">Reconnectez-vous pour accéder à votre espace.</p>
          <div className="mt-6 flex justify-center gap-2">
            <LienBouton href="/connexion">Se connecter</LienBouton>
            <LienBouton href="/sites" variante="secondaire">Accueil</LienBouton>
          </div>
        </div>
      </div>
    );

  const offre = offresWeb.find((o) => o.id === etat.compte.offreId)!;
  const nonLues = etat.notifications.filter((n) => !n.lue).length;
  const estActif = (h: string) => (h === "/app" ? chemin === "/app" || chemin === "/app/" : chemin.startsWith(h));

  const barre = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/app"><Logo clair /></Link>
        <button className="text-ecume/60 lg:hidden" onClick={() => setMenu(false)} aria-label="Fermer"><X className="size-5" /></button>
      </div>
      <div className="px-3">
        <LienBouton href="/app/sites/nouveau" variante="lagon" className="w-full" >
          <Plus className="size-4" /> Nouveau projet
        </LienBouton>
      </div>
      <nav className="mt-5 flex-1 space-y-0.5 overflow-y-auto px-3">
        {liens.map((l) => <Lien key={l.href} {...l} actif={estActif(l.href)} onClick={() => setMenu(false)} />)}
        <div className="my-3 h-px bg-ecume/10" />
        {liensBas.map((l) => <Lien key={l.href} {...l} actif={estActif(l.href)} onClick={() => setMenu(false)} />)}
      </nav>
      <div className="m-3 rounded-2xl bg-ecume/[0.06] p-4">
        <div className="flex items-center justify-between text-[13px]">
          <span className="flex items-center gap-1.5 text-ecume/80"><Sparkles className="size-3.5 text-lagon" /> Crédits IA</span>
          <span className="font-medium text-ecume">{etat.compte.creditsIA}/{offre.creditsIA}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ecume/10">
          <div className="h-full rounded-full bg-lagon" style={{ width: `${Math.min(100, (etat.compte.creditsIA / offre.creditsIA) * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-ecume/45">Offre {offre.nom} · recharge le 1er du mois</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-papier lg:pl-64">
      <aside className="grain-sombre fixed inset-y-0 left-0 z-40 hidden w-64 bg-encre lg:block">{barre}</aside>
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-encre/40" onClick={() => setMenu(false)} />
          <aside className="grain-sombre absolute inset-y-0 left-0 w-72 bg-encre">{barre}</aside>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-sable bg-papier/90 px-5 backdrop-blur-md">
        <button className="lg:hidden" onClick={() => setMenu(true)} aria-label="Menu"><Menu className="size-5" /></button>
        <p className="hidden text-sm text-gris md:block">{etat.compte.entreprise}</p>
        <div className="flex-1" />
        <LienBouton href="/app/agent" variante="secondaire" taille="sm" className="hidden sm:inline-flex"><Bot className="size-3.5" /> Demander à l&apos;agent</LienBouton>
        <div className="relative" ref={refNotifs}>
          <button onClick={() => setNotifs(!notifs)} className="relative grid size-9 cursor-pointer place-items-center rounded-full hover:bg-encre/5" aria-label="Notifications">
            <Bell className="size-[18px]" />
            {nonLues > 0 && <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-corail text-[10px] font-semibold text-white">{nonLues}</span>}
          </button>
          {notifs && (
            <div className="absolute right-0 mt-2 w-[360px] animate-apparait overflow-hidden rounded-2xl border border-sable bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-sable px-4 py-3">
                <p className="text-sm font-medium">Notifications</p>
                <button onClick={toutLu} className="cursor-pointer text-xs text-gris hover:text-encre">Tout marquer comme lu</button>
              </div>
              <div className="defile max-h-96 overflow-y-auto">
                {etat.notifications.slice(0, 12).map((n) => (
                  <div key={n.id} className={cx("flex gap-3 border-b border-sable/60 px-4 py-3 text-[13px]", !n.lue && "bg-lagon-pale/30")}>
                    <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", n.ton === "ok" ? "bg-lagon" : n.ton === "alerte" ? "bg-corail" : "bg-encre/30")} />
                    <div>
                      <p>{n.texte}</p>
                      <p className="mt-0.5 text-xs text-gris">{depuis(n.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="group relative">
          <button className="grid size-9 cursor-pointer place-items-center rounded-full bg-encre text-[13px] font-semibold text-lagon">
            {etat.compte.nom.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()}
          </button>
          <div className="invisible absolute right-0 mt-2 w-60 rounded-2xl border border-sable bg-white p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{etat.compte.nom}</p>
              <p className="truncate text-xs text-gris">{etat.compte.email}</p>
            </div>
            <Link href="/app/parametres" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-encre/5"><Settings className="size-4" /> Paramètres</Link>
            <Link href="/sites" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-encre/5"><HelpCircle className="size-4" /> Site public</Link>
            <button onClick={reinitialiser} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-encre/5"><RotateCcw className="size-4" /> Réinitialiser la démo</button>
            <button onClick={() => { deconnecter(); router.push("/"); }} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#b8391c] hover:bg-corail-pale/50"><LogOut className="size-4" /> Se déconnecter</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">{children}</main>
    </div>
  );
}

export function TitrePage({ titre, description, actions }: { titre: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 className="titre text-3xl">{titre}</h1>
        {description && <p className="mt-1.5 text-[15px] text-gris">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Modale({ ouverte, fermer, titre, children, large }: { ouverte: boolean; fermer: () => void; titre: string; children: ReactNode; large?: boolean }) {
  useEffect(() => {
    if (!ouverte) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [ouverte, fermer]);
  if (!ouverte) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-encre/40 backdrop-blur-[2px]" onClick={fermer} />
      <div role="dialog" aria-modal aria-label={titre} className={cx("relative w-full animate-apparait rounded-3xl bg-white p-6 shadow-2xl", large ? "max-w-2xl" : "max-w-md")}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="titre text-xl">{titre}</h2>
          <Bouton variante="fantome" className="size-8 !px-0" onClick={fermer} aria-label="Fermer"><X className="size-4" /></Bouton>
        </div>
        {children}
      </div>
    </div>
  );
}
