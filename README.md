# Quercy

Logiciel de gestion tout-en-un et modulaire pour les PME, TPE et indépendants : un socle
commun et des modules que chaque entreprise active selon ses besoins. Il sera disponible dans
le navigateur (optimisé pour ordinateur) et en application Windows/macOS (Tauri).

> **État actuel : phase 1 (fondations) terminée.** Monorepo, design system, cadre de
> l'application (barre latérale, barre supérieure, palette `Ctrl+K`, raccourcis), thèmes clair
> et sombre, couleur d'accent par espace, schéma de base et page de santé.
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
```

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
packages/ui       Design system : jetons CSS (Tailwind 4) et composants (Radix, shadcn)
packages/core     Logique métier partagée : modules, rôles et permissions, préférences (Zod)
packages/db       Prisma + PostgreSQL : schéma, migrations, seed
legacy/           Application terrain Quercy Propreté v15 (référence, non compilée)
docs/             Architecture et décisions
```

## Écrans disponibles

- `/` — accueil : premiers pas, résumé de l'espace
- `/reglages/apparence` — thème personnel et couleur d'accent de l'espace
- `/design-system` — jetons et composants
- `/api/health` — état de la base et de Redis (200 ou 503)

Raccourcis : `Ctrl+K` palette, `/` recherche, `?` aide, `Ctrl+B` barre latérale,
`G` puis `H` / `R` / `D` pour naviguer.

## Déploiement

La CI (GitHub Actions, `.github/workflows/ci.yml`) vérifie le formatage, le lint, les types,
les tests unitaires, le build et les parcours E2E sur PostgreSQL et Redis réels.
En production : `pnpm db:deploy` puis `pnpm build` et `pnpm --filter @quercy/web start`, avec
les variables de `.env.example`. Les cibles Vercel et Railway/Fly, et les installeurs desktop,
sont documentés dans les phases correspondantes.

Voir aussi [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) et [`docs/DECISIONS.md`](docs/DECISIONS.md).
