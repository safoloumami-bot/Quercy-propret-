# Changelog

## [1.10.0] — 2026-10-08 — Chiffrage, devis, contrats et facturation des passages (lot 8)

### Ajouté

- **Nettoyage › Chiffrages** : personnes, heures, coût horaire réel, kilomètres et coût au km,
  temps de déplacement, produits, matériel, location, sous-traitance, autres coûts, marge
  souhaitée. Calcul en direct : coût de revient, prix minimum, prix conseillé
  (prix = coût / (1 − marge) ; 190 € à 32 % → 279,41 € HT), marge en € et en %, forfait
  mensuel pour un récurrent.
- **Validation** : le chiffrage part au chef, qui valide ou refuse (avec motif) ; sous la
  marge minimale de l'entreprise, le patron valide aussi. Modifier un chiffrage validé le
  renvoie en brouillon.
- **Du chiffrage au contrat sans rien ressaisir** : « Créer le devis » (brouillon prêt à
  envoyer), puis « Créer le contrat » ponctuel (son passage est planifié) ou récurrent (le
  planning se remplit). Onglet « Récurrence » d'un contrat ponctuel : le passer en récurrent.
- **Contrats à l'année** : type, mode de facturation (forfait mensuel ou au passage), prix
  par passage, reconduction tacite, révision annuelle des prix. Chaque matin : révision à la
  date anniversaire, reconduction d'un an ou fin du contrat, responsables prévenus.
- **Nettoyage › Facturation des passages** : une facture brouillon par client et par mois,
  détaillée par contrat et par site (ou cage) ; passages manqués déduits du forfait, passages
  réalisés au prix prévu, suppléments ajoutés après validation. Un passage facturé ne l'est
  jamais deux fois ; un mois se facture une fois terminé.
- **Paramètres de vente › Chiffrage** : marge minimale, coût horaire et coût au km proposés.

## [1.9.0] — 2026-10-07 — Matériel, véhicules, stock et location (lot 7)

### Ajouté

- **Matériel & véhicules › Matériel** : chaque machine ou outil avec son état (en stock,
  affecté à un salarié ou à un site, réservé, loué, en maintenance, en réparation, vendu,
  réformé), sa propriété (à l'entreprise ou loué, avec loyer et fin de location) et ses tarifs
  de location. Onglet « Suivi » : déplacer ou changer d'état, journal de tous les mouvements,
  locations passées, pannes signalées.
- **Matériel & véhicules › Véhicules** : immatriculation, modèle, énergie, conducteur,
  kilométrage, financement, contrôle technique, entretien (date ou kilométrage), assurance,
  fin de contrat. Alerte aux responsables 30 jours avant chaque échéance, une seule fois par
  échéance.
- **Matériel & véhicules › Locations** : référence LOC-AAAA-NNNN, client, site de livraison,
  période, tarif au jour, à la semaine ou au mois (toute période entamée est due), caution.
  Un matériel ne peut pas être loué deux fois sur les mêmes jours. Boutons « Sortie »,
  « Retour » (caution rendue ou non) et « Facturer » (facture brouillon prête à émettre).
- **Stock par emplacement** (onglet de l'article) : dépôt, véhicule, salarié ou site ;
  transfert d'un emplacement à un autre.
- **Commandes fournisseurs** : lignes de commande (tarifs du fournisseur proposés),
  réception partielle ou totale qui fait entrer les articles en stock au dépôt choisi.
- **Fournisseurs** : onglet « Tarifs » (prix et référence par article).
- **Fiches mission** : consommables du stock prévus par passage ; l'agent relève les quantités
  utilisées et elles sortent du stock (du véhicule de l'agent) à la clôture du passage.
  Alerte « stock bas » aux responsables.
- **Application terrain** : bloc « Véhicule et matériel » — état des lieux du véhicule
  (kilométrage obligatoire, il ne peut pas baisser ; remarques et photo), signalement de panne
  sur un véhicule ou un matériel, transmis aux responsables.

## [1.8.0] — 2026-10-07 — Intervenants, absences, remplacements et tournées (lot 6)

### Ajouté

- **Nettoyage › Intervenants** : statut (salarié, sous-traitant, dirigeant), activités, zone,
  coût horaire, remplaçants n°1 et n°2, véhicule habituel, autorisation de conduire les
  véhicules de l'entreprise ; pour les sous-traitants, raison sociale, SIRET et attestations
  (URSSAF, assurance, Kbis) avec date d'expiration. Alerte aux responsables 30 jours avant
  l'expiration, puis à l'expiration.
- **Nettoyage › Absences** : congés, maladies, indisponibilités, formations. Demandées par
  l'agent (application terrain ou logiciel), validées ou refusées par le chef, qui est prévenu.
  Saisies par un responsable, elles sont validées d'office.
- **Remplacements** : pour une absence validée, la liste des passages touchés et, pour chacun,
  les remplaçants proposés dans l'ordre — n°1, n°2, agent qualifié (même activité ou
  connaît le site), puis sous-traitant ; un agent déjà pris est signalé, et la même personne
  n'est jamais proposée sur deux passages qui se chevauchent. Le chef confirme ; le remplaçant
  est prévenu et reçoit la fiche du site et ses accès, et seulement eux.
- **Planning** : un passage confié à un remplaçant apparaît sur sa ligne (« Remplace … ») ;
  les jours d'absence sont grisés.
- **Nettoyage › Tournées** : nom, zone, agent principal et remplaçant, véhicule, jours
  habituels, heures de départ et de fin, point de départ, sites dans l'ordre avec temps et
  distance de trajet, totaux ; active ou non.
- **Application terrain** : bloc « Mes absences » sous la tournée (demande et suivi).

## [1.7.0] — 2026-10-06 — Rapport syndic et fiches mission (lot 5)

### Ajouté

- **Rapport client (syndic) en PDF**, depuis la vue d'ensemble du client : un seul rapport
  pour toutes ses résidences et cages ; chiffres clés (passages prévus et réalisés, taux de
  réalisation, anomalies, sites), détail des passages (résidence, date, prestation,
  intervenant, statut, preuve, observation, anomalie) et section anomalies avec photos. Seules
  les anomalies validées et marquées « visible par le client » y figurent. Au nom et aux
  couleurs de l'entreprise.
- **Fiches mission** (onglet « Fiche de site ») : par site ou par prestation, tâches par zone
  avec fréquence (à chaque passage, semaine, mois, trimestre), point critique et photo
  obligatoire ; consignes, produits, matériel, durée et procédure (méthode « du haut vers le
  bas »). **Bibliothèque** de tâches pour 15 zones (bureaux, ateliers, cuisine, sanitaires,
  vestiaires, escaliers, halls, ascenseurs, parkings, vitres, locaux poubelles, extérieurs,
  salles de réunion, chambres, remise en état).
- **Seules les tâches dues ce jour-là** s'affichent dans l'application terrain (hebdomadaires
  au premier passage de la semaine, mensuelles au premier du mois…), avec la fiche mission et
  les informations du site destinées à l'agent.
- **Versions** : chaque modification crée une version (historique, note) ; les passages à
  venir pas encore commencés reçoivent la nouvelle version, les autres gardent la leur.
- **Import et export Excel** des tâches d'une fiche.
- **Feuille de passage** par site et par mois en PDF imprimable (date, heures, statut,
  intervenant réel, conformité, observation, bon).
- **Correction du relevé par le chef**, même après clôture, inscrite au journal de
  l'intervention avec l'avant / après.
- Anomalie automatique « photo obligatoire manquante » à la clôture.

### Corrigé

- Les onglets d'une fiche passent à la ligne sans chevaucher le contenu.

## [1.6.0] — 2026-10-06 — Application terrain sur le nouveau modèle et anomalies (lot 4)

### Ajouté

- **Signaler une anomalie depuis l'application terrain** : type (ampoule, fuite, encombrants,
  porte, interphone, nuisibles, dégradation, salissure, autre), emplacement, description et
  photo ; fonctionne hors réseau, sans doublon au renvoi. Elle part au chef et au patron,
  jamais au client.
- **Nettoyage › Anomalies** : à valider, validées, en cours, résolues, rejetées ; le
  responsable valide, corrige, rejette, prend en charge, résout (avec l'action menée) ou
  rouvre ; « visible par le client » seulement une fois validée. Saisie directe d'une anomalie
  constatée en ronde ou signalée par le client.
- **Détection automatique** : passage non réalisé, arrivée hors créneau (autre jour ou plus de
  deux heures d'écart), durée anormale (plus du double ou moins de la moitié du prévu), point
  critique non fait à la clôture, contrôle qualité non conforme. Une seule fois par cas.
- **Onglet « Relevé terrain »** sur chaque intervention : agent prévu, remplaçant et agent
  réel, points de contrôle pièce par pièce, photos, consommables, journal, anomalies.
- Le remplaçant voit et traite dans l'application les passages qui lui sont confiés.

### Modifié

- Le relevé de l'application (points de contrôle, consommables, photos, journal) est rangé
  dans ses propres tables ; les relevés existants y ont été repris automatiquement, sans
  perte. Les écrans de l'application ne changent pas.

## [1.5.0] — 2026-10-06 — Clients, sites et fiches de site (lot 3)

### Ajouté

- **Sous-sites** : une résidence et ses cages, un site et ses bâtiments ; code de site et site
  parent sur la fiche, liste des sous-sites.
- **Fiche de site** : accès, clés, consignes, sols, produits, risques… chaque information
  visible par les agents du site, par un seul agent ou par les responsables seulement.
  L'agent la retrouve dans « Ma journée ».
- **Vue d'ensemble client** (ex. un syndic) : tous ses sites et sous-sites, passages du mois,
  taux de réalisation, prochains passages, anomalies ouvertes, note qualité.
- **Planning** : alerte quand un intervenant est prévu à deux endroits en même temps, filtre
  par intervenant.
- L'import V12 range les détails des sites dans la fiche de site.

## [1.4.0] — 2026-10-06 — Moteur de récurrence et import du fichier V12 (lot 2)

### Ajouté

- **Moteur de récurrence** : chaque semaine ou toutes les N semaines, semaine(s) du mois
  (1er lundi, semaines 1 et 3, dernier vendredi), jours fixes du mois, tous les N jours, dates
  précises ; versions datées (le dimanche ce mois-ci, le mardi ensuite) ; jours fériés
  (maintenir, ignorer, avancer, reporter ; France ou Alsace-Moselle) ; fermetures de site ;
  calcul des jours dans le fuseau de l'entreprise.
- **Génération sans doublon** sur trois mois glissants, chaque nuit et à chaque validation ;
  une nouvelle version ou une pause recalcule les seuls passages futurs intacts.
- **Nettoyage › Récurrences** : séries à valider, actives, en pause ; correction de la règle
  avec aperçu des prochaines dates ; validation unitaire ou groupée ; changement de règle à
  partir d'une date.
- **Nettoyage › Import Excel** : lecture du fichier de pilotage V12 (sites, clients,
  intervenants, tournées, passages réalisés), aperçu complet avant import, import sans
  doublon. Les noms de sites viennent de « Nom du site » ; les règles sont proposées, jamais
  déduites des dates de passage ; les passages réalisés sont repris sans heures inventées ; le
  fichier n'est jamais conservé.
- Code de site (C01, B01…) unique dans l'entreprise.

## [1.3.0] — 2026-10-06 — Socle de la plateforme (lot 1)

### Ajouté

- **Chaîne contractuelle** : prestations contractuelles, séries de récurrence (proposées puis
  validées, règle des jours fériés, fuseau), versions de règle datées, fermetures de site.
- **Interventions enrichies** : intervenant prévu, remplaçant et intervenant réel, date
  d'origine, clé de créneau anti-doublon, notes terrain, nouveaux statuts (reportée, accès
  impossible, à reprendre).
- **Journal d'évènements** des interventions (créée, arrivée, photo, signature, départ,
  clôture, non réalisée, réaffectée), alimenté par l'application terrain et le logiciel.
- **Photos et preuves**, **anomalies** : entités dédiées (le circuit de validation suit au lot 4).
- Rôle prédéfini **Intervenant** : son planning et ses missions, jamais de suppression.

### Sécurité

- **Isolation garantie par PostgreSQL** : RLS sous un rôle restreint pour toutes les requêtes
  d'un espace, et refus par la base de toute référence entre deux entreprises.
- **L'historique ne s'efface plus** : une intervention pointée, documentée ou signalée, et le
  site ou le contrat qui la porte, ne sont jamais purgés de la corbeille.

## [1.2.0] — 2026-10-05 — Application terrain reliée au logiciel

### Ajouté

- **Application terrain** (dossier `apps/terrain`, servie à `/terrain/<espace>`) : l'application
  de pointage des agents, à l'écran inchangé, branchée sur le logiciel. Les chantiers sont les
  interventions du module Nettoyage, les agents sont les membres de l'espace (identifiant et
  code à 6 chiffres), les photos deviennent des pièces jointes, la clôture numérote le bon
  (BI-AAAA-NNNN), enregistre un contrôle qualité et envoie le bon au client.
- **Marque convertible** : nom, initiales, icône, couleur et ville de l'application viennent
  des réglages de l'entreprise ; la même application sert toute entreprise cliente.
- **Grilles de contrôle** selon la prestation : logement meublé, bureaux, parties communes,
  remise en état.
- Page **Nettoyage › Application terrain** : lien, QR code à scanner, accès créés.
- **Stockage des fichiers sur Netlify** (Netlify Blobs), sans réglage : pièces jointes et
  photos fonctionnent désormais sur l'hébergement Netlify.

## [1.1.0] — 2026-09-28 — Module Nettoyage et hébergement Netlify complet

### Ajouté

- **Module « Nettoyage & interventions »** : sites clients (adresse, codes d'accès, clés,
  consignes, surface), contrats d'entretien récurrents (jours, horaire, durée, agent attitré,
  forfait mensuel) qui remplissent seuls le planning trois semaines à l'avance, interventions
  (agent, statut, pointage, temps réel, photo, compte rendu, signature du client), contrôles
  qualité notés (grille de 5 points, note et résultat calculés).
- **Planning des agents** : semaine par agent, réaffectation en un clic (remplacement d'un
  absent), mise à jour depuis les contrats.
- **Ma journée** (écran téléphone de l'agent) : itinéraire, codes d'accès, consignes,
  pointage d'arrivée et de départ, photo, compte rendu et signature au doigt.
- **Heures et paie** : heures du mois par agent, dont nuit (21 h–6 h), dimanche et jours
  fériés ; export CSV pour le cabinet de paie.
- **Export comptable FEC** (Ventes › Export comptable) : ventes, avoirs, achats et
  encaissements au format réglementaire.
- Catégorie de document « Sécurité (FDS, prévention) » ; indicateurs d'accueil
  « Interventions par statut » et « Note qualité moyenne par site ».
- Catalogue de démonstration en **vraies photos au fond retiré** (Open Images, CC BY 2.0,
  crédits dans `apps/web/public/catalogue/credits.txt`).
- Menu mobile : l'application s'utilise sur téléphone.

### Hébergement Netlify

- Les **migrations** de la base s'appliquent à chaque déploiement (`scripts/netlify-build.sh`).
- Les **tâches quotidiennes** (planning des contrats, factures récurrentes, relances,
  rapports programmés, corbeille) tournent sans worker grâce à une fonction planifiée
  (`netlify/functions/daily.mts` → `/api/cron/<tâche>`), code partagé dans `@quercy/jobs`.
- Webhooks livrés immédiatement quand Redis n'est pas configuré.
- En production sans service d'e-mail, l'interface dit clairement qu'aucun e-mail n'est
  parti (invitations avec lien à copier, avertissement « mot de passe oublié »).

## [1.0.0] — 2026-09-28 — Phase 11 : finition

### Ajouté

- **Parcours complet E2E** de la définition de « terminé » dans un espace neuf : inscription,
  accueil, invitation, client, devis envoyé, facture émise, paiement, tableau de bord,
  question à l'assistant.
- **Audit d'accessibilité automatisé** (axe, WCAG 2.1 A/AA) sur les écrans principaux,
  exécuté à chaque intégration.
- **Images Docker de production** (`Dockerfile` : web, worker, migrate) et
  `docker-compose.prod.yml` (PostgreSQL, Redis, migrations, application, worker).

### Corrigé

- Contraste insuffisant des pastilles de statut colorées (nouvelles teintes de texte AA).
- Structure ARIA du tableau : en-tête de sélection et ligne « Chargement… » annoncés
  correctement ; les vues enregistrées deviennent un groupe de boutons (et non des onglets).
- Les écrans de l'application ne sont plus pré-rendus à la construction (la construction
  échouait sans secrets de production).

## [0.10.0] — 2026-09-28 — Phase 10 : application de bureau

### Ajouté

- Application **Tauri 2** (`apps/desktop`) pour Windows, macOS et Linux, qui embarque
  l'application hébergée : barre de titre intégrée, taille et position mémorisées,
  multi-fenêtres (« Ouvrir dans une nouvelle fenêtre » sur les fiches et documents), icône
  dans la zone de notification avec badge des notifications non lues, notifications du
  système, lancement au démarrage (optionnel), menu natif avec zoom, raccourci global
  Ctrl+Maj+Espace, une seule instance, mises à jour automatiques signées.
- **Impression native** des devis et factures (bouton « Imprimer », aussi dans le navigateur).
- **Mode hors ligne partiel** (navigateur et bureau) : écrans et données déjà consultés
  lisibles hors ligne (service worker), créations mises en file d'attente puis envoyées au
  retour de la connexion (refus signalés), caches effacés à la déconnexion.
- Installeurs par la CI (`desktop-v*` : .msi/.exe, .dmg universel, .AppImage/.deb) avec
  fichiers de mise à jour ; compilation Rust et Clippy contrôlées à chaque intégration.
- Documentation `docs/DESKTOP.md`.

## [0.9.0] — 2026-09-28 — Phase 9 : automatisations et intégrations

### Ajouté

- **Éditeur d'automatisations** « Quand… Si… Alors… » : création, modification ou mise en
  corbeille d'une fiche de n'importe quel module, conditions avec le constructeur de filtres,
  actions notifier, modifier un champ, envoyer un email (variables `{{titre}}`, `{{lien}}`,
  `{{champ}}`) et créer une tâche ; enchaînements limités, compteur d'exécutions, dernière
  erreur, activation en un clic.
- **API REST publique** `/api/v1/<ressource>` (lister, filtrer, trier, lire, créer, modifier,
  mettre à la corbeille) pour toutes les entités, clés d'API en lecture seule ou en écriture
  (empreinte seule conservée, révocation), 600 requêtes par minute, droits de la personne qui
  a créé la clé.
- **OpenAPI 3.1** généré depuis le registre : `/api/v1/openapi.json`.
- **Webhooks sortants** signés (HMAC SHA-256, en-tête `X-Quercy-Signature`), livrés par le
  worker avec 5 tentatives, historique des livraisons, test en un clic.
- **Connecteur agenda** : abonnement iCalendar (Google Agenda, Outlook, Apple Calendrier).
- Écrans **Automatisations** et **Intégrations** ; tests d'intégration, du worker et E2E.

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
