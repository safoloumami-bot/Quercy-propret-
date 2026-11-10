"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CadreAuth } from "@/components/CadreAuth";
import { Bouton, Champ, Etiquette } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function Connexion() {
  const router = useRouter();
  const { connecter } = useStore();
  const [email, setEmail] = useState("camille@boulangerie-martin.fr");
  const [mdp, setMdp] = useState("demo-sebt");

  return (
    <CadreAuth titre="Bon retour parmi nous" sousTitre={<>Pas encore de compte ? <Link href="/inscription" className="font-medium text-encre underline underline-offset-4">Créez-en un</Link></>}>
      <div className="grid grid-cols-2 gap-2">
        <Bouton variante="secondaire" onClick={() => { connecter("Camille Martin", email, "Boulangerie Martin"); router.push("/app"); }}>Google</Bouton>
        <Bouton variante="secondaire" onClick={() => { connecter("Camille Martin", email, "Boulangerie Martin"); router.push("/app"); }}>GitHub</Bouton>
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-gris"><span className="h-px flex-1 bg-sable" />ou<span className="h-px flex-1 bg-sable" /></div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          connecter("Camille Martin", email, "Boulangerie Martin");
          router.push("/app");
        }}
      >
        <div>
          <Etiquette htmlFor="email">Email</Etiquette>
          <Champ id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex justify-between"><Etiquette htmlFor="mdp">Mot de passe</Etiquette><span className="text-[13px] text-gris">Oublié ?</span></div>
          <Champ id="mdp" type="password" required value={mdp} onChange={(e) => setMdp(e.target.value)} />
        </div>
        <Bouton type="submit" taille="lg" className="w-full">Se connecter</Bouton>
      </form>
      <p className="mt-4 text-center text-[13px] text-gris">Les identifiants de démonstration sont déjà remplis.</p>
    </CadreAuth>
  );
}
