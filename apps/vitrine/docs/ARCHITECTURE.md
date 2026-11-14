# Passer de la maquette au vrai service, sur IONOS

Ce document explique comment remplacer chaque partie simulée par du réel. Les noms d'actions renvoient à `src/lib/store.tsx`.

## 1. Vue d'ensemble

```
                        ┌──────────────────────────────┐
  Clients ──► CDN ──►   │  Plan de contrôle (sebt)  │
                        │  Next.js · API · tRPC        │
                        │  PostgreSQL · Redis/BullMQ   │──► Stripe (paiement)
                        │  Worker (provisionnement)    │──► API Claude (IA)
                        └──────┬───────────┬───────────┘──► Registrar (domaines)
                               │           │
                ┌──────────────┘           └───────────────┐
                ▼                                          ▼
     Nœuds d'hébergement                          Serveurs VPS clients
     (serveurs cloud IONOS)                       (API IONOS Cloud)
     Docker + Traefik/Caddy                       1 VM par client
     sites, WordPress, applis                     image + clé SSH
                │
                ▼
     Stockage objet S3 IONOS : sauvegardes, fichiers statiques
```

Le **plan de contrôle** est l'application de ce dépôt. Il n'héberge aucun site client : il pilote des machines.

## 2. Ce qu'on peut reprendre de Quercy

Le dépôt `logiciel-quercy` contient déjà des briques solides et testées. Il vaut mieux les copier que les réécrire.

| Brique Quercy | Usage dans sebt |
| --- | --- |
| `better-auth` (mot de passe, lien magique, Google, Microsoft, double authentification) | Remplace la connexion simulée |
| Multi-espaces + RLS PostgreSQL (`forTenant`, `quercy_tenant_isolation`) | Isolation des données client et des agences (marque blanche) |
| Stripe : abonnements, webhooks, impayés, portail | Offres Essentiel, Pro et Studio ; VPS à l'heure (Stripe usage-based billing) |
| `@quercy/documents` (PDF, Factur-X, numérotation) | Factures de sebt et facturation par les agences de leurs propres clients |
| `@quercy/mailer` (Resend) | Emails transactionnels (pas les boîtes clients) |
| Assistant IA (SDK Anthropic, crédits par offre, actions soumises à confirmation) | Base de l'agent IA et du créateur |
| Worker BullMQ, journal d'audit, export RGPD | Provisionnement asynchrone, historique des actions, export complet |

## 3. Correspondance entre la maquette et le réel

| Action simulée | Implémentation réelle |
| --- | --- |
| `creerSite` / `redeployer` | Tâche BullMQ : clone Git, build (Nixpacks ou Buildpacks), image poussée dans un registre privé, conteneur lancé sur un nœud, route ajoutée dans Traefik ; journal diffusé en temps réel (SSE) |
| WordPress | Image WordPress + MariaDB managée, LiteSpeed ou Nginx + cache objet Redis |
| `sauvegarder` / `restaurer` | `restic` vers le stockage objet IONOS dans une **autre région** ; dumps SQL ; rétention selon l'offre |
| Préproduction et aperçus | Copie du conteneur et de la base sur un sous-domaine ; webhook Git par branche |
| `acheterDomaine` / DNS | API d'un registrar revendeur (IONOS, OpenSRS, Gandi ou Openprovider) + DNS géré (PowerDNS, ou l'API DNS IONOS) |
| `creerBoite` | Serveur mail dédié (Stalwart ou Mailcow) sur un serveur IONOS avec IP propre, DKIM, SPF et DMARC ; ou revente d'une offre email |
| `creerVps` / `basculerVps` | API IONOS Cloud (Compute) : création de la VM depuis une image, injection de la clé SSH, démarrage et arrêt |
| Terminal web | WebSocket → conteneur relais → SSH (xterm.js côté client) ; l'IA propose des commandes, sans jamais les exécuter seule |
| Surveillance et page de statut | Sondes HTTP chaque minute depuis 2 régions (Uptime Kuma, ou Prometheus + Blackbox) |
| SSL | Let's Encrypt automatique via Traefik ou Caddy |
| Agent IA | API Claude avec *tool use* : outils en lecture libres ; outils en écriture qui renvoient une **proposition**, exécutée seulement après validation, avec une sauvegarde avant et une entrée annulable dans le journal |
| Créateur IA | API Claude avec une sortie JSON qui suit le type `SiteGenere` (`src/lib/generateur.ts`) : le rendu `ApercuSite` reste le même |
| Plafond de dépenses | Contrôle côté serveur avant toute création de ressource ou recharge de crédits |

## 4. Infrastructure IONOS conseillée pour démarrer

1. **Plan de contrôle** : 1 serveur cloud (4 vCPU, 8 Go) avec l'application, le worker et Redis, plus PostgreSQL managé (ou sur un second serveur) et des sauvegardes vers le stockage objet.
2. **Nœuds d'hébergement** : 2 serveurs cloud (8 vCPU, 16 Go) avec Docker et Traefik. On ajoute des nœuds selon le remplissage, avec un placement automatique par le worker.
3. **Serveur mail** : 1 serveur dédié à l'email, avec une IP propre (réputation).
4. **Stockage objet S3** : sauvegardes et fichiers statiques.
5. Plus tard : Kubernetes managé IONOS quand le nombre de nœuds dépasse une dizaine.

## 5. Avant le lancement commercial

- **Calibrer les prix** de `src/config/offres.ts` sur les coûts IONOS réels (serveurs, IP, trafic, domaines) avec la marge visée. Les montants actuels sont des exemples.
- Vérifier les **conditions revendeur** IONOS (domaines, VPS) et la possibilité de refacturer.
- Vérifier la **disponibilité du nom** « sebt » : marque (INPI, EUIPO), domaines, réseaux sociaux.
- Rédiger les documents juridiques : CGV, conditions d'usage raisonnable, contrat de sous-traitance RGPD (DPA), mentions d'hébergeur (LCEN), procédure de signalement des contenus illicites.
- Mettre en place la sécurité : isolation des conteneurs (gVisor ou utilisateurs non privilégiés), quotas CPU, RAM et disque, pare-feu applicatif (WAF), lutte contre les abus (phishing, minage).

## 6. Feuille de route proposée

| Phase | Contenu |
| --- | --- |
| 1 | Auth et facturation (reprises de Quercy), créateur IA réel (API Claude), sites statiques et IA publiés sur un nœud |
| 2 | WordPress, sauvegardes et restauration, domaines via un registrar, DNS |
| 3 | Déploiement Git et Docker, préproduction, aperçus, variables |
| 4 | Emails, surveillance et page de statut |
| 5 | VPS via l'API IONOS Cloud, terminal web |
| 6 | Agent IA avec outils réels, autorisations permanentes |
| 7 | Offre Studio : marque blanche, accès client, facturation des clients des agences |
