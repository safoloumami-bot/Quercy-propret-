"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowUp, Monitor, Tablet, Smartphone, Undo2, Rocket, Sparkles, Wand2, Check, RotateCcw } from "lucide-react";
import { TitrePage } from "@/components/app/Coque";
import { ApercuSite } from "@/components/ApercuSite";
import { Bouton, Carte, Pastille, cx } from "@/components/ui";
import { useStore } from "@/lib/store";
import { genererSite, modifierSite, exemplesPrompts, type SiteGenere } from "@/lib/generateur";

interface Message { qui: "vous" | "ia"; texte: string }

const suggestions = ["Passe en bleu", "Thème sombre", "Plus élégant", "Grande image en haut", "Ajoute une FAQ", "Titre : Le meilleur pain de la ville"];

function Createur() {
  const router = useRouter();
  const siteId = useSearchParams().get("site");
  const { etat, creerSite, majSite, redeployer, consommerCredits } = useStore();
  const existant = etat.sites.find((s) => s.id === siteId);

  const [description, setDescription] = useState("");
  const [genere, setGenere] = useState<SiteGenere | null>(existant?.genere ?? null);
  const [historique, setHistorique] = useState<SiteGenere[]>([]);
  const [messages, setMessages] = useState<Message[]>(existant ? [{ qui: "ia", texte: `Vous modifiez « ${existant.nom} ». Dites-moi ce que vous voulez changer.` }] : []);
  const [saisie, setSaisie] = useState("");
  const [appareil, setAppareil] = useState<"bureau" | "tablette" | "mobile">("bureau");
  const [enCours, setEnCours] = useState(false);
  const [modifie, setModifie] = useState(false);
  const finChat = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (existant?.genere && !genere) setGenere(existant.genere);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existant?.id]);

  useEffect(() => { finChat.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages]);

  async function generer(texte = description) {
    if (!texte.trim()) return;
    setEnCours(true);
    await new Promise((r) => setTimeout(r, 1600));
    const g = genererSite(texte);
    consommerCredits(5);
    setGenere(g);
    setHistorique([]);
    setMessages([
      { qui: "vous", texte },
      { qui: "ia", texte: `Voici une première version pour « ${g.nom} » : ${g.sections.length} sections, textes rédigés et direction artistique adaptés à votre activité. Les éléments entre crochets sont à compléter. Que voulez-vous ajuster ?` },
    ]);
    setEnCours(false);
    setModifie(true);
  }

  async function envoyer(texte = saisie) {
    if (!texte.trim() || !genere) return;
    setSaisie("");
    setMessages((m) => [...m, { qui: "vous", texte }]);
    setEnCours(true);
    await new Promise((r) => setTimeout(r, 700));
    const { site, reponse } = modifierSite(genere, texte);
    setHistorique((h) => [...h, genere]);
    setGenere(site);
    consommerCredits(1);
    setMessages((m) => [...m, { qui: "ia", texte: reponse }]);
    setEnCours(false);
    setModifie(true);
  }

  function annuler() {
    const prec = historique.at(-1);
    if (!prec) return;
    setGenere(prec);
    setHistorique((h) => h.slice(0, -1));
    setMessages((m) => [...m, { qui: "ia", texte: "Dernière modification annulée." }]);
  }

  function publier() {
    if (!genere) return;
    if (existant) {
      majSite(existant.id, (s) => { s.genere = genere; s.nom = genere.nom; });
      redeployer(existant.id, "production", "Modifications du créateur IA");
      setModifie(false);
      router.push(`/app/sites/detail?id=${existant.id}`);
    } else {
      const id = creerSite({ nom: genere.nom, type: "ia", pile: "Créateur IA", genere });
      router.push(`/app/sites/detail?id=${id}`);
    }
  }

  if (!genere)
    return (
      <>
        <TitrePage titre="Créateur IA" description="Décrivez votre activité en une phrase ou deux. Une génération coûte 5 crédits, chaque modification 1 crédit." />
        <Carte className="mx-auto max-w-3xl p-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Ex. : Je suis paysagiste à Nantes, je veux présenter mes réalisations et recevoir des demandes de devis. Couleur verte."
            className="w-full resize-none bg-transparent p-4 text-[15px] outline-none placeholder:text-gris/70"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generer(); } }}
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <Pastille ton="lagon"><Sparkles className="size-3" /> {etat.compte.creditsIA} crédits disponibles</Pastille>
            <Bouton onClick={() => generer()} disabled={enCours || !description.trim()}>
              {enCours ? <span className="size-4 animate-spin rounded-full border-2 border-lagon border-t-transparent" /> : <Wand2 className="size-4" />} Générer mon site
            </Bouton>
          </div>
        </Carte>
        <div className="mx-auto mt-6 grid max-w-3xl gap-2 sm:grid-cols-2">
          {exemplesPrompts.map((p) => (
            <button key={p} onClick={() => { setDescription(p); generer(p); }} className="cursor-pointer rounded-2xl border border-sable bg-white p-4 text-left text-sm text-encre/75 transition hover:border-encre/25 hover:text-encre">{p}</button>
          ))}
        </div>
      </>
    );

  const largeur = { bureau: "w-full", tablette: "w-[768px]", mobile: "w-[390px]" }[appareil];

  return (
    <div className="-mx-5 -my-8 flex h-[calc(100vh-4rem)] flex-col md:-mx-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sable bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <p className="titre text-lg">{genere.nom}</p>
          <Pastille>{genere.secteur}</Pastille>
          {modifie && <Pastille ton="ambre">Non publié</Pastille>}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-ecume p-1">
          {([["bureau", Monitor], ["tablette", Tablet], ["mobile", Smartphone]] as const).map(([k, I]) => (
            <button key={k} onClick={() => setAppareil(k)} aria-label={k} className={cx("grid size-8 cursor-pointer place-items-center rounded-full transition", appareil === k ? "bg-white shadow-sm" : "text-gris")}>
              <I className="size-4" />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Bouton variante="secondaire" taille="sm" onClick={annuler} disabled={!historique.length}><Undo2 className="size-3.5" /> Annuler</Bouton>
          {!existant && <Bouton variante="secondaire" taille="sm" onClick={() => { setGenere(null); setMessages([]); }}><RotateCcw className="size-3.5" /> Recommencer</Bouton>}
          <Bouton taille="sm" onClick={publier}><Rocket className="size-3.5" /> {existant ? "Publier les modifications" : "Publier le site"}</Bouton>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[360px] shrink-0 flex-col border-r border-sable bg-white">
          <div className="defile flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={cx("flex", m.qui === "vous" ? "justify-end" : "")}>
                <div className={cx("max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed", m.qui === "vous" ? "bg-encre text-ecume" : "bg-ecume")}>
                  {m.qui === "ia" && <Sparkles className="mb-1 size-3.5 text-lagon-fonce" />}
                  {m.texte}
                </div>
              </div>
            ))}
            {enCours && <div className="flex gap-1 px-2"><span className="size-1.5 animate-bounce rounded-full bg-gris" /><span className="size-1.5 animate-bounce rounded-full bg-gris [animation-delay:.1s]" /><span className="size-1.5 animate-bounce rounded-full bg-gris [animation-delay:.2s]" /></div>}
            <div ref={finChat} />
          </div>
          <div className="border-t border-sable p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button key={s} onClick={() => envoyer(s)} className="cursor-pointer rounded-full bg-ecume px-2.5 py-1 text-xs text-encre/70 hover:text-encre">{s}</button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); envoyer(); }} className="flex items-center gap-2 rounded-2xl border border-sable p-1.5 pl-3 focus-within:border-encre/30">
              <input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Demandez une modification…" className="flex-1 bg-transparent text-sm outline-none" />
              <Bouton type="submit" className="size-8 !px-0" aria-label="Envoyer" disabled={enCours}><ArrowUp className="size-4" /></Bouton>
            </form>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-gris"><Check className="size-3" /> {etat.compte.creditsIA} crédits restants · 1 crédit par modification</p>
          </div>
        </aside>
        <div className="grain defile flex-1 overflow-auto bg-ecume/60 p-6">
          <div className={cx("mx-auto overflow-hidden rounded-xl border border-sable bg-white shadow-xl transition-all", largeur)}>
            <ApercuSite site={genere} compact={appareil === "mobile"} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Createur />
    </Suspense>
  );
}
