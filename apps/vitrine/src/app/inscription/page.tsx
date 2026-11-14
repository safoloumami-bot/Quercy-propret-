"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CadreAuth } from "@/components/CadreAuth";
import { Bouton, Champ, Etiquette, cx } from "@/components/ui";
import { useStore } from "@/lib/store";
import { offresWeb } from "@/config/offres";
import { genererSite } from "@/lib/generateur";
import { siteMemorise } from "@/lib/site-memorise";
import type { Compte } from "@/lib/types";

function Formulaire() {
  const router = useRouter();
  const params = useSearchParams();
  const projet = params.get("projet");
  const offreInit = (params.get("offre") as Compte["offreId"]) || "pro";
  const { inscrireVide, creerSite } = useStore();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [offre, setOffre] = useState<Compte["offreId"]>(offreInit);

  function valider(e: React.FormEvent) {
    e.preventDefault();
    inscrireVide(nom, email, entreprise || "Mon entreprise", offre);
    if (projet) {
      const g = siteMemorise(projet) ?? genererSite(projet);
      // l'état vient d'être remplacé : on laisse React l'appliquer avant de créer le site
      setTimeout(() => {
        const id = creerSite({ nom: g.nom, type: "ia", pile: "Créateur IA", genere: g });
        router.push(`/app/createur?site=${id}`);
      }, 0);
    } else {
      router.push("/app?bienvenue=1");
    }
  }

  return (
    <CadreAuth
      titre={projet ? "Dernière étape avant la mise en ligne" : "Créez votre compte"}
      sousTitre={<>Déjà inscrit ? <Link href="/connexion" className="font-medium text-encre underline underline-offset-4">Connectez-vous</Link></>}
    >
      {projet && (
        <div className="mb-6 rounded-2xl border border-lagon/40 bg-lagon-pale/60 p-4 text-sm">
          <p className="font-medium">Votre projet</p>
          <p className="mt-1 text-encre/70">« {projet} »</p>
        </div>
      )}
      <form className="space-y-4" onSubmit={valider}>
        <div>
          <Etiquette htmlFor="nom">Nom complet</Etiquette>
          <Champ id="nom" required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Camille Martin" />
        </div>
        <div>
          <Etiquette htmlFor="email">Email professionnel</Etiquette>
          <Champ id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="camille@entreprise.fr" />
        </div>
        <div>
          <Etiquette htmlFor="ent">Entreprise (facultatif)</Etiquette>
          <Champ id="ent" value={entreprise} onChange={(e) => setEntreprise(e.target.value)} placeholder="Boulangerie Martin" />
        </div>
        <div>
          <Etiquette>Offre (modifiable à tout moment)</Etiquette>
          <div className="grid grid-cols-3 gap-2">
            {offresWeb.map((o) => (
              <button
                type="button"
                key={o.id}
                onClick={() => setOffre(o.id)}
                className={cx("cursor-pointer rounded-xl border p-3 text-left transition", offre === o.id ? "border-encre bg-encre text-ecume" : "border-sable bg-white hover:border-encre/30")}
              >
                <span className="block text-sm font-medium">{o.nom}</span>
                <span className={cx("text-xs", offre === o.id ? "text-ecume/60" : "text-gris")}>{o.prixMensuel.toFixed(2).replace(".", ",")} €/mois</span>
              </button>
            ))}
          </div>
        </div>
        <Bouton type="submit" taille="lg" className="w-full">{projet ? "Créer mon compte et publier" : "Commencer l'essai gratuit"}</Bouton>
        <p className="text-center text-xs text-gris">En continuant, vous acceptez les conditions d&apos;utilisation et la politique de confidentialité.</p>
      </form>
    </CadreAuth>
  );
}

export default function Inscription() {
  return (
    <Suspense>
      <Formulaire />
    </Suspense>
  );
}
