"use client";

import { useState } from "react";
import { Mail, Plus, Trash2, Forward, Inbox, Smartphone, ShieldCheck, CheckCircle2, Sparkles } from "lucide-react";
import { TitrePage, Modale } from "@/components/app/Coque";
import { Vide } from "@/components/app/commun";
import { Bouton, Carte, Champ, Etiquette, Jauge, LienBouton, Pastille } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function Emails() {
  const { etat, creerBoite, supprimerBoite } = useStore();
  const [modale, setModale] = useState(false);
  const [local, setLocal] = useState("");
  const [domaine, setDomaine] = useState(etat.domaines[0]?.nom ?? "");
  const [redir, setRedir] = useState("");
  const max = etat.compte.offreId === "essentiel" ? 5 : etat.compte.offreId === "pro" ? 50 : Infinity;
  const quota = etat.compte.offreId === "essentiel" ? 5 : etat.compte.offreId === "pro" ? 15 : 25;

  return (
    <>
      <TitrePage
        titre="Emails professionnels"
        description={`${etat.boites.length} boîte${etat.boites.length > 1 ? "s" : ""} sur ${max === Infinity ? "illimitées" : max} incluses dans votre offre.`}
        actions={<Bouton onClick={() => setModale(true)} disabled={!etat.domaines.length}><Plus className="size-4" /> Nouvelle adresse</Bouton>}
      />

      {!etat.domaines.length ? (
        <Vide icone={Mail} titre="Il vous faut d'abord un domaine" texte="Les adresses email utilisent votre nom de domaine (ex. contact@votre-entreprise.fr)." action={<LienBouton href="/app/domaines">Trouver un domaine</LienBouton>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Carte className="divide-y divide-sable">
            {etat.boites.length === 0 && <p className="p-6 text-sm text-gris">Aucune adresse pour l&apos;instant.</p>}
            {etat.boites.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="grid size-10 place-items-center rounded-full bg-ecume text-sm font-semibold uppercase">{b.adresse[0]}</span>
                <div className="min-w-48 flex-1">
                  <p className="font-medium">{b.adresse}</p>
                  {b.redirection ? <p className="flex items-center gap-1 text-[13px] text-gris"><Forward className="size-3" /> redirigée vers {b.redirection}</p> : <p className="text-[13px] text-gris">Boîte complète · IMAP, SMTP, webmail</p>}
                </div>
                <div className="w-40">
                  <div className="mb-1 flex justify-between text-xs text-gris"><span>{b.utiliseGo.toLocaleString("fr-FR")} Go</span><span>{b.quotaGo} Go</span></div>
                  <Jauge valeur={b.utiliseGo} max={b.quotaGo} />
                </div>
                <Bouton variante="secondaire" taille="sm"><Inbox className="size-3.5" /> Webmail</Bouton>
                <button aria-label="Supprimer" onClick={() => supprimerBoite(b.id)} className="cursor-pointer text-gris hover:text-corail"><Trash2 className="size-4" /></button>
              </div>
            ))}
          </Carte>
          <div className="space-y-4">
            <Carte className="p-5">
              <p className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4 text-lagon-fonce" /> Délivrabilité</p>
              <ul className="mt-3 space-y-2 text-[13px]">
                {["SPF configuré", "DKIM signé (2048 bits)", "DMARC en mode quarantaine", "Adresse IP hors liste noire"].map((x) => (
                  <li key={x} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-lagon" /> {x}</li>
                ))}
              </ul>
            </Carte>
            <Carte className="p-5 text-[13px]">
              <p className="flex items-center gap-2 text-sm font-medium"><Smartphone className="size-4" /> Configurer un appareil</p>
              <dl className="mt-3 space-y-1.5 font-mono">
                <div className="flex justify-between"><dt className="font-sans text-gris">IMAP</dt><dd>imap.sebt.email:993</dd></div>
                <div className="flex justify-between"><dt className="font-sans text-gris">SMTP</dt><dd>smtp.sebt.email:465</dd></div>
              </dl>
              <p className="mt-3 text-gris">Ou scannez le QR code de configuration automatique depuis le webmail (iPhone, Android, Outlook).</p>
            </Carte>
            <Carte className="p-5">
              <p className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-lagon-fonce" /> Réponses assistées</p>
              <p className="mt-2 text-[13px] text-gris">Dans le webmail, l&apos;IA propose des brouillons de réponse et trie les demandes clients. 1 crédit par brouillon.</p>
              <Pastille ton="lagon" className="mt-3">Inclus dans l&apos;offre Pro</Pastille>
            </Carte>
          </div>
        </div>
      )}

      <Modale ouverte={modale} fermer={() => setModale(false)} titre="Nouvelle adresse">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!local) return;
            creerBoite(`${local.toLowerCase().replace(/[^a-z0-9._-]/g, "")}@${domaine}`, quota, redir || undefined);
            setLocal(""); setRedir(""); setModale(false);
          }}
          className="space-y-4"
        >
          <div>
            <Etiquette>Adresse</Etiquette>
            <div className="flex items-center gap-1.5">
              <Champ value={local} onChange={(e) => setLocal(e.target.value)} placeholder="contact" className="flex-1" />
              <span className="text-gris">@</span>
              <select value={domaine} onChange={(e) => setDomaine(e.target.value)} className="h-10 cursor-pointer rounded-xl border border-sable bg-white px-2 text-sm">
                {etat.domaines.map((d) => <option key={d.id}>{d.nom}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Etiquette>Rediriger vers (facultatif)</Etiquette>
            <Champ type="email" value={redir} onChange={(e) => setRedir(e.target.value)} placeholder="Laisser vide pour une boîte complète" />
          </div>
          <p className="text-[13px] text-gris">Espace : {quota} Go. Le mot de passe initial est envoyé à {etat.compte.email}.</p>
          <div className="flex justify-end gap-2">
            <Bouton type="button" variante="secondaire" onClick={() => setModale(false)}>Annuler</Bouton>
            <Bouton type="submit">Créer</Bouton>
          </div>
        </form>
      </Modale>
    </>
  );
}
