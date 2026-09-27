# Changelog

## [0.1.0] — 2026-09-27 — Phase 1 : fondations

### Ajouté

- Monorepo pnpm + Turborepo, TypeScript strict, ESLint 9, Prettier, Husky + lint-staged.
- `docker-compose.yml` (PostgreSQL 16, Redis 7), `.env.example`.
- `@quercy/core` : catalogue des 12 modules, rôles prédéfinis et matrice de permissions
  (`can`, portées all/team/own, fusion), préférences d'espace et d'utilisateur (Zod),
  calculs de contraste et palette d'accent accessible.
- `@quercy/db` : schéma Prisma de base (identité, espaces, rôles, équipes, invitations,
  audit, champs personnalisés, vues enregistrées), première migration, seed.
- `@quercy/ui` : jetons (clair, sombre, accent personnalisable) et composants (bouton,
  champ, zone de texte, libellé, case, interrupteur, badge, carte, onglets, menu, dialogue,
  palette de commandes, infobulle, toast avec « Annuler », avatar, squelette, état vide, touche).
- Application web : barre latérale repliable (`Ctrl+B`, état mémorisé), barre supérieure avec
  fil d'Ariane, palette `Ctrl+K`, aide des raccourcis (`?`), navigation « G puis X »,
  sélecteur d'espace, menu utilisateur, accueil, réglages d'apparence (thème, couleur d'accent
  tracée dans l'audit, avec annulation), page `/design-system`, `/api/health`.
- CI GitHub Actions : formatage, lint, types, tests unitaires, build, E2E Playwright.
