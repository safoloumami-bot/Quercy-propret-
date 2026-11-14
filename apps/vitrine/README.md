# sebt

Site public de **sebt** et espace client des sites web.

- **Offre principale : le logiciel de gestion sebt** (dépôt `safoloumami-bot/Quercy-propret-`) pour TPE, PME et indépendants : 13 modules (CRM, ventes et facturation Factur-X, achats, stocks, projets, nettoyage et interventions, agenda, support, RH, trésorerie, documents, automatisations, intégrations), assistant IA, application terrain, application de bureau. Tarifs par utilisateur : Gratuit, Pro, Business, Entreprise. L'accueil (`/`) et la page `/tarifs` le présentent ; les boutons d'essai et de connexion mènent à l'application, dont l'adresse se règle dans `src/config/marque.ts` (`urlLogiciel`).
- **Offre complémentaire : les sites web** (`/sites`, `/sites/tarifs`) : créateur de site IA, hébergement, WordPress et conteneurs, noms de domaine, emails professionnels, serveurs VPS et agent IA d'administration, avec l'espace client `/app`.

> **État : V0, maquette fonctionnelle.** Les pages « Sites web » et l'espace client `/app` sont complets et cliquables, avec des données **simulées dans le navigateur** (localStorage) : aucun serveur n'est créé et aucun domaine n'est acheté. Chaque action simulée correspond à une future route d'API, décrite dans [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Lancer le projet

```bash
corepack enable
pnpm install
pnpm dev            # http://localhost:3000
```

- Connexion de démonstration : `/connexion`, les identifiants sont déjà remplis.
- Compte vierge : `/inscription`. Une description saisie sur la landing est transmise au créateur IA.
- Menu de l'avatar, puis **Réinitialiser la démo** pour revenir aux données d'exemple.

Pour produire une démo statique sans serveur (dossier `out/`) :

```bash
STATIC_EXPORT=1 pnpm build
```

## Ce qui est livré

### Site public
- **Accueil** : créateur IA qui génère réellement un aperçu de site à partir d'une description, services, recherche de domaine, « Pourquoi sebt », agent IA, tarifs Web/VPS (mensuel ou annuel), FAQ et appel à l'action.
- **Tarifs** : grilles et comparatif détaillé.
- **Connexion** et **inscription**, avec le choix de l'offre et la reprise du projet saisi sur la landing.

### Espace client (`/app`)

| Écran | Fonctions |
| --- | --- |
| Vue d'ensemble | Visites, disponibilité, stockage, crédits IA, projets, alertes à traiter, actions de l'agent, empreinte carbone |
| Sites & applications | Liste filtrable, création : créateur IA, WordPress, Git (GitHub/GitLab), Docker, fichiers statiques, migration |
| Fiche projet | Aperçu, déploiements avec journal en direct et retour à une version, sauvegardes et restauration, domaines, variables d'environnement, performance, préproduction, transfert et suppression |
| Créateur IA | Génération, modification par chat, annulation, aperçu ordinateur, tablette et mobile, publication |
| Domaines | Recherche et achat, transfert, renouvellement automatique, protection WHOIS, liaison à un site, éditeur de zone DNS |
| Emails | Boîtes, redirections, quotas, état de la délivrabilité (SPF, DKIM, DMARC), configuration des appareils |
| Serveurs VPS | Création (taille, image, région), démarrage et arrêt, terminal web avec assistant IA (`? question`) |
| Agent IA | Diagnostic, propositions détaillées soumises à validation, sauvegarde avant action, historique annulable, autorisations permanentes |
| Facturation | Changement d'offre, mensuel ou annuel, plafond de dépenses, prochain prélèvement, factures |
| Paramètres | Profil, double authentification, clés SSH et API, équipe, marque blanche, export complet |

## Ce qui différencie sebt

1. Le prix de renouvellement est **le même** que le prix affiché.
2. **Sans engagement** : paiement au mois, ou à l'année avec une remise.
3. **Préproduction** en un clic et URL d'aperçu pour chaque branche Git.
4. **Surveillance** incluse et page de statut publique pour chaque site.
5. **Aucun verrouillage** : export complet à tout moment.
6. **Plafond de dépenses** mensuel.
7. **Agent IA** qui demande avant d'agir, sauvegarde d'abord et peut tout annuler.
8. **Agences** : marque blanche, accès client et transfert de propriété.
9. **Empreinte carbone** affichée pour chaque site.
10. Factures électroniques **Factur-X**.

## Personnaliser

| Quoi | Où |
| --- | --- |
| Nom, slogan, domaine, adresse de l'application de gestion | `src/config/marque.ts` |
| Modules et offres du logiciel de gestion (alignés sur le dépôt Quercy) | `src/config/logiciel.ts` |
| Offres des sites web, prix, comparatif, extensions de domaine | `src/config/offres.ts` |
| Couleurs et typographie | `src/app/globals.css` (bloc `@theme`) : famille « nuit » pour le site public (mode sombre chaud), jetons historiques pour l'espace client (« lagon » = accent sable #C9A97C) |
| Logo et favicons | `public/marque/`, `public/favicon.svg`, `public/favicon.ico`, `public/apple-touch-icon.png` |
| Modèles du créateur IA (familles) | `src/lib/generateur.ts` |
| Métiers précis et directions artistiques | `src/lib/metiers.ts` |
| Données de démonstration | `src/lib/donnees-demo.ts` |

## Arborescence

```
src/app/                 Pages (App Router) : /, /tarifs, /connexion, /inscription, /app/...
src/components/ui/       Composants de base (bouton, carte, pastille, jauge…)
src/components/marketing Sections du site public
src/components/app/      Coque de l'espace client (barre latérale, en-tête, modales)
src/config/              Marque et offres
src/lib/store.tsx        État simulé et actions (futures routes d'API)
src/lib/generateur.ts    Générateur de site (à remplacer par l'API Claude)
docs/ARCHITECTURE.md     Passage en production sur IONOS
```

Stack : Next.js 15, React 19, TypeScript strict, Tailwind CSS 4, lucide-react et Geist. Ce sont les mêmes choix que Quercy, ce qui permet de reprendre ses briques (auth, Stripe, multi-tenant, IA).
