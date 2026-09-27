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
- L'espace actif est mémorisé dans un cookie `httpOnly`. Au changement, le serveur vérifie
  que l'utilisateur en est bien membre.

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
