# Prompt maître — Plateforme SaaS métier (premier vertical : propreté)

> **Version 2.** Elle fusionne la feuille de route du propriétaire (26 points), l'analyse du fichier
> Excel « Pilotage automatique V12 » et les demandes faites oralement. À donner tel quel à l'assistant
> qui développe le dépôt `safoloumami-bot/Quercy-propret-`.
> Chaque bloc se termine par des **critères de réussite** : il n'est terminé que s'ils sont tous vérifiés.

---

## 0. Objectif et décisions déjà prises

**Objectif.** Il ne s'agit pas seulement d'un logiciel interne pour Quercy Propreté. Quercy est le premier
terrain réel d'une **plateforme SaaS métier**, construite comme un **CORE générique plus des modules métiers**.
Demain, un logiciel pour la sécurité, l'immobilier ou la maintenance doit réutiliser tel quel : clients,
sites, utilisateurs, équipes, planning, interventions, documents, matériel, stocks, finances, rapports et
notifications. Il n'ajoutera que son propre module (`security.*`, `real_estate.*`…). **Priorité : une
architecture propre, robuste et évolutive avant d'empiler les fonctionnalités.**

L'Excel V12 est un **prototype métier**, pas un modèle d'écrans : on reprend sa logique, pas sa présentation.

**Décisions prises (ne pas rouvrir) :**

- **Technique.** On garde l'existant : Next.js, React, TypeScript, PostgreSQL (hébergé chez Neon), Prisma,
  tRPC, la connexion actuelle et le stockage Netlify Blobs. **Pas de migration vers Supabase**, mais on
  apporte ce que la feuille de route attendait de Supabase :
  - **RLS PostgreSQL activée** sur toutes les tables métier ;
  - **clés étrangères composites** qui empêchent une donnée de l'entreprise A de pointer vers une
    donnée de l'entreprise B ;
  - **tests d'isolation** entre deux entreprises.
- **Hébergement.** Netlify. Les migrations s'appliquent automatiquement à chaque déploiement, et les
  tâches quotidiennes passent par une fonction planifiée.
- **Application terrain.** On repart de celle des agents (https://inspiring-cuchufli-4df11b.netlify.app/,
  la version la plus récente, avec ses alertes toutes les 10 minutes), déjà reliée au logiciel
  (`apps/terrain`, `/terrain/<entreprise>`). On complète ses écrans, on ne les refait pas.
- **Données réelles.** Le dépôt Git est **public** : aucune donnée réelle de client n'y entre (ni l'Excel
  V12, ni noms, adresses ou téléphones). L'import se fait depuis l'application, par l'envoi du fichier.

## 1. Règles transverses

1. **Multi-entreprise strict.** Toute donnée métier porte `organizationId`. La base elle-même (RLS et
   clés composites), et pas seulement le code, empêche les fuites et les références croisées.
2. **Rôles** : owner, admin, manager, worker, viewer (correspondance avec les rôles actuels à faire).
   - Owner et admin : tout.
   - Manager : planning, clients, sites, contrats, équipes, rapports.
   - Worker : son planning et ses missions ; il démarre et termine, ajoute photos et anomalies.
   - Viewer : lecture seule sur son périmètre.
   - **Un worker ne supprime jamais un client, un site ni un contrat.**
3. **Rien ne disparaît.** Un site ou un contrat qui s'arrête est **archivé**. Aucune suppression en
   cascade des interventions, preuves, photos, anomalies, rapports ni de l'historique. On doit retrouver
   des années plus tard ce qui s'est passé sur un site.
4. **Fuseau Europe/Paris** (réglable par entreprise). Les horodatages techniques sont en UTC, mais les
   jours métier se calculent dans le fuseau de l'entreprise, jamais par un `toISOString()` naïf.
5. **Convertible.** Nom, logo, couleurs, modèles de fiches, barèmes, jours fériés et textes sont réglés
   par entreprise. Une nouvelle entreprise cliente s'installe sans toucher au code.
6. **Chacun ne voit que ce qui le concerne.** L'agent n'a jamais l'interface de gestion. Le client ne
   reçoit jamais une anomalie interne.
7. **RGPD.** Minimisation, droits d'accès, archivage, anonymisation possible plus tard (clients
   particuliers).
8. **Chaque lot est livré avec** : migration, tests automatiques, données de démonstration **fictives**,
   et une notice de deux paragraphes pour un utilisateur non technicien.

## 2. Modèle de données (CORE + module Propreté)

**CORE** : entreprises, utilisateurs, rôles et permissions, clients, contacts, sites, contrats,
prestations, intervenants (salariés et sous-traitants), équipes, planning, interventions, événements,
documents, photos et preuves, anomalies, historique, notifications, matériel, produits, fournisseurs,
stocks, achats, chiffrages, données financières.

**Module Propreté** (il fait référence au CORE et ne le modifie jamais) : fiches mission, types de sols,
surfaces, produits recommandés ou interdits, matériel nécessaire, procédures, contrôles qualité, preuves
obligatoires, spécificités de copropriété, sanitaires, vitres, extérieurs…

**Chaîne contractuelle — la fréquence n'est jamais rangée dans le site :**

```
Client → Site → Contrat → Prestation contractuelle → Série de récurrence → Version de règle → Interventions générées
```

Exemple, résidence A, contrat d'entretien : escalier chaque lundi, hall chaque lundi, vitres le premier
lundi du mois. Quand une fréquence change, on crée une **nouvelle version** de la règle avec une date
d'effet. L'historique ancien n'est jamais modifié.

**Intervention :**

- intervenant **prévu**, **remplaçant** éventuel, intervenant **réel**. Exemple : l'agent A était prévu,
  il est absent, l'agent B le remplace et c'est B qui a exécuté l'intervention ; les trois informations
  sont conservées ;
- statuts : `scheduled`, `in_progress`, `completed`, `cancelled`, `rescheduled`, `access_impossible`,
  `missed`, `to_rework` ;
- date prévue d'origine (`original_planned_date`), début et fin réels, durées prévue et réelle,
  commentaires, notes terrain ;
- `slot_key` unique : une intervention n'est **jamais générée deux fois**.

**Journal d'événements** `intervention_events` (intervention, utilisateur, type, date et heure,
métadonnées). Exemple : 08:00 prévue → 08:04 démarrée → 08:42 photo → 08:45 anomalie → 08:51 terminée.
Il sert à l'audit, aux statistiques et plus tard à l'IA.

**Entités séparées (pas de JSON fourre-tout dans l'intervention) :**

- **Photos et preuves** : type, fichier, date, auteur, intervention, site.
- **Anomalies** : type, emplacement, commentaire, photo, statut, date, auteur du signalement,
  résolution. Types de départ : ampoule HS ou éclairage, encombrants, fuite ou eau, porte ou serrure,
  interphone, nuisibles, dégradation, salissure inhabituelle, autre.

**À reprendre dans l'existant** : l'application terrain range aujourd'hui son relevé (photos, journal,
contrôle) dans un champ JSON `intervention.fieldData`. Il faut le migrer vers ces entités sans rien
perdre, sans changer les écrans de l'application.

## 3. Moteur de récurrence (cœur du produit)

- Règles : chaque semaine (jours au choix), toutes les 2 ou 3 semaines, X fois par mois, « semaine 1 »,
  « semaines 1 et 3 », « semaines 2 et 4 », « 1er lundi du mois », « dernier vendredi », jours ouvrés,
  intervalle en jours, dates personnalisées. Ces règles couvrent tous les types de la V12 :
  hebdomadaire, mensuelle, toutes les 2 semaines, ponctuelle, personnalisée.
- **Versions** : la règle change à une date d'effet. Exemple : le dimanche ce mois-ci, le mardi à partir
  du mois prochain. Les passages réalisés ne bougent jamais.
- **Jours fériés** par pays ou zone. Choix par série : maintenir, reporter (veille ou lendemain),
  ignorer.
- **Fermetures du client** (vacances, travaux) : périodes sans passage.
- Un passage déplacé à la main garde sa date (`rescheduled`, avec sa date d'origine). La génération
  automatique ne l'écrase pas.
- Génération sur un horizon glissant (3 mois), idempotente grâce à `slot_key`, relancée chaque nuit et à
  chaque changement de version.
- Créneaux et heures de passage par site (« horaires / accès autorisés ») : alerte si l'agent arrive en
  dehors.

**Réussite :** une batterie de tests couvre chaque type de règle, les changements de version, les
jours fériés (25 décembre, lundi de Pâques), les fermetures, les reports manuels, et deux générations
successives qui ne créent aucun doublon.

## 4. Import de la V12

- Le fichier est envoyé depuis l'application, **jamais versionné dans Git**. On prévisualise, puis on
  confirme.
- Onglets à lire : Sites (registre maître, 52 colonnes), Intervenants, Tournées, Passages et Suivi
  interventions, Remplacements, Véhicules, Contrats ponctuels.
- **Les noms de sites viennent de la colonne « Nom du site ».** On ne remplace jamais le nom par la
  ville. Exemple : le site B01 est à Catus, pas à Cahors.
- **On ne déduit pas les règles de récurrence des dates de l'Excel** : certaines ont été modifiées à la
  main. Le logiciel **propose** une règle par site, à partir des colonnes Type récurrence, Passages par
  période, Jour(s), Semaine(s) du mois, Intervalle et Début de contrat. Le responsable **valide** la
  règle ; ensuite seulement, la série génère les interventions futures.
- Trois interventions réellement validées deviennent des interventions historiques `completed`, sans
  heures de début ou de fin inventées :
  - C01 le 30/09/2026 ;
  - C04 le 29/09/2026 ;
  - C05 le 30/09/2026.
  - L'intervenant réel est celui que donne la V12.
- Les « 0 » et « À compléter » de l'Excel deviennent des champs vides et une tâche « à compléter ».
  On n'invente rien.

**Réussite :** import de la V12 dans un espace de test. On obtient 15 sites avec leur bon nom et leur
bonne ville, 3 intervenants, 3 tournées et 3 interventions historiques, aucune intervention future
avant validation des règles, et un second import sans aucun doublon.

## 5. Clients, sites, vue d'ensemble et rapport syndic

- Hiérarchie **Client → Site → Sous-site**. Exemple : Foncia → résidences → cages d'escalier.
- **Fiche client « vue d'ensemble »** : sites, contrats, passages prévus et réalisés, anomalies (vue
  interne), contrôles, factures, CA et marge.
- **Fiche de site** (reprise des colonnes de la V12) :
  - accès et clés, eau, électricité, configuration, niveaux et zones ;
  - sols principal et secondaire, matières sensibles, vitrages, sanitaires, kitchenette, déchets,
    extérieurs ;
  - prestations particulières, produits et matériel spécifiques, consignes surfaces, zones exclues ;
  - sécurité, hauteur et risques, preuves obligatoires, anomalies à surveiller, consignes, contact,
    horaires autorisés.
  - Chaque information a une **visibilité** : tous les agents du site, un agent précis, ou chefs
    seulement.
- **Rapport syndic automatique** par client et par période, exporté en PDF :
  - en tête : passages prévus, réalisés, taux de réalisation, anomalies, sites concernés ;
  - puis le détail : résidence, date, prestation, intervenant, statut, preuve, observation, anomalie ;
  - puis une section anomalies : date, résidence, type, emplacement, commentaire, statut, photo.
  - Un seul rapport pour toutes les cages d'un syndic. Les anomalies non validées par le chef n'y
    figurent pas.

**Réussite :** un syndic fictif avec 20 cages donne un rapport PDF unique et juste, et un agent affecté
à la cage A ne voit rien de la cage B.

## 6. Fiches mission (très important)

- **Bibliothèque de tâches à cocher** aussi complète que possible, par zone : bureaux, ateliers,
  cuisine, WC et sanitaires, vestiaires, escaliers et cages, halls, ascenseurs, parkings, vitres,
  locaux poubelles, extérieurs, salles de réunion, chambres, remise en état.
  - Pour chaque tâche : fréquence, caractère critique ou non, photo obligatoire ou non.
- **Fiche mission par site et par prestation.** Seules les tâches dues ce jour-là s'affichent. Elle
  reprend aussi l'adresse, les accès, la durée, les produits, le matériel, la procédure et les consignes
  (comme la « Fiche mission » de la V12, avec la méthode standard « du haut vers le bas »).
- **Modifiable après envoi.** Le chef corrige une fiche déjà envoyée et l'agent reçoit la nouvelle
  version. Après clôture, le relevé reste corrigeable par le chef, avec l'historique des versions.
- **Feuille de passage** nominative par site (date, heure, statut, intervenant réel, conformité,
  observation), imprimable.
- Import et export Excel des tâches.

## 7. Planning, agenda, tournées

- Agenda de la semaine (du lundi au samedi) et planning individuel.
- **Conflits** : un même agent prévu sur deux sites à la même heure déclenche une alerte, **non
  bloquante** (certains horaires sont indicatifs).
- **Tournées** : nom, zone, agent principal, remplaçant, véhicule, jour habituel, heures de départ et de
  fin, ordre des sites, point de départ, temps et distance de trajet, active ou non. L'optimisation des
  tournées viendra plus tard.
- Dans l'application, l'écran **Accueil** (résumé, alertes, absences) est séparé de l'écran **Tournée**.

## 8. Intervenants, sous-traitants, absences, remplacements

- Dans les intervenants : statut (salarié, sous-traitant, dirigeant), activités, zone, coût horaire,
  **remplaçants n°1 et n°2**, véhicule habituel, autorisation de conduire les véhicules de
  l'entreprise. Pour les sous-traitants : SIRET, attestations (URSSAF, assurance) avec date
  d'expiration et alerte.
- **Absences**, congés et indisponibilités, demandés depuis l'application et validés par le chef.
- Pour une absence, le logiciel **liste les interventions touchées** et propose dans l'ordre : le
  remplaçant n°1, le n°2, un autre agent qualifié, puis le sous-traitant. Le chef confirme. Le
  remplaçant reçoit la fiche du site et les accès nécessaires, et seulement eux.

## 9. Anomalies, contrôle qualité, accès et QR code

- **Anomalies automatiques** :
  - passage non pointé, hors créneau, durée anormale ;
  - point critique non fait, preuve obligatoire manquante, matériel en panne, stock bas ;
  - c'est la fonction « alertes » de l'application de référence, toutes les 10 minutes.
- **Circuit des anomalies** : signalée par l'agent ou par le système, elle part au patron et au chef,
  jamais au client. Le chef **valide**, rejette ou corrige. Seule une anomalie validée peut figurer dans
  un rapport client.
- **Contrôle qualité** par le chef : note par zone, photos, et qui est responsable de chaque zone. Un
  contrôle non conforme crée une anomalie et peut planifier une repasse (`to_rework`).
- **Registre des accès** : clés, badges, codes, qui les a en main et l'historique de remise.
- **QR code par site ou par cage**, imprimable. Scanné avec l'application, il ouvre la fiche du jour
  (filtrée selon la personne) et pointe l'arrivée. Scanné sans compte, il ne montre rien de sensible.

## 10. Matériel, véhicules, produits, stocks

- **Matériel** :
  - catalogue : catégorie, marque, modèle, numéro de série, prix d'achat, fournisseur, date d'achat ;
  - états : en stock, affecté à un salarié, affecté à un site, réservé, loué, en maintenance, en
    réparation, vendu, réformé ;
  - **historique des mouvements** (dépôt → agent → chantier → maintenance → dépôt) ;
  - matériel loué ponctuellement pour un chantier, avec son loyer.
- **Véhicules** : immatriculation, modèle, type, affectation, kilométrage, énergie, entretien,
  contrôle technique, **loyer ou crédit-bail**, état des lieux et pannes depuis l'application.
- **Produits** : catalogue (catégorie, fournisseur, unité, coût, prix de vente) et stock par dépôt,
  véhicule, salarié ou site, avec seuil de réassort. Un produit s'attribue à une mission récurrente ou
  à un chantier, et on note la **consommation réelle**.
  - Fournisseurs : tarifs, commandes, réception, historique.
- **Vente et location** d'articles : prix par jour, semaine ou mois, caution, sortie, retour,
  disponibilité, facturation.

## 11. Chiffrage, devis, contrats

- Saisie : nombre de personnes, heures, coût horaire réel, kilomètres, coût au km, temps de
  déplacement, produits, matériel, location, sous-traitance, autres coûts, marge souhaitée.
- Calcul : coût de revient, prix HT minimum, prix HT conseillé, marge en € et en %.
  - **Prix de vente = coût total / (1 − taux de marge cible).**
  - Exemple de test : coût 190 €, marge 32 % → **279,41 € HT**.
- **Validation par le chef** avant envoi. Sous une marge minimale réglable, il faut aussi la
  validation du patron.
- Le chiffrage devient un **devis**, puis un **contrat ponctuel** ou un **contrat récurrent**, sans
  rien ressaisir. Un contrat ponctuel peut devenir récurrent.
- Contrat à l'année : début, fin, reconduction tacite, révision annuelle des prix.
- **Facturation récurrente** depuis les passages réalisés : une facture par client, avec le détail
  par site ou par cage, les passages manqués déduits et les extras ajoutés après validation.

## 12. Pilotage financier

- Un vrai tableau de bord moderne, qui ne recopie pas l'Excel :
  - CA récurrent, ponctuel, total et facturé ;
  - coûts directs : salariés, sous-traitants, produits, déplacements, matériel, autres ;
  - marge contributive en € et en %, trésorerie.
- Filtres : période, client, site, type de prestation, organisation.
- Graphiques : évolution du CA et de la marge, récurrent contre ponctuel, structure des coûts, CA par
  activité et par client, marge par client et par site.
- **Les contrats peu rentables sautent aux yeux.**
- Plus tard : banque via Open Banking, par un prestataire agréé. Les identifiants bancaires ne sont
  jamais stockés. L'architecture doit le permettre dès maintenant, sans le construire.

## 13. Application terrain (agent)

- L'agent voit : Aujourd'hui → Site A → Site B → Site C.
- Il ouvre une mission : adresse, accès, durée, produits, matériel, procédure, consignes.
- Bouton **Démarrer**, puis tâches, photos, anomalie éventuelle, puis **Terminer l'intervention**.
- Signature du client et bon d'intervention : déjà en place.
- **Hors réseau** : consultation de la mission et saisie temporaire, synchronisées ensuite (déjà
  amorcé dans l'application actuelle). L'architecture ne doit pas bloquer une PWA complète.
- Dans l'application aussi : demande d'absence, véhicule et matériel (état des lieux, panne).

---

## Ordre de réalisation

| Lot | Contenu                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Schéma CORE (contrats, prestations, séries, versions, interventions enrichies, événements, photos, anomalies) · RLS et rôles · tests d'isolation |
| 2   | Moteur de récurrence et ses tests · import V12 (prévisualisation, validation des règles)                                                         |
| 3   | Clients et sites (hiérarchie, fiche de site, visibilité) · agenda, planning, conflits                                                            |
| 4   | Application terrain sur le nouveau modèle (migration de `fieldData`) · photos, preuves, anomalies et leur circuit                                |
| 5   | Rapport syndic PDF · fiches mission et feuille de passage                                                                                        |
| 6   | Intervenants, sous-traitants, absences, remplacements · tournées                                                                                 |
| 7   | Matériel, véhicules, produits, stocks, location                                                                                                  |
| 8   | Chiffrage → devis → contrat · facturation récurrente                                                                                             |
| 9   | Tableau de bord financier · finitions hors ligne et PWA                                                                                          |
| 10  | Plus tard : WhatsApp, Tiime, banque                                                                                                              |

Après chaque lot : tests verts, mise en ligne, et une phrase au propriétaire pour lui dire quoi essayer.

## Encore à fournir par le propriétaire

- Le code source de l'application de référence (inspiring-cuchufli), s'il n'est pas récupérable
  depuis Netlify.
- Les tarifs habituels : taux horaire, marge minimale, prix de location.
- La liste complète des tâches à cocher par zone, si elle existe ailleurs que dans la V12.
