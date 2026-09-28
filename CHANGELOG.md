# Changelog

## [0.8.0] — 2026-09-28 — Phase 8 : modules complémentaires

### Ajouté

- **Achats** : fournisseurs, commandes fournisseurs (Kanban, calendrier des livraisons),
  factures fournisseurs (à payer, payées — date de paiement automatique), notes de frais.
  Création d'une facture fournisseur en un clic depuis un document lu par l'assistant.
- **Stocks** : entrepôts, mouvements (entrées, sorties, ajustements), stock de chaque article
  recalculé à chaque mouvement (corbeille comprise), seuil d'alerte avec notification.
- **Agenda** : événements (rendez-vous, appels, interventions) en calendrier, liés aux clients,
  contacts et projets.
- **Support** : tickets (Kanban par statut, priorité, canal, échéance, date de résolution
  automatique), fil de commentaires et pièces jointes.
- **RH** : salariés, congés et absences (jours ouvrés calculés, calendrier, Gantt, validation).
- **Trésorerie** : comptes bancaires avec solde tenu à jour, opérations (import CSV,
  rapprochement, lien vers factures clients et fournisseurs).
- **Documents** : bibliothèque (dossiers, catégories, échéances, versions de fichiers).
- 5 modèles de rapports (flux de trésorerie, factures à payer, achats par fournisseur,
  tickets par statut, absences) ; l'assistant connaît les nouveaux modules.
- Données de démonstration sur 12 mois pour chaque module, tests d'intégration et E2E.

## [0.7.0] — 2026-09-28 — Phase 7 : assistant IA

### Ajouté

- Panneau **Assistant** ouvrable partout (`Ctrl+J` ou bouton de la barre supérieure), ancré à
  droite, qui connaît l'écran et la fiche ouverts ; suggestions selon le contexte (résumer une
  fiche, rédiger une relance, CA du mois…).
- Questions en langage naturel sur les données : réponse en flux, tableau ou graphique, lien
  vers la liste filtrée et ouverture dans le constructeur de rapports.
- Actions avec **confirmation obligatoire** : création et modification de fiches, devis avec
  lignes, relance des factures impayées, envoi de documents ; compte rendu et lien vers le
  résultat.
- Rédaction (emails, relances, descriptions, comptes rendus, réponses) et résumés de fiches.
- Lecture de factures fournisseurs et de justificatifs (PDF ou photo) : fournisseur, numéro,
  dates, HT, TVA par taux, TTC, contrôle de cohérence, copie des données.
- Historique des conversations (ouvrir, supprimer), crédits mensuels par offre, état « non
  configuré » sans clé d'API.
- Faux service Claude pour les tests ; tests d'intégration (questions, actions, confirmation
  unique, crédits, erreurs, lecture de documents) et 3 parcours E2E.

## [0.6.0] — 2026-09-28 — Phase 6 : tableaux de bord et rapports

### Ajouté

- Accueil en tableau de bord personnalisable : widgets déplaçables et redimensionnables
  (grille), bibliothèque de 14 widgets (CA facturé, encaissements, factures en retard par
  ancienneté, évolution du CA, meilleurs clients, devis en attente, objectif de CA, pipeline,
  affaires gagnées, mes activités, mes tâches, temps passé, rapport enregistré, prise en main),
  tableau par défaut selon le rôle.
- Indicateurs comparés à la période précédente (flèche et %), sélecteur de période global
  (aujourd'hui, 7 j, 30 j, mois, trimestre, année, 12 mois, personnalisée).
- Clic sur un chiffre ou une barre : ouverture de la liste filtrée correspondante.
- Rapports : 10 modèles prêts à l'emploi (ventes, CRM, projets) et constructeur (données,
  mesure, regroupement et intervalle, période, filtre, graphique barres/courbe/aire/secteurs/
  tableau/chiffre clé), enregistrement, partage, widget de tableau de bord.
- Exports PDF, Excel et CSV ; envoi programmé par email (hebdomadaire ou mensuel) par le worker.
- Paquet `@quercy/reports` ; deux rapports de démonstration.
- Tests : périodes, agrégation, accès aux listes filtrées, envois (core et paquet), API des
  tableaux de bord et rapports, 2 parcours E2E.

### Corrigé

- Filtres « n'est aucun de » et « est vide » sur une colonne obligatoire.

## [0.5.0] — 2026-09-28 — Phase 5 : modules cœur (CRM, ventes, projets)

### Ajouté

- Moteur : 13 entités sur le même registre, relations vers n'importe quelle entité, fiches
  liées en onglets (vue 360°), affichages **Kanban**, **calendrier** et **Gantt** par
  glisser-déposer, valeurs par défaut, champs durée et montants en centimes, routes génériques
  `/<module>/<entité>`.
- CRM : opportunités et pipeline Kanban (sommes par étape, probabilité et clôture
  automatiques), activités (appels, rendez-vous, tâches) en tableau ou calendrier, détection et
  fusion des doublons.
- Ventes : catalogue ; devis, commandes, factures, avoirs, factures récurrentes ; saisie des
  lignes (catalogue ou libre, remise, TVA par ligne) ; émission avec numérotation continue ;
  PDF avec **Factur-X** ; envoi par email avec pièce jointe ; lien client (PDF, acceptation du
  devis, paiement en ligne Stripe) ; paiements et reste dû ; avoirs ; transformation devis →
  commande → facture ; facturation automatique récurrente et relances d'impayés par le worker ;
  paramètres de vente (mentions légales, numérotation, relances, clés Stripe chiffrées).
- Projets : projets (Gantt, Kanban), tâches (Kanban, calendrier, Gantt), saisies de temps,
  chronomètre dans la barre supérieure, facturation du temps d'un projet.
- Paquets `@quercy/documents` (PDF, Factur-X, opérations de vente) et `@quercy/mailer`.
- Données de démonstration sur 12 mois : 72 opportunités, 260 activités, 14 articles, 180
  factures, 69 devis, commandes, avoirs, 17 modèles récurrents, 12 projets, 83 tâches, 204
  saisies de temps.
- Tests : calculs de ventes (TVA, numérotation, relances), PDF et XML Factur-X, services de vente
  sur base réelle (9), API ventes/CRM/chronomètre (8), 6 parcours E2E (facture, devis accepté
  en ligne, pipeline, doublons, chronomètre et affichages).

### Corrigé

- Le score d'un contact (entier) est arrondi à la saisie au lieu d'être refusé par la base.

## [0.4.0] — 2026-09-27 — Phase 4 : moteur générique (et CRM pilote)

### Ajouté

- Moteur générique des fiches : registre d'entités, champs typés, filtres ET/OU sur liste
  blanche, tri multiple, validation unique, portée « les siens / son équipe ».
- Tableau avancé :
  - virtualisation et pagination infinie ;
  - colonnes redimensionnables, déplaçables, masquables et figées ;
  - tri multiple, filtres imbriqués, regroupement avec sous-totaux ;
  - sélection multiple et actions groupées ;
  - édition en cellule avec mise à jour optimiste ;
  - densité, menu contextuel, navigation `J`/`K` ;
  - vues enregistrées, personnelles ou partagées.
- Fiches : panneau latéral et page complète, champs modifiables avec enregistrement automatique,
  onglets internes, présence en temps réel, commentaires avec @mentions, historique avant/après,
  pièces jointes (glisser-déposer, liens signés, quota de l'offre), vue 360° (contacts d'une
  entreprise).
- Champs personnalisés (texte, nombre, date, liste, case) sur toutes les fiches.
- Import CSV/Excel en 3 étapes avec vérification, export CSV/Excel de la vue ou de la sélection.
- Corbeille de 30 jours avec restauration et annulation immédiate ; purge automatique par le
  worker BullMQ (`apps/worker`).
- Centre de notifications (mentions, commentaires, attributions), mises à jour en direct (SSE).
- Recherche globale des fiches dans la palette `Ctrl+K`, raccourci `C` pour créer.
- Module CRM : contacts et entreprises, jeu de démonstration réaliste (60 entreprises, 191
  contacts).
- Paquet `@quercy/storage` (disque local ou S3 : AWS, R2, MinIO).
- Tests : moteur (48 tests core), 14 tests d'intégration des fiches, stockage, purge, 4 parcours
  E2E du CRM.

## [0.3.0] — 2026-09-27 — Phase 3 : abonnements

### Ajouté

- Offres Gratuit, Pro, Business et Entreprise : prix par utilisateur, remise annuelle de 20 %,
  essai Business de 14 jours sans carte, limites de membres et de modules appliquées côté
  serveur, avec un message clair et un lien « Voir les offres ».
- État de facturation : fin d'essai, délai de grâce de 7 jours après un paiement refusé,
  lecture seule si besoin (seules les actions de régularisation restent possibles). Un
  bandeau l'explique en haut de chaque écran.
- Stripe : Checkout, changement d'offre au prorata, portail client (moyen de paiement et
  coordonnées), annulation et reprise, synchronisation des sièges, factures téléchargeables.
- Webhooks Stripe signés, idempotents et rejouables (table `stripe_event`), email de relance
  aux propriétaires en cas d'impayé.
- Page Facturation : offre actuelle, jauges d'utilisation, comparatif mensuel/annuel,
  factures.
- Super-admin (`/admin`) : MRR et ARR, espaces payants, essais, churn sur 30 jours, liste des
  espaces, webhooks en échec à rejouer, et connexion « en tant que » avec bandeau, durée
  limitée et trace dans le journal d'audit.
- `pnpm stripe:setup` : création idempotente des produits et prix Stripe.
- Seed : compte super-admin et cinq espaces clients aux situations variées.
- Tests : 11 tests d'intégration de facturation et 4 parcours E2E.

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
