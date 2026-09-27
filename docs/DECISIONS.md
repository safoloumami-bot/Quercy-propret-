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

## 2026-09-27 — Phase 4

34. **Le CRM (Contacts et Entreprises) sert de module pilote au moteur générique**, sans quoi
    la phase n'aurait rien à montrer. La phase 5 le complétera (pipeline, opportunités,
    activités, doublons).
35. **TanStack Table v8** (v9 vient de paraître avec une API réécrite) ; la virtualisation passe
    par TanStack Virtual. Pagination par décalage (100 lignes par page) : simple et correcte ;
    la pagination par curseur de tri est une optimisation possible pour les très grands volumes.
36. **Mode regroupé** : les groupes (valeur, nombre, sous-totaux) viennent d'un `groupBy` SQL ;
    les lignes d'un groupe se chargent à son ouverture (50 par 50). Le regroupement porte sur les
    champs standards regroupables.
37. **Champs personnalisés** en JSON (`customFields`) : filtrables, modifiables, importables et
    exportables, mais **non triables** (un tri sur une valeur JSON n'est pas indexable).
38. **Gestes du tableau** : un clic sur la colonne principale ouvre le panneau, un double-clic sur
    une autre cellule la modifie (la touche `E` aussi), le clic droit ouvre le menu contextuel.
    Les deux gestes sont distincts pour que le double-clic ne rouvre jamais le panneau.
39. **Import** : CSV ou Excel lus dans le navigateur (papaparse, read-excel-file), correspondance
    automatique des colonnes par libellé, vérification à blanc côté serveur, puis import. Les
    lignes invalides ne sont jamais importées ; limite de 5 000 lignes par import. Les références
    se résolvent par libellé (responsable par email ou nom, entreprise par nom exact).
40. **Temps réel** : Server-Sent Events plutôt que WebSocket. C'est unidirectionnel, compatible
    avec Next.js sans serveur dédié, avec reconnexion automatique. Redis Pub/Sub relaie les
    événements entre instances.
41. **Stockage extrait dans `@quercy/storage`**, partagé avec le worker (purge des fichiers).
    Pilote local par défaut en développement, S3 compatible en production.
42. **Quota de stockage** = Go par membre de l'offre × nombre de membres, vérifié à chaque envoi.
43. **Marqueur `data-ready` sur `<html>`** une fois l'interface interactive. Il remplace l'attente
    « réseau inactif » des tests E2E, devenue impossible avec la connexion SSE permanente.

## 2026-09-28 — Phase 5

44. **Le moteur est généralisé plutôt que dupliqué** : toutes les entités (13) passent par le même
    registre, la même API `records.*` et les mêmes écrans. Les documents commerciaux gardent un
    écran dédié (lignes, actions) mais leur liste, leurs filtres, vues et exports sont ceux du
    moteur.
45. **Étapes du pipeline fixes** (Nouvelle, Qualifiée, Proposition, Négociation, Gagnée,
    Perdue) avec probabilité par défaut modifiable par opportunité. Des pipelines configurables
    par espace viendront si le besoin apparaît ; les étapes standard couvrent la cible TPE/PME.
46. **Montants des documents en centimes entiers** (pas de flottants) ; les autres montants
    (CA, budget, prix catalogue) restent en euros décimaux, suffisants pour de l'indicatif.
    Un champ déclaré `cents` est saisi et filtré en euros, stocké en centimes.
47. **TVA calculée par taux sur la somme des bases**, arrondie au centime, comme sur une
    facture française ; franchise en base (293 B) gérée globalement dans les paramètres.
48. **Numéro attribué à l'émission, pas à la création** : les brouillons n'ont pas de numéro,
    ce qui garantit une suite continue sans trou (obligation légale). Préfixes configurables.
49. **Facture émise immuable, jamais supprimée** : correction par avoir (total ou partiel,
    imputé sur le reste dû). Les devis et commandes émis ne sont plus modifiables mais se
    dupliquent.
50. **Factur-X profil BASIC** (en-tête, lignes, TVA, totaux) embarqué dans le PDF avec les
    métadonnées XMP Factur-X. Le PDF embarque ses polices mais n'inclut pas de profil de
    couleur ICC : la conformité PDF/A-3 stricte (validation veraPDF) reste à outiller ; le XML,
    lui, est lu par les plateformes de dématérialisation.
51. **Génération PDF avec pdf-lib** (JavaScript pur, sans navigateur ni binaire natif) : fonctionne
    à l'identique dans Next.js, le worker et les tests. La police Geist (OFL) est embarquée
    encodée en base64 dans `fonts.generated.ts` pour éviter toute dépendance au système de
    fichiers du déploiement.
52. **Paiement en ligne sur le compte Stripe de chaque entreprise** (ses clés, chiffrées en
    AES-256-GCM, clé dérivée de `BETTER_AUTH_SECRET` ou fournie par `ENCRYPTION_KEY`), plutôt
    que Stripe Connect : aucun agrément de plateforme de paiement, l'argent ne transite jamais
    par Quercy. Webhook propre à chaque espace, paiement idempotent par session Checkout.
53. **Emails et logique de facturation dans des paquets partagés** (`@quercy/mailer`,
    `@quercy/documents`) : le worker envoie factures récurrentes et relances avec le même code
    que l'application. Les emails de documents sont en HTML simple (même charte) plutôt qu'en
    React Email, pour rester utilisables hors de Next.js.
54. **Relances automatiques par paliers** (J+7, J+15, J+30 par défaut, configurables), une par
    palier et jamais deux le même jour ; désactivables par espace.
55. **Acceptation de devis en ligne** par nom du signataire + case « Bon pour accord »,
    horodatée et inscrite au journal d'audit. Ce n'est pas une signature électronique qualifiée
    (eIDAS) ; elle suffit au « bon pour accord » usuel des TPE.
56. **Doublons** détectés à la demande par similarité trigramme (pg_trgm) sur les noms, plus
    SIREN ou email identiques ; fusion réservée aux personnes ayant accès à toutes les fiches.
    La fiche absorbée part à la corbeille (restaurable) après transfert des fiches liées,
    commentaires et fichiers. Les paires écartées sont mémorisées.
57. **Chronomètre** : une saisie de temps ouverte par personne ; en démarrer un autre arrête le
    précédent. Durée arrondie à la minute supérieure.
58. **Valeurs par défaut dans le registre** (statut, priorité, étape, unité, TVA, date du jour)
    appliquées à la création côté serveur et pré-remplies dans le formulaire.
