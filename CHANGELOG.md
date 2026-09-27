# Changelog

## [0.2.0] — 2026-09-27 — Phase 2 : comptes et multi-entreprises

### Ajouté

- Authentification Better Auth : email + mot de passe (Argon2id), lien magique, Google,
  Microsoft, double authentification TOTP avec codes de secours, mot de passe oublié,
  vérification d'email, sessions révocables, limitation de débit.
- Écrans : connexion, inscription, 2FA, mot de passe oublié et réinitialisation, invitation.
- Assistant d'accueil en 4 étapes (entreprise, modules présélectionnés par secteur, couleur,
  invitations) et essai Business de 14 jours.
- API tRPC v11 : espaces, membres, invitations, rôles, équipes, audit, profil. Contrôles de
  permission côté serveur et journal d'audit sur chaque action sensible.
- Isolation multi-entreprises garantie par une extension Prisma (`forTenant`), prouvée par
  13 tests d'intégration.
- Réglages :
  - Mon compte : profil, sécurité (mot de passe, 2FA, appareils connectés, suppression du
    compte), apparence synchronisée avec le profil ;
  - Espace : général (entreprise, devise, fuseau, format de date), modules, export RGPD
    (ZIP JSON + CSV), quitter l'espace ;
  - membres (rôle modifiable avec mise à jour optimiste, retrait, invitations en attente) ;
  - équipes avec responsable ;
  - rôles personnalisés avec éditeur de matrice ;
  - journal d'audit filtrable.
- Sélecteur d'espace relié à la session, création d'un nouvel espace, déconnexion.
- Composants UI : liste déroulante, tableau, encadré.
- Emails transactionnels React Email + Resend (boîte de développement sans Resend).
- Seed : cinq comptes de démonstration, un par rôle, et deux équipes.
- E2E : inscription → accueil → invitation → acceptation, lien magique, réinitialisation,
  double authentification, permissions d'un lecteur, changement de rôle tracé.

### Modifié

- Navigation : entrée « Réglages » et sous-navigation filtrée selon les permissions.
- Le changement d'espace et la couleur d'accent passent par l'API tRPC (plus d'actions
  serveur).

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
