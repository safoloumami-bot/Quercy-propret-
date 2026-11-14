"use client";

import { useState } from "react";
import { Users, KeyRound, ShieldCheck, Palette, Download, Plus, Copy } from "lucide-react";
import { TitrePage } from "@/components/app/Coque";
import { Bouton, Carte, Champ, Etiquette, Interrupteur, Pastille } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function Parametres() {
  const { etat, majCompte } = useStore();
  const [nom, setNom] = useState(etat.compte.nom);
  const [entreprise, setEntreprise] = useState(etat.compte.entreprise);
  const [ok, setOk] = useState(false);
  const studio = etat.compte.offreId === "studio";

  return (
    <>
      <TitrePage titre="Paramètres" description="Compte, sécurité, équipe et marque blanche." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Carte className="p-5">
          <p className="text-sm font-medium">Profil</p>
          <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); majCompte({ nom, entreprise }); setOk(true); setTimeout(() => setOk(false), 2000); }}>
            <div><Etiquette htmlFor="n">Nom</Etiquette><Champ id="n" value={nom} onChange={(e) => setNom(e.target.value)} /></div>
            <div><Etiquette htmlFor="e">Entreprise</Etiquette><Champ id="e" value={entreprise} onChange={(e) => setEntreprise(e.target.value)} /></div>
            <div><Etiquette>Email</Etiquette><Champ value={etat.compte.email} disabled /></div>
            <Bouton type="submit">{ok ? "Enregistré ✓" : "Enregistrer"}</Bouton>
          </form>
        </Carte>

        <div className="space-y-4">
          <Carte className="p-5">
            <p className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4 text-lagon-fonce" /> Sécurité</p>
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4"><div><p>Double authentification</p><p className="text-[13px] text-gris">Application TOTP ou clé de sécurité (passkey)</p></div><Interrupteur label="Double authentification" actif={etat.compte.doubleAuth} onChange={(v) => majCompte({ doubleAuth: v })} /></div>
              <div className="flex items-center justify-between gap-4"><div><p>Alertes de connexion</p><p className="text-[13px] text-gris">Email à chaque nouvel appareil</p></div><Interrupteur label="Alertes" actif onChange={() => {}} /></div>
            </div>
          </Carte>
          <Carte className="p-5">
            <p className="flex items-center gap-2 text-sm font-medium"><KeyRound className="size-4" /> Clés SSH et API</p>
            <div className="mt-3 space-y-2 font-mono text-[13px]">
              <div className="flex items-center justify-between rounded-xl bg-ecume/70 px-3 py-2"><span>ssh-ed25519 AAAAC3…k9Qz camille@mac</span><Pastille>SSH</Pastille></div>
              <div className="flex items-center justify-between rounded-xl bg-ecume/70 px-3 py-2"><span>sk_sil_live_••••••••3f2a</span><span className="flex items-center gap-2"><Copy className="size-3.5 text-gris" /><Pastille>API</Pastille></span></div>
            </div>
            <Bouton variante="secondaire" taille="sm" className="mt-3"><Plus className="size-3.5" /> Ajouter une clé</Bouton>
          </Carte>
        </div>

        <Carte className="p-5">
          <p className="flex items-center gap-2 text-sm font-medium"><Users className="size-4" /> Équipe</p>
          <div className="mt-4 divide-y divide-sable text-sm">
            {[[etat.compte.nom, etat.compte.email, "Propriétaire"], ["Julien Marty", "julien@agence-marty.fr", "Développeur"], ["Cabinet Lacombe", "compta@lacombe.fr", "Facturation seule"]].map(([n, m, r]) => (
              <div key={m} className="flex items-center justify-between py-2.5"><div><p>{n}</p><p className="text-[13px] text-gris">{m}</p></div><Pastille>{r}</Pastille></div>
            ))}
          </div>
          <Bouton variante="secondaire" taille="sm" className="mt-3"><Plus className="size-3.5" /> Inviter</Bouton>
        </Carte>

        <Carte className="p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium"><Palette className="size-4" /> Marque blanche</p>
            {!studio && <Pastille ton="ambre">Offre Studio</Pastille>}
          </div>
          <p className="mt-1 text-[13px] text-gris">Vos clients voient votre logo, vos couleurs et votre domaine (ex. hebergement.votre-agence.fr) au lieu de sebt.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 opacity-90">
            <div><Etiquette>Domaine du panneau</Etiquette><Champ placeholder="espace.votre-agence.fr" disabled={!studio} /></div>
            <div><Etiquette>Couleur principale</Etiquette><Champ type="color" defaultValue="#c9a97c" className="p-1" disabled={!studio} /></div>
          </div>
          {!studio && <Bouton taille="sm" className="mt-4" onClick={() => majCompte({ offreId: "studio" })}>Passer à Studio</Bouton>}
        </Carte>

        <Carte className="flex flex-wrap items-center justify-between gap-3 p-5 lg:col-span-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium"><Download className="size-4" /> Exporter toutes mes données</p>
            <p className="text-[13px] text-gris">Une archive standard : fichiers, bases SQL, emails (mbox), zones DNS et factures. Prête en quelques minutes.</p>
          </div>
          <Bouton variante="secondaire">Demander l&apos;export</Bouton>
        </Carte>
      </div>
    </>
  );
}
