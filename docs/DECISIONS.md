# Journal des décisions

Chaque choix ambigu est noté ici : la date, la décision et sa raison.

## 2026-09-27 — Phase 1

1. **Nom et identité.** Le produit s'appelle **Quercy**, à partir de l'application terrain
   Quercy Propreté fournie. L'accent par défaut est `#0F6E5E` et l'icône « QP » est reprise
   de cette application.
2. **Application existante conservée** dans `legacy/terrain-v15/` comme référence (pointage,
   contrôle qualité, bons d'intervention). Elle n'est ni compilée ni lintée. Ses fonctions
   seront reprises dans un module dédié plus tard.
3. **Next.js 15.5** (et non la 16, pourtant disponible), comme l'impose le cahier des charges.
4. **Prisma 6.19** plutôt que 7 ou 8 : branche stable et éprouvée, sans adaptateur de pilote
   obligatoire. La migration vers 7 sera étudiée à part.
5. **Tables d'identité au format Better Auth** (`user`, `session`, `account`, `verification`)
   dès la phase 1, pour brancher l'authentification en phase 2 sans migration destructive.
6. **Utilisateur courant avant la phase 2.** Sans authentification, `getWorkspaceContext()`
   prend le premier utilisateur qui possède un espace. La forme du contexte est définitive :
   la phase 2 remplacera seulement la source (la session). Si aucun espace n'existe, un écran
   d'installation guide vers `pnpm db:migrate && pnpm seed`.
7. **Police Geist** (paquet npm `geist`, fichiers locaux) plutôt qu'Inter via Google Fonts :
   aucun appel réseau au build, rendu identique hors ligne et dans Tauri.
8. **Paquets internes en TypeScript source**, sans build intermédiaire (voir ARCHITECTURE).
9. **Éléments de l'interface non livrés en phase 1**, donc absents plutôt que factices,
   comme l'exige la règle « aucun bouton inactif » :
   - « + Créer », les notifications et l'assistant IA de la barre supérieure (phases 4, 2 et 7) ;
   - les favoris, les modules et le réordonnancement de la barre latérale (phases 4 et 5) ;
   - les onglets internes et le panneau de détail (phase 4, avec les fiches) ;
   - les paquets `packages/ai` et `apps/desktop`, créés en phases 7 et 10.
10. **Le thème est personnel** et mémorisé par le navigateur (next-themes). Il sera
    synchronisé avec `User.preferences` quand le profil arrivera (phase 2). **La couleur
    d'accent** est commune à l'espace, enregistrée en base et tracée dans l'audit.
11. **Politique CSP** reportée à la phase 11 (elle demande des nonces avec Next.js). Les
    autres en-têtes de sécurité sont déjà actifs.
