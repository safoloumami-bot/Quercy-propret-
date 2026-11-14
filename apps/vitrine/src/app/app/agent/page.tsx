"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Check, ShieldCheck, Undo2, Sparkles, Database, Clock } from "lucide-react";
import { TitrePage } from "@/components/app/Coque";
import { Bouton, Carte, Interrupteur, Pastille, cx } from "@/components/ui";
import { useStore, depuis } from "@/lib/store";
import type { Site } from "@/lib/types";

interface Proposition {
  titre: string;
  etapes: string[];
  credits: number;
  appliquer: () => string; // renvoie le message de fin
  etat: "attente" | "appliquee" | "refusee";
}

interface Msg { qui: "vous" | "agent"; texte: string; proposition?: Proposition }

const suggestions = ["Mon site est lent", "Optimise recettes.boulangerie-martin.fr", "Pourquoi mon dernier déploiement a échoué ?", "Migre mon site existant", "Vérifie la sécurité", "Mes domaines expirent bientôt ?"];

function Agent() {
  const q = useSearchParams().get("q");
  const store = useStore();
  const { etat, majSite, sauvegarder, redeployer, journaliser, annulerAction, consommerCredits, majDomaine, creerSite } = store;
  const [messages, setMessages] = useState<Msg[]>([{ qui: "agent", texte: `Bonjour ${etat.compte.nom.split(" ")[0]} ! Je surveille ${etat.sites.length} site${etat.sites.length > 1 ? "s" : ""}, ${etat.domaines.length} domaine${etat.domaines.length > 1 ? "s" : ""} et ${etat.vps.length} serveur${etat.vps.length > 1 ? "s" : ""}. Je propose, vous validez : rien n'est modifié sans votre accord.` }]);
  const [saisie, setSaisie] = useState("");
  const [reflechit, setReflechit] = useState(false);
  const [attenteMigration, setAttenteMigration] = useState(false);
  const [auto, setAuto] = useState({ securite: true, certificats: true, cache: false, renouvellement: false });
  const fin = useRef<HTMLDivElement>(null);
  const lance = useRef(false);

  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, reflechit]);
  useEffect(() => {
    if (q && !lance.current) {
      lance.current = true;
      envoyer(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function trouverSite(t: string): Site | undefined {
    const tl = t.toLowerCase();
    return etat.sites.find((s) => tl.includes(s.domaine.toLowerCase()) || tl.includes(s.nom.toLowerCase())) ?? [...etat.sites].sort((a, b) => a.scorePerf - b.scorePerf)[0];
  }

  function repondre(t: string): Msg {
    const d = t.toLowerCase();

    if (attenteMigration) {
      setAttenteMigration(false);
      const url = t.match(/[a-z0-9-]+(\.[a-z0-9-]+)+/i)?.[0] ?? "ancien-site.fr";
      return {
        qui: "agent",
        texte: `J'ai inspecté ${url} : WordPress 6.4, 1,8 Go de fichiers, une base MySQL de 140 Mo et 3 boîtes mail. Voici le plan de migration, sans coupure :`,
        proposition: {
          titre: `Migrer ${url} vers sebt`,
          etapes: ["Copier fichiers et base de données", "Mettre à jour WordPress et les extensions sur la copie", "Vérifier les 25 pages principales (comparaison visuelle)", "Recréer les boîtes mail et copier les messages", "Basculer le DNS quand tout est validé"],
          credits: 10,
          etat: "attente",
          appliquer: () => {
            creerSite({ nom: url, type: "wordpress", pile: "WordPress 6.8 · PHP 8.4 (migré)" });
            journaliser({ cible: url, titre: "Migration lancée", detail: "Copie en cours. Le DNS ne sera basculé qu'après votre validation.", annulable: false });
            return `Migration lancée. La copie de ${url} apparaît dans vos projets. Je vous préviens quand la vérification visuelle est terminée, avant de toucher au DNS.`;
          },
        },
      };
    }

    if (/migr|transf[eé]r(er)? mon site|d[eé]m[eé]nag/.test(d)) {
      setAttenteMigration(true);
      return { qui: "agent", texte: "Avec plaisir, la migration est offerte. Quelle est l'adresse du site à migrer ? (Je vous demanderai ensuite un accès FTP ou à l'ancien tableau de bord.)" };
    }

    if (/lent|optimi|perf|rapide|vitesse|analyse/.test(d)) {
      const s = trouverSite(t);
      if (!s) return { qui: "agent", texte: "Vous n'avez pas encore de site à analyser." };
      const etapes: string[] = [];
      if (!s.cache) etapes.push("Activer le cache serveur et le CDN");
      if (s.type === "wordpress") etapes.push("Convertir 63 images en WebP/AVIF (-71 % de poids)", "Nettoyer la base (révisions, transients : 48 Mo)", "Désactiver 2 extensions inutilisées");
      else etapes.push("Précharger les polices et différer les scripts tiers");
      if (s.scorePerf >= 92 && s.cache)
        return { qui: "agent", texte: `${s.domaine} va bien : score ${s.scorePerf}/100, réponse en ${s.tempsReponseMs} ms, disponibilité ${s.disponibilite.toLocaleString("fr-FR")} %. Rien d'important à corriger. Je peux encore précharger les polices pour gagner ~80 ms si vous voulez.` };
      return {
        qui: "agent",
        texte: `Analyse de ${s.domaine} : score ${s.scorePerf}/100, réponse en ${s.tempsReponseMs} ms. ${!s.cache ? "Le cache est désactivé, c'est la cause principale. " : ""}Voici ce que je propose :`,
        proposition: {
          titre: `Optimiser ${s.domaine}`,
          etapes,
          credits: 10,
          etat: "attente",
          appliquer: () => {
            sauvegarder(s.id, "avant_action", "Avant optimisation par l'agent");
            const avant = s.tempsReponseMs;
            const scoreAvant = s.scorePerf;
            const apres = Math.max(140, Math.round(avant * (s.cache ? 0.7 : 0.35)));
            const scoreApres = Math.min(97, scoreAvant + (s.cache ? 9 : 27));
            majSite(s.id, (x) => { x.cache = true; x.tempsReponseMs = apres; x.scorePerf = scoreApres; x.co2gParVisite = Math.round(x.co2gParVisite * 0.6 * 100) / 100; });
            journaliser({ cible: s.domaine, titre: "Optimisation des performances", detail: `${etapes.length} actions. Réponse : ${avant} → ${apres} ms. Score : ${scoreAvant} → ${scoreApres}.`, annulable: true });
            return `Terminé. ${s.domaine} répond maintenant en ${apres} ms (avant : ${avant} ms) et le score passe de ${scoreAvant} à ${scoreApres}. Une sauvegarde a été faite avant ; vous pouvez tout annuler depuis l'historique.`;
          },
        },
      };
    }

    if (/erreur|[ée]chou|500|cass|panne|marche pas|bug/.test(d)) {
      const s = etat.sites.find((x) => x.deploiements.some((y) => y.statut === "echec"));
      if (!s) return { qui: "agent", texte: "Je ne vois aucune erreur récente : tous les déploiements sont réussis et les sites répondent. Pouvez-vous me dire sur quelle page vous voyez le problème ?" };
      const dep = s.deploiements.find((y) => y.statut === "echec")!;
      return {
        qui: "agent",
        texte: `Le déploiement « ${dep.message} » (${dep.commit}) sur ${s.domaine} a échoué ${depuis(dep.date)} : le test « calcul TVA » attend 20 % mais reçoit 0,2. La production n'a pas été touchée, elle tourne toujours sur la version précédente. Correctif probable : multiplier le taux par 100 dans lib/tva.ts, ligne 14.`,
        proposition: {
          titre: "Ouvrir une demande de correction",
          etapes: ["Créer une branche fix/tva", "Appliquer le correctif et relancer les tests", "Déployer un aperçu pour vérification"],
          credits: 5,
          etat: "attente",
          appliquer: () => {
            redeployer(s.id, "apercu", "fix: taux de TVA en pourcentage");
            journaliser({ cible: s.domaine, titre: "Correctif proposé (branche fix/tva)", detail: "Tests au vert. Aperçu déployé, à fusionner après relecture.", annulable: true });
            return "Correctif poussé sur la branche fix/tva, tests au vert. Un aperçu est en cours de déploiement : vérifiez-le dans l'onglet Déploiements, puis fusionnez sur GitHub.";
          },
        },
      };
    }

    if (/s[ée]curit|mise à jour|maj|malware|pirat/.test(d)) {
      const wp = etat.sites.filter((s) => s.type === "wordpress");
      return {
        qui: "agent",
        texte: `Analyse terminée : aucun fichier malveillant, certificats SSL valides, pare-feu actif. ${wp.length ? `${wp.length} site WordPress a 2 extensions avec une faille connue (gravité moyenne).` : "Aucune mise à jour critique en attente."}`,
        proposition: wp.length
          ? {
              titre: "Appliquer les mises à jour de sécurité",
              etapes: ["Sauvegarde préalable", "Mettre à jour 2 extensions", "Vérifier les pages principales", "Annuler automatiquement si une erreur apparaît"],
              credits: 3,
              etat: "attente",
              appliquer: () => {
                wp.forEach((s) => sauvegarder(s.id, "avant_action", "Avant mises à jour de sécurité"));
                journaliser({ cible: wp.map((s) => s.domaine).join(", "), titre: "Mises à jour de sécurité", detail: "2 extensions mises à jour, aucune régression détectée.", annulable: true });
                return "Mises à jour appliquées et vérifiées. Aucune régression détectée.";
              },
            }
          : undefined,
      };
    }

    if (/domaine|expir|renouvel/.test(d)) {
      const bientot = etat.domaines.filter((x) => !x.renouvellementAuto);
      if (!bientot.length) return { qui: "agent", texte: "Tous vos domaines sont en renouvellement automatique. Rien à faire." };
      return {
        qui: "agent",
        texte: `${bientot.map((x) => `${x.nom} expire ${depuis(x.expire).replace("il y a", "dans")}`).join(", ")} et n'est pas en renouvellement automatique. S'il expire, le site et les emails associés s'arrêteront.`,
        proposition: {
          titre: "Activer le renouvellement automatique",
          etapes: bientot.map((x) => `${x.nom} : renouvellement auto au même prix`),
          credits: 0,
          etat: "attente",
          appliquer: () => {
            bientot.forEach((x) => majDomaine(x.id, (y) => { y.renouvellementAuto = true; }));
            journaliser({ cible: bientot.map((x) => x.nom).join(", "), titre: "Renouvellement automatique activé", detail: "Vous serez prévenu 30 jours avant chaque prélèvement.", annulable: true });
            return "C'est fait. Je vous préviendrai 30 jours avant chaque prélèvement.";
          },
        },
      };
    }

    if (/sauvegard|backup/.test(d)) {
      etat.sites.forEach((s) => sauvegarder(s.id));
      return { qui: "agent", texte: `Sauvegarde manuelle lancée pour vos ${etat.sites.length} sites. Elles sont conservées 30 jours, dans un second centre de données.` };
    }

    if (/mail|spam|courrier/.test(d)) {
      return { qui: "agent", texte: `Vos ${etat.boites.length} boîtes sont en bonne santé : SPF, DKIM et DMARC valides, IP hors liste noire. ${etat.boites.filter((b) => b.utiliseGo / b.quotaGo > 0.75).map((b) => `Attention : ${b.adresse} est presque pleine.`).join(" ")}` };
    }

    return { qui: "agent", texte: "Je peux analyser et optimiser un site, expliquer une erreur de déploiement, migrer un site, vérifier la sécurité, gérer vos domaines, vos emails et vos serveurs. Essayez une des suggestions ci-dessous." };
  }

  async function envoyer(t = saisie) {
    if (!t.trim()) return;
    setSaisie("");
    setMessages((m) => [...m, { qui: "vous", texte: t }]);
    setReflechit(true);
    await new Promise((r) => setTimeout(r, 900));
    consommerCredits(1);
    const rep = repondre(t);
    setReflechit(false);
    setMessages((m) => [...m, rep]);
  }

  function decider(i: number, ok: boolean) {
    const msg = messages[i];
    if (!msg?.proposition || msg.proposition.etat !== "attente") return;
    let texte = "Entendu, je ne fais rien. Redemandez-moi si vous changez d'avis.";
    if (ok) {
      consommerCredits(msg.proposition.credits);
      texte = msg.proposition.appliquer();
    }
    const p = msg.proposition;
    setMessages((m) => {
      const copie = [...m];
      copie[i] = { ...msg, proposition: { ...p, etat: ok ? "appliquee" : "refusee" } };
      copie.push({ qui: "agent", texte });
      return copie;
    });
  }

  return (
    <>
      <TitrePage titre="Agent IA" description="Il diagnostique, propose et agit avec votre accord. 1 crédit par question, plus le coût affiché pour chaque action." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Carte className="flex h-[calc(100vh-15rem)] min-h-[520px] flex-col">
          <div className="defile flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((m, i) => (
              <div key={i} className={cx("flex gap-3", m.qui === "vous" && "justify-end")}>
                {m.qui === "agent" && <span className="grid size-8 shrink-0 place-items-center rounded-full bg-encre"><Bot className="size-4 text-lagon" /></span>}
                <div className={cx("max-w-[80%] rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed", m.qui === "vous" ? "bg-encre text-ecume" : "bg-ecume")}>
                  {m.texte}
                  {m.proposition && (
                    <div className="mt-3 rounded-xl bg-white p-4 ring-1 ring-sable">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{m.proposition.titre}</p>
                        {m.proposition.credits > 0 && <Pastille ton="lagon"><Sparkles className="size-3" /> {m.proposition.credits} crédits</Pastille>}
                      </div>
                      <ol className="mt-2 space-y-1 text-[13.5px] text-encre/75">
                        {m.proposition.etapes.map((e, k) => <li key={e} className="flex gap-2"><span className="text-gris">{k + 1}.</span>{e}</li>)}
                      </ol>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-gris"><Database className="size-3" /> Sauvegarde automatique avant toute modification</p>
                      {m.proposition.etat === "attente" ? (
                        <div className="mt-3 flex gap-2">
                          <Bouton taille="sm" variante="lagon" onClick={() => decider(i, true)}><Check className="size-3.5" /> Appliquer</Bouton>
                          <Bouton taille="sm" variante="secondaire" onClick={() => decider(i, false)}>Non merci</Bouton>
                        </div>
                      ) : (
                        <p className={cx("mt-3 text-[13px] font-medium", m.proposition.etat === "appliquee" ? "text-lagon-fonce" : "text-gris")}>{m.proposition.etat === "appliquee" ? "✓ Appliquée" : "Refusée"}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {reflechit && (
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-encre"><Bot className="size-4 text-lagon" /></span>
                <span className="text-sm text-gris">Analyse en cours…</span>
              </div>
            )}
            <div ref={fin} />
          </div>
          <div className="border-t border-sable p-4">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {suggestions.map((s) => <button key={s} onClick={() => envoyer(s)} className="cursor-pointer rounded-full bg-ecume px-3 py-1 text-xs text-encre/70 hover:text-encre">{s}</button>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); envoyer(); }} className="flex items-center gap-2 rounded-2xl border border-sable p-1.5 pl-4 focus-within:border-encre/30">
              <input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder={attenteMigration ? "Adresse du site à migrer (ex. monsite.fr)" : "Posez une question ou décrivez un problème…"} className="flex-1 bg-transparent text-sm outline-none" />
              <Bouton type="submit" className="size-9 !px-0" aria-label="Envoyer" disabled={reflechit}><ArrowUp className="size-4" /></Bouton>
            </form>
          </div>
        </Carte>

        <div className="space-y-4">
          <Carte className="p-5">
            <p className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4 text-lagon-fonce" /> Autorisations permanentes</p>
            <p className="mt-1 text-[13px] text-gris">Actions que l&apos;agent peut faire seul, avec sauvegarde préalable.</p>
            <div className="mt-4 space-y-3 text-sm">
              {([
                ["securite", "Mises à jour de sécurité"],
                ["certificats", "Renouvellement des certificats"],
                ["cache", "Vider le cache après un déploiement"],
                ["renouvellement", "Renouveler les domaines"],
              ] as const).map(([k, l]) => (
                <div key={k} className="flex items-center justify-between gap-3"><span>{l}</span><Interrupteur label={l} actif={auto[k]} onChange={(v) => setAuto({ ...auto, [k]: v })} /></div>
              ))}
            </div>
          </Carte>
          <Carte className="p-5">
            <p className="flex items-center gap-2 text-sm font-medium"><Clock className="size-4" /> Historique des actions</p>
            <ul className="mt-3 space-y-3">
              {etat.actions.length === 0 && <li className="text-[13px] text-gris">Aucune action.</li>}
              {etat.actions.slice(0, 8).map((a) => (
                <li key={a.id} className={cx("rounded-xl bg-ecume/60 p-3 text-[13px]", a.annulee && "opacity-50")}>
                  <p className={cx("font-medium", a.annulee && "line-through")}>{a.titre}</p>
                  <p className="mt-0.5 text-gris">{a.detail}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gris">
                    <span>{a.cible} · {depuis(a.date)}</span>
                    {a.annulable && !a.annulee && <button onClick={() => annulerAction(a.id)} className="flex cursor-pointer items-center gap-1 font-medium text-encre hover:text-corail"><Undo2 className="size-3" /> Annuler</button>}
                  </div>
                </li>
              ))}
            </ul>
          </Carte>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Agent />
    </Suspense>
  );
}
