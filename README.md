# Quercy

Logiciel de gestion tout-en-un et modulaire pour les PME, TPE et indépendants : un socle
commun et des modules que chaque entreprise active selon ses besoins. Il sera disponible dans
le navigateur (optimisé pour ordinateur) et en application Windows/macOS (Tauri).

> **État actuel : phases 1 à 10 terminées** : fondations, comptes et multi-entreprises,
> abonnements, moteur générique (tableau, Kanban, calendrier, Gantt, fiches, champs
> personnalisés, vues, import/export, historique, commentaires, fichiers, recherche, temps réel)
> et modules cœur : CRM (contacts, entreprises, pipeline d'opportunités, activités, doublons),
> ventes et facturation (catalogue, devis, commandes, factures, avoirs, factures récurrentes,
> PDF Factur-X, envoi par email, relances, paiement en ligne, acceptation des devis en ligne),
> projets et tâches (Kanban, Gantt, calendrier, chronomètre, facturation du temps),
> tableaux de bord personnalisables et rapports (constructeur, exports PDF/Excel/CSV, envois
> programmés), assistant IA (Ctrl+J : questions sur les données avec tableaux et graphiques,
> actions soumises à confirmation, rédaction, résumés, lecture de factures fournisseurs),
> achats, stocks, agenda, support, RH, trésorerie et documents, automatisations, API REST
> publique (OpenAPI), webhooks et abonnement d'agenda, application de bureau Tauri 2
> (Windows, macOS, Linux) et mode hors ligne partiel — voir [`docs/DESKTOP.md`](docs/DESKTOP.md).
> Authentification complète (mot de passe, lien magique, Google, Microsoft, double
> authentification), espaces multiples, invitations, rôles et permissions personnalisables,
> équipes, assistant d'accueil, journal d'audit, export RGPD et isolation des données testée ;
> offres Stripe (Gratuit, Pro, Business, Entreprise), limites par offre, facturation,
> impayés et espace super-admin.
> Le détail de chaque phase est dans [`CHANGELOG.md`](CHANGELOG.md).

## Prérequis

- Node.js 22 (`.nvmrc`) et pnpm 10 (`corepack enable`)
- Docker (PostgreSQL 16 et Redis 7), ou des instances locales équivalentes

## Installation et lancement

```bash
corepack enable
pnpm install
cp .env.example .env        # puis ajuster si besoin
pnpm db:up                  # démarre PostgreSQL et Redis (docker compose)
pnpm db:migrate             # applique les migrations Prisma
pnpm seed                   # crée l'espace de démonstration « Quercy Propreté »
pnpm dev                    # http://localhost:3000
pnpm worker                 # tâches planifiées (purge de la corbeille…), dans un 2e terminal
```

### Comptes de démonstration

Le seed crée l'espace « Quercy Propreté » et un compte par rôle, tous avec le mot de passe
**`Quercy-demo-2026`** :

| Email                       | Rôle                                    |
| --------------------------- | --------------------------------------- |
| `demo@quercy.app`           | Propriétaire                            |
| `julien.marty@quercy.app`   | Manager                                 |
| `sophie.lacombe@quercy.app` | Membre                                  |
| `nadia.benali@quercy.app`   | Comptable externe                       |
| `lucas.roux@quercy.app`     | Lecteur                                 |
| `admin@quercy.app`          | Super-admin de la plateforme (`/admin`) |

### Emails en développement

Sans `RESEND_API_KEY`, aucun email ne part : le contenu et les liens sont écrits dans le
journal du serveur. Avec `ENABLE_DEV_MAILBOX="true"`, les 100 derniers sont aussi lisibles en JSON sur
`/api/dev/mailbox?to=adresse` (liens magiques, invitations, réinitialisations). Cette route
répond 404 dès que Resend est configuré.

### Paiement (Stripe)

1. Clé de test dans `.env` (`STRIPE_SECRET_KEY=sk_test_…`), puis `pnpm stripe:setup` : crée les
   produits et les quatre prix (Pro/Business × mensuel/annuel) et affiche les variables
   `STRIPE_PRICE_*` à ajouter.
2. Webhooks en local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`, puis
   `STRIPE_WEBHOOK_SECRET=whsec_…`.
3. En production, déclarez `<APP_URL>/api/stripe/webhook` avec les événements
   `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid`,
   `invoice.payment_failed`, et activez le portail client dans le tableau de bord Stripe.

Sans clés Stripe, la page Facturation reste consultable (offre, utilisation, comparatif) et
indique aux propriétaires que le paiement n'est pas configuré.

### Assistant IA (Claude)

Renseignez `ANTHROPIC_API_KEY` (clé de l'API Claude). Réglages facultatifs : `AI_MODEL`
(`claude-opus-5` par défaut), `AI_EFFORT` (`low`, `medium` par défaut, `high`) et
`ANTHROPIC_BASE_URL`. Sans clé, le panneau (`Ctrl+J`) indique que l'assistant n'est pas
configuré. Chaque question consomme 1 crédit et chaque lecture de document 3 crédits, sur le
quota mensuel de l'offre (crédits par membre × membres).

Pour essayer sans clé ni réseau : `pnpm --filter @quercy/web exec tsx scripts/fake-anthropic.ts 4010`
puis `ANTHROPIC_API_KEY=test ANTHROPIC_BASE_URL=http://127.0.0.1:4010` : réponses scriptées
(utilisées par les tests et les parcours E2E).

### Connexion Google et Microsoft

Renseignez `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` et `MICROSOFT_CLIENT_ID` /
`MICROSOFT_CLIENT_SECRET` (et `MICROSOFT_TENANT_ID`). Déclarez chez chaque fournisseur l'URL de
retour `<APP_URL>/api/auth/callback/google` ou `/api/auth/callback/microsoft`. Les boutons
n'apparaissent que pour les fournisseurs configurés.

## Commandes

| Commande                                        | Rôle                                                   |
| ----------------------------------------------- | ------------------------------------------------------ |
| `pnpm dev`                                      | Application web en développement                       |
| `pnpm build`                                    | Build de production de tous les paquets                |
| `pnpm lint` / `pnpm typecheck`                  | ESLint et TypeScript strict                            |
| `pnpm test`                                     | Tests unitaires (Vitest)                               |
| `pnpm e2e`                                      | Tests de bout en bout (Playwright, 1280 px et 2560 px) |
| `pnpm format`                                   | Prettier (lancé aussi à chaque commit via Husky)       |
| `pnpm db:migrate` / `db:deploy` / `db:generate` | Migrations Prisma (dev / production) et client         |
| `pnpm seed`                                     | Données de démonstration                               |

## Arborescence

```
apps/web          Next.js 15 (App Router) — interface et API
apps/worker       Worker BullMQ (tâches planifiées et files d'attente)
packages/ui       Design system : jetons CSS (Tailwind 4) et composants (Radix, shadcn)
packages/core     Logique métier partagée : modules, rôles et permissions, préférences (Zod)
packages/db       Prisma + PostgreSQL : schéma, migrations, seed
packages/storage  Stockage des fichiers (disque local ou S3), partagé web/worker
packages/documents  Documents commerciaux : PDF, Factur-X, numérotation, relances (web/worker)
packages/mailer   Envoi d'emails (Resend ou boîte de développement), partagé web/worker
packages/reports  Exécution des rapports, droits hors requête, PDF, envois programmés
legacy/           Application terrain Quercy Propreté v15 (référence, non compilée)
docs/             Architecture et décisions
```

## Écrans disponibles

- `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/reinitialiser`, `/connexion/deux-facteurs`
- `/bienvenue` — assistant d'accueil : entreprise, modules, couleur, invitations
- `/invitation/<jeton>` — acceptation d'une invitation
- `/` — accueil : tableau de bord personnalisable (widgets, période globale, clic vers les listes)
- `/rapports`, `/rapports/nouveau`, `/rapports/<id>` — modèles, constructeur, rapports
  enregistrés ; exports sur `/api/rapports/export`
- `/crm/contacts`, `/crm/entreprises`, `/crm/opportunites` (pipeline Kanban), `/crm/activites`
  (calendrier), `/crm/doublons` — tableaux, panneau de détail, fiches (`/<id>`)
- `/ventes/devis`, `/ventes/commandes`, `/ventes/factures`, `/ventes/avoirs`,
  `/ventes/recurrentes`, `/ventes/catalogue`, `/ventes/parametres` — documents commerciaux
  (lignes, émission numérotée, envoi, paiements, transformations), PDF sur
  `/api/ventes/documents/<id>/pdf`
- `/document/<jeton>` — page publique d'un document : PDF, acceptation d'un devis, paiement
  en ligne d'une facture ; `/api/stripe/ventes/<espace>` — webhook Stripe de l'entreprise
- `/projets/liste`, `/projets/taches`, `/projets/temps` — projets (Gantt), tâches (Kanban,
  calendrier, Gantt), temps passé ; chronomètre dans la barre supérieure
- `/achats/{fournisseurs,commandes,factures,notes-de-frais}`, `/stocks/{mouvements,entrepots}`,
  `/agenda/evenements`, `/support/tickets`, `/rh/{salaries,absences}`,
  `/tresorerie/{comptes,operations}`, `/documents/bibliotheque`
- `/automatisations`, `/integrations` — règles automatiques ; clés d'API, webhooks, agenda iCal
- `/api/v1/<ressource>` — API REST publique (`Authorization: Bearer qk_…`),
  `/api/v1/openapi.json`, `/api/v1/agenda.ics?key=…`
- `/reglages/profil`, `/reglages/securite` (mot de passe, 2FA, appareils, suppression du compte),
  `/reglages/apparence`
- `/reglages/espace` (entreprise, modules, export RGPD), `/reglages/membres`, `/reglages/equipes`,
  `/reglages/roles`, `/reglages/facturation`, `/reglages/audit`
- `/admin` — super-admin : MRR, churn, essais, espaces clients, connexion « en tant que »,
  webhooks Stripe à rejouer
- `/api/stripe/webhook` — webhooks Stripe (signés, idempotents)
- Panneau **Assistant** (`Ctrl+J`, bouton de la barre supérieure) sur tous les écrans ;
  `/api/ai/chat` (réponse en flux SSE) et `/api/ai/extract` (lecture de PDF ou de photos)
- `/design-system` — jetons et composants
- `/api/health` — état de la base et de Redis (200 ou 503)

Raccourcis : `Ctrl+K` palette, `/` recherche, `?` aide, `Ctrl+B` barre latérale, `Ctrl+J`
assistant,
`G` puis `H` (accueil), `C` (contacts), `E` (entreprises), `O` (opportunités), `A`
(activités), `S` (rapports), `V` (devis), `F` (factures), `P` (projets), `T` (tâches), `R` (réglages), `M`
(membres), `D` (design system) ; `C` crée une fiche sur une liste ; dans un tableau : `J`/`K`, `Entrée`,
`O`, `E`, `X`.

## Déploiement

La CI (GitHub Actions, `.github/workflows/ci.yml`) vérifie le formatage, le lint, les types,
les tests unitaires, le build et les parcours E2E sur PostgreSQL et Redis réels.
En production : `pnpm db:deploy` puis `pnpm build` et `pnpm --filter @quercy/web start`, avec
les variables de `.env.example` — en particulier un `BETTER_AUTH_SECRET` généré
(`openssl rand -base64 32`), `RESEND_API_KEY`, `ENABLE_DEV_MAILBOX="false"` et
`AUTH_RATE_LIMIT="on"`. Les cibles Vercel et Railway/Fly, et les installeurs desktop,
sont documentés dans les phases correspondantes.

Voir aussi [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) et [`docs/DECISIONS.md`](docs/DECISIONS.md).
