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
