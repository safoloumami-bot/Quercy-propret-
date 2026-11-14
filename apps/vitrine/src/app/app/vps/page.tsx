"use client";

import { useEffect, useRef, useState } from "react";
import { Cpu, Plus, Power, Terminal, Trash2, Copy, Camera, Sparkles, X } from "lucide-react";
import { TitrePage, Modale } from "@/components/app/Coque";
import { Vide } from "@/components/app/commun";
import { Bouton, Carte, Champ, Etiquette, Jauge, Pastille, Point, Sparkline, cx } from "@/components/ui";
import { useStore, depuis } from "@/lib/store";
import { offresVps, euros } from "@/config/offres";
import type { Vps } from "@/lib/types";

const images = ["Ubuntu 24.04", "Debian 13", "AlmaLinux 10", "Ubuntu 24.04 + Docker", "Coolify (PaaS auto-hébergé)", "n8n (automatisation)"];
const regions = ["Europe (Francfort)", "Europe (Paris)", "Europe (Madrid)", "Amérique (Kansas City)"];

function reponseCommande(cmd: string, vps: Vps): string[] {
  const c = cmd.trim();
  if (c.startsWith("?")) {
    const q = c.slice(1).toLowerCase();
    if (q.includes("disque") || q.includes("espace")) return ["IA ▸ Pour voir l'espace disque :", "  df -h /", "IA ▸ Et pour trouver les dossiers les plus lourds :", "  du -sh /var/* | sort -h | tail"];
    if (q.includes("docker") || q.includes("conteneur")) return ["IA ▸ Liste des conteneurs en cours :", "  docker ps --format 'table {{.Names}}\\t{{.Status}}'"];
    if (q.includes("nginx") || q.includes("site")) return ["IA ▸ Pour recharger nginx après une modification :", "  nginx -t && systemctl reload nginx"];
    return ["IA ▸ Décrivez ce que vous voulez faire, je propose la commande. Rien n'est exécuté sans vous."];
  }
  if (c === "help" || c === "aide") return ["Commandes de démo : uptime, df -h, free -h, docker ps, whoami, ls, clear", "Préfixez par ? pour demander à l'IA (ex. ? libérer de l'espace disque)"];
  if (c === "uptime") return [` ${new Date().toLocaleTimeString("fr-FR")} up 61 days,  3:12,  1 user,  load average: 0.18, 0.22, 0.19`];
  if (c === "whoami") return ["root"];
  if (c === "ls") return ["docker-compose.yml  n8n_data  sauvegardes  scripts"];
  if (c.startsWith("df")) return ["Filesystem      Size  Used Avail Use% Mounted on", "/dev/vda1        78G   14G   61G  19% /"];
  if (c.startsWith("free")) return ["               total        used        free      shared  buff/cache   available", `Mem:           3.8Gi       ${vps.ramUtiliseGo.toFixed(1)}Gi       1.1Gi        12Mi       0.7Gi       1.6Gi`];
  if (c.startsWith("docker ps")) return ["CONTAINER ID   IMAGE              STATUS        PORTS                    NAMES", "a41f0c2e9b11   n8nio/n8n:latest   Up 6 days     0.0.0.0:5678->5678/tcp   n8n", "77d0e3c1aa02   postgres:16        Up 6 days     5432/tcp                 n8n-db"];
  if (!c) return [];
  return [`bash: ${c.split(" ")[0]}: commande non disponible dans la démo (tapez « aide »)`];
}

function TerminalWeb({ vps, fermer }: { vps: Vps; fermer: () => void }) {
  const [lignes, setLignes] = useState<string[]>([`Connexion à ${vps.nom} (${vps.ip})…`, "Ubuntu 24.04.3 LTS · Tapez « aide », ou « ? votre question » pour l'IA.", ""]);
  const [saisie, setSaisie] = useState("");
  const fin = useRef<HTMLDivElement>(null);
  useEffect(() => { fin.current?.scrollIntoView({ block: "nearest" }); }, [lignes]);
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 h-[46vh] border-t border-encre-3 bg-encre shadow-2xl lg:left-64">
      <div className="flex items-center justify-between border-b border-ecume/10 px-4 py-2 text-xs text-ecume/60">
        <span className="flex items-center gap-2"><Terminal className="size-3.5 text-lagon" /> root@{vps.nom} · {vps.ip}</span>
        <span className="flex items-center gap-3"><span className="flex items-center gap-1"><Sparkles className="size-3 text-lagon" /> Préfixez par ? pour l&apos;IA</span><button onClick={fermer} aria-label="Fermer" className="cursor-pointer hover:text-ecume"><X className="size-4" /></button></span>
      </div>
      <div className="defile h-[calc(100%-2.25rem)] overflow-y-auto p-4 font-mono text-[13px] leading-6 text-ecume/85" onClick={() => document.getElementById("saisie-term")?.focus()}>
        {lignes.map((l, i) => <div key={i} className={cx("whitespace-pre-wrap", l.startsWith("IA ▸") && "text-lagon", l.startsWith("root@") && "text-ecume")}>{l || " "}</div>)}
        <form onSubmit={(e) => {
          e.preventDefault();
          if (saisie.trim() === "clear") { setLignes([]); setSaisie(""); return; }
          setLignes((x) => [...x, `root@${vps.nom}:~# ${saisie}`, ...reponseCommande(saisie, vps)]);
          setSaisie("");
        }} className="flex">
          <span className="text-lagon">root@{vps.nom}:~#&nbsp;</span>
          <input id="saisie-term" autoFocus value={saisie} onChange={(e) => setSaisie(e.target.value)} className="flex-1 bg-transparent text-ecume outline-none" aria-label="Commande" autoComplete="off" />
        </form>
        <div ref={fin} />
      </div>
    </div>
  );
}

export default function PageVps() {
  const { etat, creerVps, basculerVps, supprimerVps } = useStore();
  const [modale, setModale] = useState(false);
  const [offre, setOffre] = useState("vps-m");
  const [image, setImage] = useState(images[3]!);
  const [region, setRegion] = useState(regions[0]!);
  const [nom, setNom] = useState("");
  const [terminal, setTerminal] = useState<string | null>(null);
  const vpsTerm = etat.vps.find((v) => v.id === terminal);

  return (
    <>
      <TitrePage titre="Serveurs VPS" description="Ressources dédiées, accès root, facturés à l'heure et plafonnés au mois." actions={<Bouton onClick={() => setModale(true)}><Plus className="size-4" /> Nouveau serveur</Bouton>} />

      {etat.vps.length === 0 ? (
        <Vide icone={Cpu} titre="Aucun serveur" texte="Lancez un VPS en moins d'une minute, avec Docker, Coolify ou n8n préinstallés." action={<Bouton onClick={() => setModale(true)}>Lancer un serveur</Bouton>} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {etat.vps.map((v) => {
            const o = offresVps.find((x) => x.id === v.offreId)!;
            return (
              <Carte key={v.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 font-medium"><Point statut={v.statut === "actif" ? "ok" : v.statut === "creation" ? "attente" : "arret"} /> {v.nom}</p>
                    <p className="mt-1 text-[13px] text-gris">{o.nom} · {o.vcpu} vCPU · {o.ramGo} Go · {o.disqueGo} Go NVMe · {v.region}</p>
                  </div>
                  <Pastille ton={v.statut === "actif" ? "lagon" : v.statut === "creation" ? "ambre" : "neutre"}>{v.statut === "actif" ? "Actif" : v.statut === "creation" ? "Création…" : "Arrêté"}</Pastille>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-xl bg-ecume/60 p-3">
                    <p className="text-xs text-gris">Adresse IP</p>
                    <p className="mt-0.5 flex items-center gap-2 font-mono">{v.ip} <button aria-label="Copier" onClick={() => navigator.clipboard?.writeText(v.ip)} className="cursor-pointer text-gris hover:text-encre"><Copy className="size-3" /></button></p>
                  </div>
                  <div className="rounded-xl bg-ecume/60 p-3">
                    <p className="text-xs text-gris">Système</p>
                    <p className="mt-0.5 truncate">{v.image}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gris">CPU · 24 h</p>
                    <Sparkline valeurs={v.cpu} hauteur={40} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gris"><span>RAM</span><span>{v.ramUtiliseGo.toFixed(1)} / {o.ramGo} Go</span></div>
                    <div className="mt-2"><Jauge valeur={v.ramUtiliseGo} max={o.ramGo} /></div>
                    <p className="mt-3 text-xs text-gris">Créé {depuis(v.creeLe)} · {euros(o.prixMensuel)}/mois max</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-sable pt-4">
                  <Bouton taille="sm" onClick={() => setTerminal(v.id)} disabled={v.statut !== "actif"}><Terminal className="size-3.5" /> Terminal</Bouton>
                  <Bouton taille="sm" variante="secondaire" onClick={() => basculerVps(v.id)} disabled={v.statut === "creation"}><Power className="size-3.5" /> {v.statut === "arrete" ? "Démarrer" : "Arrêter"}</Bouton>
                  <Bouton taille="sm" variante="secondaire" disabled={v.statut === "creation"}><Camera className="size-3.5" /> Snapshot</Bouton>
                  <div className="flex-1" />
                  <Bouton taille="sm" variante="fantome" onClick={() => supprimerVps(v.id)} className="text-[#b8391c]"><Trash2 className="size-3.5" /> Supprimer</Bouton>
                </div>
              </Carte>
            );
          })}
        </div>
      )}

      {vpsTerm && <TerminalWeb vps={vpsTerm} fermer={() => setTerminal(null)} />}

      <Modale ouverte={modale} fermer={() => setModale(false)} titre="Nouveau serveur" large>
        <form onSubmit={(e) => { e.preventDefault(); creerVps(nom || `serveur-${etat.vps.length + 1}`, offre, image, region); setModale(false); setNom(""); }} className="space-y-5">
          <div>
            <Etiquette>Taille</Etiquette>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {offresVps.map((o) => (
                <button type="button" key={o.id} onClick={() => setOffre(o.id)} className={cx("cursor-pointer rounded-xl border p-3 text-left transition", offre === o.id ? "border-encre bg-encre text-ecume" : "border-sable hover:border-encre/30")}>
                  <p className="text-sm font-medium">{o.nom}</p>
                  <p className={cx("text-xs", offre === o.id ? "text-ecume/60" : "text-gris")}>{o.vcpu} vCPU · {o.ramGo} Go</p>
                  <p className="mt-1 text-sm">{euros(o.prixMensuel)}<span className="text-xs opacity-60">/mois</span></p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Etiquette>Image</Etiquette>
              <select value={image} onChange={(e) => setImage(e.target.value)} className="h-10 w-full cursor-pointer rounded-xl border border-sable bg-white px-3 text-sm">{images.map((i) => <option key={i}>{i}</option>)}</select>
            </div>
            <div>
              <Etiquette>Région</Etiquette>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="h-10 w-full cursor-pointer rounded-xl border border-sable bg-white px-3 text-sm">{regions.map((i) => <option key={i}>{i}</option>)}</select>
            </div>
          </div>
          <div>
            <Etiquette htmlFor="nomvps">Nom</Etiquette>
            <Champ id="nomvps" value={nom} onChange={(e) => setNom(e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase())} placeholder={`serveur-${etat.vps.length + 1}`} />
          </div>
          <p className="rounded-xl bg-ecume/70 p-3 text-[13px] text-encre/70">Clé SSH : celle enregistrée dans vos paramètres sera ajoutée. Facturation à l&apos;heure, jamais plus que le prix mensuel.</p>
          <div className="flex justify-end gap-2">
            <Bouton type="button" variante="secondaire" onClick={() => setModale(false)}>Annuler</Bouton>
            <Bouton type="submit">Lancer le serveur</Bouton>
          </div>
        </form>
      </Modale>
    </>
  );
}
