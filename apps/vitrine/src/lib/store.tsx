"use client";

// État de l'espace client, simulé dans le navigateur (localStorage).
// Chaque action correspond à une future route d'API : voir docs/ARCHITECTURE.md.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Etat, Site, TypeSite, ActionAgent, EnregistrementDns, Compte } from "./types";
import type { SiteGenere } from "./generateur";
import { etatDemo, uid, ilYa, dansJours } from "./donnees-demo";

const CLE = "sebt-demo-v2";

const etatVide: Etat = { ...etatDemo(), connecte: false };

export function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "projet";
}

function ip() {
  return `82.165.${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 250) + 2}`;
}

function useStoreInterne() {
  const [etat, setEtat] = useState<Etat>(etatVide);
  const [pret, setPret] = useState(false);
  const minuteurs = useRef<number[]>([]);

  useEffect(() => {
    try {
      const brut = localStorage.getItem(CLE);
      if (brut) setEtat(JSON.parse(brut) as Etat);
    } catch {
      /* stockage indisponible : on garde l'état par défaut */
    }
    setPret(true);
    const t = minuteurs.current;
    return () => t.forEach((id) => clearTimeout(id));
  }, []);

  useEffect(() => {
    if (!pret) return;
    try {
      localStorage.setItem(CLE, JSON.stringify(etat));
    } catch {
      /* ignore */
    }
  }, [etat, pret]);

  const maj = useCallback((f: (e: Etat) => void) => {
    setEtat((prev) => {
      const e = structuredClone(prev);
      f(e);
      return e;
    });
  }, []);

  const plusTard = useCallback((ms: number, f: () => void) => {
    minuteurs.current.push(window.setTimeout(f, ms));
  }, []);

  const notifier = (e: Etat, texte: string, ton: "info" | "ok" | "alerte" = "info") => {
    e.notifications.unshift({ id: uid(), date: new Date().toISOString(), texte, ton, lue: false });
  };

  const terminerDeploiement = useCallback(
    (siteId: string, depId: string, ms = 5200) => {
      plusTard(ms, () =>
        maj((e) => {
          const s = e.sites.find((x) => x.id === siteId);
          const d = s?.deploiements.find((x) => x.id === depId);
          if (!s || !d) return;
          d.statut = "reussi";
          d.dureeSec = Math.round(ms / 1000) + 18;
          if (d.environnement === "production") s.statut = "en_ligne";
          notifier(e, `Déploiement réussi sur ${s.domaine} (${d.dureeSec} s).`, "ok");
        }),
      );
    },
    [maj, plusTard],
  );

  const actions = useMemo(
    () => ({
      connecter(nom: string, email: string, entreprise?: string) {
        setEtat(etatDemo(nom || "Camille Martin", email || "camille@boulangerie-martin.fr", entreprise || "Mon entreprise"));
      },
      inscrireVide(nom: string, email: string, entreprise: string, offreId: Compte["offreId"]) {
        const e = etatDemo(nom, email, entreprise);
        e.compte.offreId = offreId;
        e.compte.creditsIA = offreId === "essentiel" ? 150 : offreId === "pro" ? 600 : 2500;
        e.sites = [];
        e.domaines = [];
        e.boites = [];
        e.vps = [];
        e.factures = [];
        e.actions = [];
        e.notifications = [{ id: uid(), date: new Date().toISOString(), texte: "Bienvenue sur sebt ! Votre essai gratuit de 14 jours commence maintenant.", ton: "ok", lue: false }];
        setEtat(e);
      },
      deconnecter() {
        maj((e) => {
          e.connecte = false;
        });
      },
      reinitialiser() {
        setEtat(etatDemo());
      },
      majCompte(p: Partial<Compte>) {
        maj((e) => Object.assign(e.compte, p));
      },
      consommerCredits(n: number) {
        maj((e) => {
          e.compte.creditsIA = Math.max(0, e.compte.creditsIA - n);
        });
      },

      creerSite(p: { nom: string; type: TypeSite; pile: string; depot?: string; branche?: string; genere?: SiteGenere }) {
        const id = uid();
        const depId = uid();
        const domaine = `${slug(p.nom)}.sebt.site`;
        maj((e) => {
          const s: Site = {
            id,
            nom: p.nom,
            type: p.type,
            domaine,
            statut: "deploiement",
            region: "Europe (Francfort)",
            creeLe: new Date().toISOString(),
            depot: p.depot,
            branche: p.branche,
            pile: p.pile,
            visites7j: [0, 0, 0, 0, 0, 0, 0],
            stockageMo: p.type === "wordpress" ? 180 : 24,
            disponibilite: 100,
            tempsReponseMs: p.type === "wordpress" ? 290 : 120,
            scorePerf: p.type === "wordpress" ? 82 : 98,
            co2gParVisite: 0.15,
            deploiements: [
              {
                id: depId,
                date: new Date().toISOString(),
                branche: p.branche ?? "main",
                commit: Math.random().toString(16).slice(2, 9),
                message: p.type === "ia" ? "Première publication" : p.type === "wordpress" ? "Installation de WordPress" : "Déploiement initial",
                statut: "en_cours",
                dureeSec: 0,
                environnement: "production",
              },
            ],
            sauvegardes: [],
            variables: p.type === "git" || p.type === "docker" ? [{ cle: "NODE_ENV", valeur: "production" }] : [],
            cache: true,
            preproduction: false,
            genere: p.genere,
          };
          e.sites.unshift(s);
        });
        terminerDeploiement(id, depId);
        return id;
      },
      redeployer(siteId: string, environnement: "production" | "preproduction" | "apercu" = "production", message = "Redéploiement manuel") {
        const depId = uid();
        maj((e) => {
          const s = e.sites.find((x) => x.id === siteId);
          if (!s) return;
          if (environnement === "production") s.statut = "deploiement";
          s.deploiements.unshift({
            id: depId,
            date: new Date().toISOString(),
            branche: environnement === "apercu" ? "feat/apercu" : s.branche ?? "main",
            commit: Math.random().toString(16).slice(2, 9),
            message,
            statut: "en_cours",
            dureeSec: 0,
            environnement,
          });
        });
        terminerDeploiement(siteId, depId, 4200);
      },
      majSite(siteId: string, f: (s: Site) => void) {
        maj((e) => {
          const s = e.sites.find((x) => x.id === siteId);
          if (s) f(s);
        });
      },
      sauvegarder(siteId: string, type: "manuelle" | "avant_action" = "manuelle", note?: string) {
        maj((e) => {
          const s = e.sites.find((x) => x.id === siteId);
          if (!s) return;
          s.sauvegardes.unshift({ id: uid(), date: new Date().toISOString(), type, tailleMo: s.stockageMo, note });
          if (type === "manuelle") notifier(e, `Sauvegarde manuelle de ${s.domaine} créée.`, "ok");
        });
      },
      restaurer(siteId: string, sauvegardeId: string) {
        maj((e) => {
          const s = e.sites.find((x) => x.id === siteId);
          const b = s?.sauvegardes.find((x) => x.id === sauvegardeId);
          if (!s || !b) return;
          s.sauvegardes.unshift({ id: uid(), date: new Date().toISOString(), type: "avant_action", tailleMo: s.stockageMo, note: "Avant restauration" });
          s.statut = "deploiement";
          notifier(e, `Restauration de ${s.domaine} au ${new Date(b.date).toLocaleString("fr-FR")} lancée.`, "info");
        });
        plusTard(3500, () =>
          maj((e) => {
            const s = e.sites.find((x) => x.id === siteId);
            if (s) s.statut = "en_ligne";
            if (s) notifier(e, `${s.domaine} a été restauré.`, "ok");
          }),
        );
      },
      supprimerSite(siteId: string) {
        maj((e) => {
          e.sites = e.sites.filter((s) => s.id !== siteId);
          e.domaines.forEach((d) => {
            if (d.siteId === siteId) d.siteId = undefined;
          });
        });
      },

      acheterDomaine(nom: string, siteId?: string) {
        maj((e) => {
          if (e.domaines.some((d) => d.nom === nom)) return;
          e.domaines.unshift({
            id: uid(),
            nom,
            statut: "en_attente",
            expire: dansJours(365),
            renouvellementAuto: true,
            protectionWhois: true,
            siteId,
            dns: [
              { id: uid(), type: "A", nom: "@", valeur: "185.230.63.107", ttl: 3600 },
              { id: uid(), type: "CNAME", nom: "www", valeur: nom, ttl: 3600 },
              { id: uid(), type: "MX", nom: "@", valeur: "10 mx1.sebt.email", ttl: 3600 },
            ],
          });
          notifier(e, `Enregistrement de ${nom} en cours. Il sera actif d'ici quelques minutes.`, "info");
        });
        plusTard(4000, () =>
          maj((e) => {
            const d = e.domaines.find((x) => x.nom === nom);
            if (d) d.statut = "actif";
            notifier(e, `${nom} est actif.`, "ok");
          }),
        );
      },
      majDomaine(id: string, f: (d: Etat["domaines"][number]) => void) {
        maj((e) => {
          const d = e.domaines.find((x) => x.id === id);
          if (d) f(d);
        });
      },
      ajouterDns(id: string, r: Omit<EnregistrementDns, "id">) {
        maj((e) => {
          e.domaines.find((x) => x.id === id)?.dns.push({ ...r, id: uid() });
        });
      },
      lierDomaine(domaineId: string, siteId: string | undefined) {
        maj((e) => {
          const d = e.domaines.find((x) => x.id === domaineId);
          if (!d) return;
          d.siteId = siteId;
          const s = e.sites.find((x) => x.id === siteId);
          if (s) {
            s.domaine = d.nom;
            notifier(e, `${d.nom} pointe maintenant vers « ${s.nom} ». Certificat SSL émis.`, "ok");
          }
        });
      },

      creerBoite(adresse: string, quotaGo: number, redirection?: string) {
        maj((e) => {
          if (e.boites.some((b) => b.adresse === adresse)) return;
          e.boites.push({ id: uid(), adresse, quotaGo, utiliseGo: 0, redirection });
          notifier(e, `Boîte ${adresse} créée.`, "ok");
        });
      },
      supprimerBoite(id: string) {
        maj((e) => {
          e.boites = e.boites.filter((b) => b.id !== id);
        });
      },

      creerVps(nom: string, offreId: string, image: string, region: string) {
        const id = uid();
        maj((e) => {
          e.vps.unshift({ id, nom, offreId, image, region, ip: ip(), statut: "creation", creeLe: new Date().toISOString(), cpu: Array(24).fill(0), ramUtiliseGo: 0 });
        });
        plusTard(6000, () =>
          maj((e) => {
            const v = e.vps.find((x) => x.id === id);
            if (!v) return;
            v.statut = "actif";
            v.cpu = Array.from({ length: 24 }, (_, i) => Math.round(4 + 6 * Math.abs(Math.sin(i))));
            v.ramUtiliseGo = 0.6;
            notifier(e, `Le serveur ${nom} est prêt (${v.ip}).`, "ok");
          }),
        );
        return id;
      },
      basculerVps(id: string) {
        maj((e) => {
          const v = e.vps.find((x) => x.id === id);
          if (v && v.statut !== "creation") v.statut = v.statut === "actif" ? "arrete" : "actif";
        });
      },
      supprimerVps(id: string) {
        maj((e) => {
          e.vps = e.vps.filter((v) => v.id !== id);
        });
      },

      journaliser(a: Omit<ActionAgent, "id" | "date">) {
        maj((e) => {
          e.actions.unshift({ ...a, id: uid(), date: new Date().toISOString() });
        });
      },
      annulerAction(id: string) {
        maj((e) => {
          const a = e.actions.find((x) => x.id === id);
          if (a) {
            a.annulee = true;
            notifier(e, `Action annulée : ${a.titre}.`, "info");
          }
        });
      },
      toutLu() {
        maj((e) => e.notifications.forEach((n) => (n.lue = true)));
      },
    }),
    [maj, plusTard, terminerDeploiement],
  );

  return { etat, pret, ...actions };
}

type Store = ReturnType<typeof useStoreInterne>;
const Ctx = createContext<Store | null>(null);

export function FournisseurStore({ children }: { children: ReactNode }) {
  const store = useStoreInterne();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore doit être utilisé dans <FournisseurStore>");
  return s;
}

export const dateCourte = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
export const dateHeure = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export function depuis(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  return j < 30 ? `il y a ${j} j` : dateCourte(iso);
}
export { ilYa };
