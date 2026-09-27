# Architecture

## Monorepo

pnpm workspaces + Turborepo. Les paquets internes sont consommés **en TypeScript source**
(`exports` vers `src/`), transpilés par Next.js (`transpilePackages`) : pas d'étape de build
intermédiaire, et le typage traverse tout le dépôt.

```
@quercy/web  ──►  @quercy/ui     (composants, jetons)
      │      ──►  @quercy/core   (règles pures : modules, permissions, préférences, couleurs)
      └────►  @quercy/db     ──►  @quercy/core
```

`@quercy/core` ne dépend d'aucun framework (seulement Zod). Il est testable unitairement
et utilisable côté serveur comme côté client.

## Multi-entreprises

- `Organization` = un espace. `Membership` relie un `User` à un espace avec un `Role`.
- Toute table métier porte `organizationId`, `createdAt`, `updatedAt`, `deletedAt`
  (suppression douce, corbeille de 30 jours).
- `AuditLog` trace qui a fait quoi, quand, avec les valeurs avant et après.
- L'espace actif est mémorisé **dans la session** (`session.activeOrganizationId`). À chaque
  requête, `resolveWorkspace()` vérifie que l'utilisateur en est toujours membre ; sinon il
  retombe sur son premier espace.
- **Isolation garantie par la base** : `forTenant(organizationId)` (`packages/db/src/tenant.ts`)
  est une extension Prisma. Elle ajoute `organizationId` à toute lecture, mise à jour ou
  suppression sur les modèles métier, et le force à la création. Un identifiant d'un autre
  espace est donc introuvable, même si le code appelant se trompe. Les éléments en corbeille
  (`deletedAt`) sont masqués par défaut.
- Les tests `apps/web/src/server/__tests__/isolation.test.ts` le prouvent sur une vraie base :
  deux espaces, et aucune procédure appelée depuis A ne lit ni ne modifie B.

## Authentification

Better Auth (`apps/web/src/server/auth.ts`), avec l'adaptateur Prisma :

- mot de passe haché en **Argon2id** (`@node-rs/argon2`, paramètres OWASP) ;
- lien magique, Google et Microsoft (activés seulement si configurés) ;
- double authentification TOTP avec codes de secours, et appareil de confiance 30 jours ;
- sessions en base, listables et révocables ; limitation de débit en production.

Le middleware (`src/middleware.ts`) ne fait qu'un filtre rapide sur la présence du cookie. La
session est ensuite réellement vérifiée à chaque rendu serveur (`requireWorkspaceContext`) et à
chaque appel d'API.

## API

tRPC v11 (`apps/web/src/server/trpc`) : `/api/trpc`, typage de bout en bout, superjson.

- `publicProcedure` → `authedProcedure` (session obligatoire) → `orgProcedure`, qui résout
  l'espace actif, le rôle, les équipes et fournit `ctx.db = forTenant(...)`.
- `authorize(ctx, ressource, action)` : contrôle de permission côté serveur, avec un message
  clair.
- `recordAudit(ctx, …)` : entrée du journal d'audit (acteur, IP, changements avant/après).
- Côté client, `useTRPC()` et TanStack Query fournissent les mises à jour optimistes (rôle d'un
  membre) et les squelettes de chargement.
- Côté serveur, `api()` crée un appelant direct pour les composants serveur.

## Abonnements

- **Offres** (`packages/core/src/billing.ts`) : prix par utilisateur, remise annuelle de 20 %,
  limites (membres, modules, stockage, crédits IA, automatisations).
- **`billingState()`**, fonction pure, calcule à tout instant l'offre effective et l'état de
  l'espace. Un essai terminé sans abonnement repasse en Gratuit. Au-delà des limites, l'espace
  passe en lecture seule. Un paiement refusé ouvre 7 jours de grâce, puis la lecture seule ;
  un impayé met l'espace en lecture seule immédiatement.
- **Côté serveur**, `orgProcedure` refuse toute mutation d'un espace en lecture seule, sauf
  celles qui permettent d'en sortir (payer, retirer un membre, réduire les modules, partir).
  Les invitations et l'activation de modules vérifient les limites de l'offre. L'erreur porte
  `data.planLimit`, et l'interface propose alors « Voir les offres ».
- **Stripe** (`apps/web/src/server/billing`) : Checkout pour la première souscription,
  changement d'offre au prorata, portail client, annulation en fin de période. Les sièges
  suivent automatiquement le nombre de membres.
- **Webhooks** : signature vérifiée, puis chaque événement est enregistré dans `stripe_event`,
  dont l'identifiant sert de clé d'idempotence, avant d'être traité. Un échec reste en base
  (`FAILED`) et se rejoue depuis `/admin`. Stripe reste la source de vérité ; le traitement
  recopie l'état de l'abonnement.

## Moteur générique des fiches

Tout module métier s'appuie sur le même moteur (`packages/core/src/records`,
`apps/web/src/server/records`, `apps/web/src/components/records`) :

- **Registre d'entités** (`ENTITIES`) : champs typés (texte, nombre, montant, date, liste,
  étiquettes, personne, relation…), avec leurs propriétés : modifiable, triable,
  filtrable, regroupable, agrégat. Les **champs personnalisés** (`CustomFieldDefinition`)
  s'y ajoutent ; leurs valeurs sont stockées dans la colonne JSON `customFields`.
- **Filtres** (`FilterGroup`, deux niveaux ET/OU) convertis par `buildWhere()` en clause
  Prisma, sur **liste blanche** : aucune règle ne peut viser une colonne hors du registre, ni
  `organizationId`.
- **Validation** unique (`parseRecordInput`), utilisée pour la création, l'édition en
  cellule, les actions groupées et l'import ligne par ligne.
- **API** `records.*` : liste paginée (infinie), groupes avec nombre et sous-totaux (`groupBy`
  SQL), fiche, création, modification, actions groupées, corbeille et restauration, import
  (vérification à blanc, puis import). Export CSV ou Excel par `/api/records/<entité>/export`.
- **Portée des droits** : « les siens » ou « son équipe » s'appliquent via `ownerId` à la
  lecture, à la modification et à la suppression.
- **Historique** : chaque modification est inscrite dans `AuditLog` (avant/après, champ par
  champ), et l'onglet Historique de la fiche la relit.
- **Tableau** (`DataTable`) : TanStack Table (largeurs) + TanStack Virtual (100 000+ lignes),
  vues enregistrées (personnelles ou partagées), mise à jour optimiste.
- **Collaboration** : commentaires avec @mentions, notifications, pièces jointes (stockage
  local ou S3, liens signés de 5 minutes, types et quota contrôlés), présence (Redis, TTL de
  45 s) et mises à jour en direct (Redis Pub/Sub, puis Server-Sent Events vers
  `RealtimeListener`).
- **Corbeille** : suppression douce, purge définitive à 30 jours par le worker
  (`apps/worker`, BullMQ, tous les jours à 3 h 15, heure de Paris).

Ajouter un module métier revient à : déclarer l'entité dans le registre, ajouter le modèle
Prisma (avec `organizationId`, `ownerId`, `customFields`, `deletedAt`) à `TENANT_MODELS`, et
brancher son délégué dans `records/context.ts`. Tableaux, fiches, filtres, import/export,
historique, commentaires et fichiers sont alors disponibles.

## Super-admin

Plugin `admin` de Better Auth (`user.role = "admin"`). L'espace `/admin` et le routeur
`admin.*` refusent l'accès pendant une session d'assistance. La connexion « en tant que » crée
une session marquée `impersonatedBy` : un hook l'inscrit dans le journal d'audit de chaque
espace de la personne, et chaque action faite pendant la session y est enregistrée avec
`impersonatorId`.

Les invitations stockent un **hash SHA-256 du jeton** ; le jeton lui-même n'existe que dans le
lien envoyé.

## Permissions

Matrice `ressource × action → portée` (`all` / `team` / `own`) définie dans
`packages/core/src/permissions.ts`. Les six rôles prédéfinis y sont décrits, et chaque
nouvel espace en reçoit une copie en base (`Role.permissions`), modifiable plus tard.
Les rôles personnalisés sont des lignes `Role` de plus. La fonction `can()` est appelée
**côté serveur** avant chaque écriture (ex. `updateAccentColor`) ; l'interface s'en sert
seulement pour masquer ce qui n'est pas permis.

## Interface

- **Jetons** : `packages/ui/src/styles/globals.css`. Ce sont des variables CSS
  (clair : `:root, .light` ; sombre : `.dark`), exposées à Tailwind 4 via `@theme inline`.
  Aucune couleur n'est écrite en dur dans les écrans.
- **Accent par espace** : `accentPalette()` (core) calcule une déclinaison claire et une
  sombre, avec texte lisible (contraste ≥ 4,5:1). `<AccentStyle>` les injecte dans
  `--brand*` au rendu serveur, donc sans flash.
- **Thème** : `next-themes` (classe `dark` sur `<html>`, mode « système » inclus).
- **Cadre** : `components/shell/*`, avec `ShellProvider` (état de la palette, de l'aide et de
  la barre latérale). L'état replié de la barre latérale est gardé dans un cookie et lu au
  rendu serveur.
- **Navigation** : `lib/navigation.ts` est la source unique. La barre latérale, le fil
  d'Ariane, la palette et les raccourcis « G puis X » en dérivent. Un écran n'y figure que
  s'il est livré.
- **Raccourcis** : `resolveShortcut()` est une fonction pure testée. Le hook
  `useGlobalShortcuts` la branche sur `keydown`.

## Santé et observabilité

`GET /api/health` vérifie PostgreSQL (`SELECT 1`) et Redis (`PING`), renvoie les latences et
répond 503 si un service est en panne (journal JSON structuré sur `stderr`).
