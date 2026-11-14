"use client";

import { useState } from "react";
import { Search, Globe, ChevronDown, Plus, Trash2, ShieldCheck, ArrowRightLeft, ShoppingCart } from "lucide-react";
import { TitrePage, Modale } from "@/components/app/Coque";
import { Vide } from "@/components/app/commun";
import { Bouton, Carte, Champ, Interrupteur, Pastille, cx } from "@/components/ui";
import { useStore, dateCourte } from "@/lib/store";
import { extensionsDomaines, euros } from "@/config/offres";
import { disponibiliteDomaine, nettoyerNomDomaine } from "@/lib/domaines";
import type { EnregistrementDns } from "@/lib/types";

export default function Domaines() {
  const { etat, acheterDomaine, majDomaine, ajouterDns, lierDomaine } = useStore();
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<{ nom: string; dispo: boolean; prix: number }[]>([]);
  const [achat, setAchat] = useState<{ nom: string; prix: number } | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(etat.domaines[0]?.id ?? null);
  const [nouveau, setNouveau] = useState<Omit<EnregistrementDns, "id">>({ type: "A", nom: "@", valeur: "", ttl: 3600 });
  const [transfert, setTransfert] = useState(false);

  function chercher(e: React.FormEvent) {
    e.preventDefault();
    const b = nettoyerNomDomaine(q);
    if (!b) return;
    setResultats(extensionsDomaines.map((x) => ({ nom: b + x.ext, dispo: disponibiliteDomaine(b + x.ext) && !etat.domaines.some((d) => d.nom === b + x.ext), prix: x.prix })));
  }

  const offert = etat.compte.periode === "annuel" && etat.domaines.length === 0;

  return (
    <>
      <TitrePage titre="Domaines" description="Achetez, transférez et configurez vos noms de domaine." actions={<Bouton variante="secondaire" onClick={() => setTransfert(true)}><ArrowRightLeft className="size-4" /> Transférer un domaine</Bouton>} />

      <Carte className="p-5">
        <form onSubmit={chercher} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gris" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Trouvez votre domaine : monentreprise" className="h-11 w-full rounded-full border border-sable pr-4 pl-10 text-sm outline-none focus:border-encre/40 focus:ring-4 focus:ring-lagon/20" />
          </div>
          <Bouton type="submit" taille="lg">Rechercher</Bouton>
        </form>
        {resultats.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {resultats.map((r) => (
              <div key={r.nom} className={cx("flex items-center justify-between rounded-xl border px-4 py-2.5", r.dispo ? "border-sable" : "border-transparent bg-ecume/50 opacity-60")}>
                <span className="font-mono text-sm">{r.nom}</span>
                {r.dispo ? (
                  <span className="flex items-center gap-3">
                    <span className="text-sm">{offert ? <><s className="text-gris">{euros(r.prix)}</s> <b className="text-lagon-fonce">Offert</b></> : `${euros(r.prix)}/an`}</span>
                    <Bouton taille="sm" variante="lagon" onClick={() => setAchat(r)}><ShoppingCart className="size-3.5" /></Bouton>
                  </span>
                ) : <Pastille ton="corail">Indisponible</Pastille>}
              </div>
            ))}
          </div>
        )}
      </Carte>

      <h2 className="titre mt-10 mb-4 text-xl">Mes domaines ({etat.domaines.length})</h2>
      {etat.domaines.length === 0 ? (
        <Vide icone={Globe} titre="Aucun domaine" texte="Recherchez un nom ci-dessus. Avec un paiement annuel, le premier est offert pendant un an." />
      ) : (
        <div className="space-y-3">
          {etat.domaines.map((d) => {
            const jours = Math.round((new Date(d.expire).getTime() - Date.now()) / 86400000);
            const site = etat.sites.find((s) => s.id === d.siteId);
            return (
              <Carte key={d.id} className="overflow-hidden">
                <button onClick={() => setOuvert(ouvert === d.id ? null : d.id)} className="flex w-full cursor-pointer flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 text-left">
                  <Globe className="size-5 text-lagon-fonce" />
                  <span className="min-w-40 flex-1 font-mono font-medium">{d.nom}</span>
                  <Pastille ton={d.statut === "actif" ? "lagon" : "ambre"}>{d.statut === "actif" ? "Actif" : d.statut === "en_attente" ? "Enregistrement…" : "Transfert"}</Pastille>
                  <span className="text-[13px] text-gris">{site ? `→ ${site.nom}` : "Non relié"}</span>
                  <span className={cx("text-[13px]", jours < 30 && !d.renouvellementAuto ? "font-medium text-[#b8391c]" : "text-gris")}>Expire le {dateCourte(d.expire)}</span>
                  <ChevronDown className={cx("size-4 transition", ouvert === d.id && "rotate-180")} />
                </button>
                {ouvert === d.id && (
                  <div className="border-t border-sable bg-papier/60 p-5">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="flex items-center justify-between rounded-xl bg-white p-3 ring-1 ring-sable">
                        <span className="text-sm">Renouvellement auto</span>
                        <Interrupteur label="Renouvellement automatique" actif={d.renouvellementAuto} onChange={(v) => majDomaine(d.id, (x) => { x.renouvellementAuto = v; })} />
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-white p-3 ring-1 ring-sable">
                        <span className="flex items-center gap-1.5 text-sm"><ShieldCheck className="size-4 text-lagon-fonce" /> Protection WHOIS</span>
                        <Interrupteur label="Protection WHOIS" actif={d.protectionWhois} onChange={(v) => majDomaine(d.id, (x) => { x.protectionWhois = v; })} />
                      </div>
                      <div className="flex items-center gap-2 rounded-xl bg-white p-2 pl-3 ring-1 ring-sable">
                        <span className="text-sm whitespace-nowrap">Relié à</span>
                        <select value={d.siteId ?? ""} onChange={(e) => lierDomaine(d.id, e.target.value || undefined)} className="h-8 min-w-0 flex-1 cursor-pointer rounded-lg bg-ecume px-2 text-sm outline-none">
                          <option value="">Aucun site</option>
                          {etat.sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                        </select>
                      </div>
                    </div>

                    <p className="mt-6 mb-2 text-sm font-medium">Zone DNS</p>
                    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-sable">
                      <table className="w-full min-w-[560px] text-[13px]">
                        <thead><tr className="border-b border-sable text-left text-gris"><th className="px-4 py-2 font-normal">Type</th><th className="px-4 py-2 font-normal">Nom</th><th className="px-4 py-2 font-normal">Valeur</th><th className="px-4 py-2 font-normal">TTL</th><th /></tr></thead>
                        <tbody className="font-mono">
                          {d.dns.map((r) => (
                            <tr key={r.id} className="border-b border-sable/60 last:border-0">
                              <td className="px-4 py-2"><Pastille>{r.type}</Pastille></td>
                              <td className="px-4 py-2">{r.nom}</td>
                              <td className="max-w-xs truncate px-4 py-2">{r.valeur}</td>
                              <td className="px-4 py-2 text-gris">{r.ttl}</td>
                              <td className="px-4 py-2 text-right"><button aria-label="Supprimer" className="cursor-pointer text-gris hover:text-corail" onClick={() => majDomaine(d.id, (x) => { x.dns = x.dns.filter((y) => y.id !== r.id); })}><Trash2 className="size-3.5" /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <form className="mt-3 grid gap-2 sm:grid-cols-[100px_120px_1fr_auto]" onSubmit={(e) => { e.preventDefault(); if (!nouveau.valeur) return; ajouterDns(d.id, nouveau); setNouveau({ ...nouveau, valeur: "" }); }}>
                      <select value={nouveau.type} onChange={(e) => setNouveau({ ...nouveau, type: e.target.value as EnregistrementDns["type"] })} className="h-10 cursor-pointer rounded-xl border border-sable bg-white px-3 text-sm">
                        {["A", "AAAA", "CNAME", "MX", "TXT"].map((t) => <option key={t}>{t}</option>)}
                      </select>
                      <Champ value={nouveau.nom} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} className="font-mono" />
                      <Champ value={nouveau.valeur} onChange={(e) => setNouveau({ ...nouveau, valeur: e.target.value })} placeholder="Valeur" className="font-mono" />
                      <Bouton type="submit" variante="secondaire"><Plus className="size-4" /> Ajouter</Bouton>
                    </form>
                  </div>
                )}
              </Carte>
            );
          })}
        </div>
      )}

      <Modale ouverte={!!achat} fermer={() => setAchat(null)} titre="Confirmer l'achat">
        {achat && (
          <>
            <div className="rounded-2xl bg-ecume p-4">
              <p className="font-mono text-lg font-medium">{achat.nom}</p>
              <p className="mt-1 text-sm text-gris">1 an · renouvelé au même prix · protection WHOIS incluse</p>
            </div>
            <div className="mt-4 flex justify-between text-sm"><span>Total HT</span><b>{offert ? "0,00 € (offert la 1re année)" : euros(achat.prix)}</b></div>
            <div className="mt-6 flex justify-end gap-2">
              <Bouton variante="secondaire" onClick={() => setAchat(null)}>Annuler</Bouton>
              <Bouton onClick={() => { acheterDomaine(achat.nom); setResultats([]); setQ(""); setAchat(null); }}>Acheter</Bouton>
            </div>
          </>
        )}
      </Modale>

      <Modale ouverte={transfert} fermer={() => setTransfert(false)} titre="Transférer un domaine">
        <p className="text-sm text-gris">Saisissez le domaine et son code d&apos;autorisation (code AUTH/EPP), disponible chez votre registrar actuel. Le transfert prolonge votre domaine d&apos;un an.</p>
        <div className="mt-4 space-y-3">
          <Champ placeholder="mondomaine.fr" />
          <Champ placeholder="Code d'autorisation" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton variante="secondaire" onClick={() => setTransfert(false)}>Annuler</Bouton>
          <Bouton onClick={() => setTransfert(false)}>Lancer le transfert</Bouton>
        </div>
      </Modale>
    </>
  );
}
