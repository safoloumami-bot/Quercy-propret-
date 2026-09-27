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
6. **Utilisateur courant avant la phase 2** (remplacé en phase 2 par la vraie session).
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

## 2026-09-27 — Phase 2

12. **Espaces, rôles et invitations maison plutôt que le plugin « organization » de Better
    Auth** : notre matrice de permissions (module × action × portée), nos rôles personnalisés et
    notre isolation Prisma dépassent ce que propose le plugin. Better Auth gère l'identité ;
    l'application gère les espaces.
13. **Espace actif stocké dans la session** (et non plus dans un cookie) : chaque appareil
    garde son espace, et une session révoquée n'emporte rien.
14. **Isolation par extension Prisma** (`forTenant`) en plus des contrôles dans les
    procédures : défense en profondeur. Les modèles sans `organizationId` (TeamMember) sont
    filtrés explicitement par l'espace de leur parent.
15. **Jetons d'invitation hachés** : le lien d'une invitation ne peut plus être réaffiché. On
    le copie juste après l'envoi, ou « Renvoyer » en génère un nouveau (l'ancien cesse de
    fonctionner).
16. **Le rôle Propriétaire ne s'attribue pas par invitation** : on invite, puis le propriétaire
    transmet le rôle. Un espace garde toujours au moins un propriétaire.
17. **Rôles prédéfinis en lecture seule**, dupliquables. Supprimer un rôle encore attribué est
    refusé avec le décompte des membres et invitations concernés.
18. **Suppression de compte = anonymisation** (nom, email, sessions, comptes, 2FA) plutôt
    qu'effacement physique : l'historique d'audit des espaces reste cohérent, conformément à
    l'intérêt légitime (traçabilité). Les espaces dont la personne était le seul membre partent
    en corbeille.
19. **Essai Business de 14 jours** posé dès la création (`trialEndsAt`). Les limites par offre
    et l'expiration de l'essai sont appliquées en phase 3.
20. **Reporté, donc absent de l'interface** : l'import de données et le logo de l'assistant
    d'accueil (stockage de fichiers, phase 4) ; l'avatar et la signature email du profil ;
    la langue anglaise (l'interface est en français, les préférences `locale` sont prêtes) ;
    la purge automatique de la corbeille (tâche planifiée, phase 4) ; les notifications
    (centre, email, système).
21. **Boîte mail de développement** (`/api/dev/mailbox`) : sans Resend, les emails sont
    consultables en JSON. Elle exige `ENABLE_DEV_MAILBOX="true"` **et** l'absence de clé
    Resend. Les tests E2E l'utilisent pour suivre les vrais liens (invitation, lien magique,
    réinitialisation).
22. **Limitation de débit désactivable par `AUTH_RATE_LIMIT="off"`**, pour les seuls tests E2E
    qui enchaînent des dizaines de connexions depuis la même IP. Elle est active par défaut en
    production.
23. **`BETTER_AUTH_URL`** (URL publique côté serveur) complète `NEXT_PUBLIC_APP_URL`, qui est
    figée dans le build : un même build peut servir sous une autre adresse (tests E2E,
    préproduction).
24. **`pnpm test` inclut les tests d'intégration** sur PostgreSQL (la base fait partie de
    l'installation de développement, et la CI la fournit).

## 2026-09-27 — Phase 3

25. **Prix** : Pro 15 € et Business 29 € HT par utilisateur et par mois (−20 % en annuel :
    12 € et 23,20 €). Les limites sont centralisées dans `PLANS`, une seule source pour le
    serveur, l'interface et le super-admin.
26. **Fin d'essai sans paiement** : l'espace passe à l'offre Gratuite. S'il dépasse ses
    limites (plus d'un membre ou de deux modules), il passe en **lecture seule** au lieu de
    supprimer quoi que ce soit : les données restent consultables, et payer, retirer des
    membres ou réduire les modules le débloque.
27. **Impayés** : 7 jours de grâce après un échec de paiement, avec un bandeau et un email aux
    propriétaires. Ensuite, lecture seule jusqu'à régularisation. Les relances automatiques de
    carte sont laissées à Stripe (Smart Retries).
28. **Seul le Propriétaire gère l'abonnement** (droit `billing.admin`) ; l'Administrateur le
    consulte.
29. **Sièges = membres actifs**, resynchronisés à chaque arrivée ou départ, au mieux : un
    échec est journalisé sans bloquer l'action, et le webhook suivant réaligne l'état.
30. **Stockage et crédits IA** : leurs limites figurent dans les offres, mais leurs jauges
    n'apparaîtront qu'avec les fonctions correspondantes (fichiers, phase 4 ; IA, phase 7),
    pour ne pas afficher de mesure factice.
31. **L'API Stripe n'est pas joignable depuis l'environnement de développement de cette
    phase** : Checkout, portail, changement d'offre et `pnpm stripe:setup` sont écrits avec le
    SDK officiel (API `2026-08-26.dahlia`) mais n'ont pas été exécutés contre Stripe. Les
    webhooks sont testés hors ligne avec de vraies signatures (`generateTestHeaderString`).
    **À valider avec une clé de test avant la mise en production.**
32. **Rôle plateforme via le plugin `admin` de Better Auth** (`user.role`), en remplacement du
    champ `isSuperAdmin`. Sessions d'assistance limitées à une heure.
33. **Migration générée par `prisma migrate diff`** : `migrate dev` refuse l'environnement non
    interactif lorsqu'une colonne est supprimée.
