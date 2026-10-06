# Prompt maître — Logiciel de propreté « convertible » + application terrain

> À donner tel quel à l'assistant qui développe le logiciel (dépôt `safoloumami-bot/Quercy-propret-`).
> Chaque bloc se termine par des **critères de réussite** : un bloc n'est terminé que s'ils sont tous vérifiés.

---

## 0. Contexte et règles du jeu

**Ce qui existe déjà :**

- **Le logiciel** : un SaaS multi-entreprise (Next.js, tRPC, Prisma, PostgreSQL Neon), hébergé sur Netlify.
  Modules : CRM, ventes et factures, achats, stock, salariés, congés, planning, module Nettoyage
  (sites, contrats, interventions, contrôles qualité, heures et paie). Il y a aussi un assistant IA et un export FEC.
- **L'application terrain** (`apps/terrain`, servie à `/terrain/<entreprise>`). C'est elle que les agents
  utilisent sur téléphone : tournée, pointage, contrôle pièce par pièce, photos, signature, bon PDF,
  fonctionnement hors réseau. Elle est déjà reliée aux interventions du logiciel.
- **L'application de référence** : https://inspiring-cuchufli-4df11b.netlify.app/. C'est la version la plus
  récente de l'application terrain, avec une fonction « alertes » qui tourne toutes les 10 minutes.
  **Repartir de cette version** : récupérer son code source (déploiement par glisser-déposer, absent de
  GitHub ; le demander au propriétaire s'il n'est pas accessible). Ses écrans et son fonctionnement
  sont la référence : on ne refait pas l'interface, on la complète.

**Règles :**

1. **Ne rien casser.** Travailler dans un dossier ou une branche séparés. Les applications en ligne
   continuent de tourner tant que la nouvelle n'est pas validée.
2. **Convertible / vendable en SaaS.** Rien n'est écrit en dur pour Quercy Propreté : nom, logo,
   couleurs, ville, modèles de fiches, tarifs, jours fériés, textes des mails viennent des réglages de
   chaque entreprise. Une nouvelle entreprise cliente s'installe sans toucher au code.
3. **Deux écrans distincts dans l'application** : **Accueil** (résumé du jour, alertes, absences,
   messages) et **Tournée** (la liste ordonnée des passages). Le responsable a ses écrans à lui.
4. **Chacun ne voit que ce qui le concerne.** Un agent ne voit que ses missions, ses sites, ses
   véhicules et son matériel. Le chef voit son équipe. Le patron voit tout. Le client ne reçoit jamais
   une anomalie interne.
5. **Le plus de choix possible, toujours modifiable.** Listes à cocher riches, modèles personnalisables,
   et tout reste corrigeable après envoi, avec une trace de qui a modifié quoi.
6. **Français, simple, mobile d'abord, hors réseau.** Tout ce qui est saisi sur le terrain doit
   fonctionner sans réseau et repartir tout seul.
7. **Chaque bloc livré avec** : migration de base, tests automatiques, données de démonstration,
   et une notice de deux paragraphes pour un utilisateur non technicien.

---

## 1. Clients, sites et vue d'ensemble (ex. Foncia et ses 20 cages)

- Hiérarchie **Client → Site → Sous-site**. Exemple : Foncia → Résidence Les Tilleuls → Cage A, Cage B…
  Un syndic peut avoir des dizaines de résidences et de cages.
- **Fiche client « vue d'ensemble »** : tous ses sites et sous-sites, contrats en cours, passages
  prévus et réalisés, contrôles qualité, anomalies (vue interne), factures, chiffre d'affaires et marge.
- **Rapport client unique** : un seul rapport mensuel par client, regroupant ses 20 cages (passages
  faits, manqués, note qualité par cage, photos choisies). Il s'exporte en PDF et s'envoie au client
  **sans les anomalies internes**.
- **Fiche de site** : adresse, plan d'accès, codes, clés (qui les détient), consignes, horaires
  autorisés, produits interdits, contacts, photos de référence.
  - Chaque information porte une **visibilité** : tous les agents du site, un agent précis, ou chefs
    seulement.
  - L'agent ne voit que ce qui lui est destiné.

**Réussite :** créer Foncia avec 3 résidences et 20 cages. La fiche client montre tout en un écran,
le rapport PDF unique regroupe les 20 cages, et un agent affecté à la cage A ne voit pas la cage B.

## 2. Contrats ponctuels, puis récurrents, à l'année

- **Contrat ponctuel** (un chantier, une remise en état) → bouton **« Transformer en contrat
  récurrent »**. Client, site, fiche mission et tarif sont repris.
- **Contrat à l'année** : date de début, de fin et reconduction tacite, révision de prix annuelle
  (indice ou pourcentage), forfait mensuel ou prix au passage.
- **Récurrence intelligente** :
  - Règles proposées : chaque semaine (jours au choix), toutes les 2 ou 3 semaines, « le 1er lundi
    du mois », « le dernier vendredi », chaque jour ouvré, X fois par mois, dates précises.
  - **Les règles changent dans le temps**. Exemple : le rendez-vous est le dimanche ce mois-ci, puis
    le mardi à partir du mois prochain. On crée une nouvelle version de la règle, avec sa date d'effet.
    Les passages déjà réalisés ne bougent jamais.
  - **Jours fériés** (calendrier français, réglable par entreprise et par pays). Choix par contrat :
    passer, avancer à la veille, reporter au lendemain, ou maintenir (heures majorées).
  - **Fermetures du client** (vacances scolaires, congés annuels, travaux) : périodes sans passage.
  - Un passage déplacé à la main reste déplacé : il n'est pas écrasé par la génération automatique.
  - Planning généré sur 3 mois glissants, recalculé à chaque modification du contrat.
- **Heures de passage** : créneau autorisé par site (ex. 6 h–8 h avant ouverture), heure prévue,
  durée. Alerte si l'agent arrive en dehors du créneau.

**Réussite :** un contrat « dimanche » qui passe au « mardi » le 1er du mois suivant génère les bonnes
dates. Le 25 décembre est traité selon le choix du contrat. Une fermeture de 2 semaines retire les passages.

## 3. Fiches mission (très important)

- **Bibliothèque de tâches à cocher**, rangées par zone et aussi complète que possible :
  - zones : bureaux, ateliers, cuisine, WC et sanitaires, vestiaires, escaliers et cages, halls,
    ascenseurs, parkings, vitres, locaux poubelles, extérieurs, salles de réunion, chambres,
    remise en état ;
  - chaque tâche a une fréquence (chaque passage, hebdomadaire, mensuelle, trimestrielle…), un
    caractère critique ou non, et accepte une photo obligatoire ou facultative.
- **Import Excel** : reprendre les tâches récurrentes depuis le fichier Excel du propriétaire (à fournir ;
  colonnes zone / tâche / fréquence). Chaque fiche mission peut aussi s'exporter en Excel.
- **Fiche mission par site** : composée à partir de la bibliothèque. Le jour venu, seules les tâches
  dues à cette date s'affichent (la tâche mensuelle n'apparaît qu'une fois par mois).
- **Modifiable après envoi** :
  - le chef corrige une fiche déjà envoyée à l'agent, et l'agent reçoit la nouvelle version ;
  - après clôture, le chef peut encore corriger le relevé ; l'historique des versions est gardé.
- Modèles réutilisables d'une entreprise à l'autre (convertible).

**Réussite :** importer un Excel de 80 tâches, composer une fiche pour une cage d'escalier, voir les
tâches mensuelles le bon jour seulement, modifier la fiche alors que l'agent est sur place : il voit la
mise à jour.

## 4. Anomalies (jamais envoyées automatiquement au client)

- **Détection automatique** :
  - arrivée hors créneau, passage non pointé, durée anormale (trop courte ou trop longue) ;
  - point critique non fait, photo obligatoire manquante, matériel signalé en panne, stock
    de consommables bas.
  - Reprendre la fonction « alertes » de l'application de référence (contrôle toutes les 10 minutes).
- **L'agent peut signaler** une anomalie (texte, photo, gravité).
- **Circuit** : l'anomalie part **au patron et au chef**, jamais au client. Le chef la **valide** (elle
  devient un fait interne, ou une information à transmettre), la **rejette** ou la **corrige**. Seul un
  humain peut décider d'en parler au client, par un envoi manuel.
- Notifications : dans le logiciel, par mail et dans l'application.

**Réussite :** un passage manqué crée une anomalie chez le patron en moins de 10 minutes, aucun mail
ne part vers le client, et le chef peut la valider ou la rejeter.

## 5. Contrôle qualité

- Contrôles faits par le chef sur la fiche mission du site : note par zone, photos, signature.
- **Qui est affecté à quoi** : chaque contrôle montre l'agent responsable de chaque zone ou tâche, et
  qui détient les accès (clés, badges, codes).
- Un contrôle non conforme crée automatiquement une anomalie interne (voir bloc 4) et, si on le
  choisit, une repasse planifiée.
- Notes par site, par agent et par client, avec leur évolution sur 12 mois.
- **Facturation liée** : une repasse ou une prestation supplémentaire constatée lors d'un contrôle
  peut s'ajouter à la prochaine facture.

## 6. Accès, clés et QR code de site

- **Registre des accès** : clés, badges, bips, codes. Pour chacun : quel site, qui l'a en main,
  depuis quand, et l'historique de remise et de retour.
- **QR code par site (et par cage), qui dit tout** : collé sur place, scanné avec l'application.
  - Il ouvre la fiche du site (filtrée selon la personne) et la fiche mission du jour.
  - Il pointe l'arrivée et prouve la présence de l'agent.
  - Un QR scanné par quelqu'un sans compte ne montre rien de sensible.
- Le QR imprimable (étiquette PDF) se génère depuis la fiche du site.

## 7. Personnel, sous-traitants, absences et remplaçants

- Dans **Salariés**, ajouter le type **Sous-traitant** (entreprise, SIRET, assurance et attestation
  URSSAF avec date d'expiration et alerte, tarif horaire ou au passage).
- **Demande d'absence depuis l'application** (congé, maladie avec justificatif en photo, absence
  imprévue), validée par le chef.
- **Remplaçant attitré** pour chaque agent, sur chaque site.
- **Remplacement automatique** quand une absence est validée :
  1. le remplaçant attitré, s'il est libre ;
  2. sinon un autre agent qualifié pour le site ;
  3. sinon le sous-traitant prévu pour ce site.
  - Le remplaçant reçoit la fiche du site et la fiche mission, avec les accès nécessaires et seulement eux.
  - Le chef voit et peut modifier chaque proposition avant envoi.
- Les heures du remplaçant et du sous-traitant sont comptées pour la paie et pour la facture du
  sous-traitant.

**Réussite :** Sandrine déclare une absence pour demain, le chef valide. Karim (son remplaçant) voit
les 3 passages de Sandrine dans sa tournée, avec les codes. Si Karim est lui-même absent, le
sous-traitant est proposé.

## 8. Tournées

- La tournée du jour est ordonnée : heures de passage, temps de trajet entre sites, itinéraire et
  carte. La liste peut être réordonnée à la main.
- L'écran Tournée est séparé de l'écran Accueil.
- Le responsable voit toutes les tournées de la journée (carte et liste) et les retards en direct.

## 9. Chiffrage des chantiers, validation et marge

- **Devis chiffré** : surface, tâches et fréquences, temps estimé par tâche (barèmes réglables),
  taux horaire chargé, produits, matériel, déplacement, sous-traitance. Le prix est proposé avec la
  **marge** visible (en € et en %).
- **Validation par le chef** avant envoi au client. Un seuil de marge minimale est réglable : en
  dessous, la validation du patron devient obligatoire.
- **Suivi réel** : heures pointées, consommables posés et matériel utilisé donnent la **marge réelle**
  par chantier, par site, par client et par mois. Les écarts entre prévu et réel sont signalés.
- Un devis accepté devient un contrat ponctuel ou récurrent en un clic (voir bloc 2).

## 10. Véhicules et matériel (aussi dans l'application)

- **Véhicules** : immatriculation, affectation (agent ou équipe), kilométrage, carburant, entretien,
  contrôle technique et assurance avec alertes d'échéance, **loyer ou crédit-bail**, coût mensuel
  intégré à la marge.
- **Matériel** : autolaveuses, aspirateurs, monobrosses… Pour chacun : numéro, site ou agent
  affecté, état, entretien, **loyer de location** s'il est loué, coût réparti sur les chantiers.
- **Dans l'application** : l'agent voit son véhicule et son matériel, fait un état des lieux
  (photos, kilométrage) et signale une panne, ce qui crée une anomalie (bloc 4).

## 11. Vente et location d'articles

- Le catalogue gère la **vente** (déjà en place) et la **location** : prix par jour, semaine ou mois,
  caution, dates de sortie et de retour, état au retour, disponibilité (un article loué n'est pas
  disponible).
- Location facturée automatiquement, chaque mois ou à la fin de la location.

## 12. Facturation

- **Facturation récurrente des contrats**, mensuelle ou au passage réalisé : les passages manqués
  sont déduits, les passages supplémentaires ajoutés, la révision annuelle est appliquée.
- Une facture par client, avec le détail par site ou par cage (Foncia : une facture, 20 lignes),
  ou une facture par site, au choix du client.
- Les prestations constatées sur le terrain (repasse, extra, consommables facturables) sont
  proposées sur la facture suivante, après validation.

## 13. Vendable en SaaS

- Inscription d'une nouvelle entreprise, essai, abonnement (déjà en place), modules activables.
- Tout ce qui précède se règle par entreprise : modèles de fiches, barèmes, jours fériés, textes,
  marque de l'application terrain.
- Démo complète d'une entreprise de propreté fictive, prête à montrer à un prospect.

---

## Ordre de réalisation conseillé

1. Clients, sites et sous-sites, fiches de site avec visibilité (bloc 1).
2. Fiches mission et import Excel (bloc 3).
3. Contrats ponctuels et récurrents, récurrence intelligente, heures de passage (bloc 2).
4. Personnel, sous-traitants, absences, remplaçants (bloc 7).
5. Anomalies et contrôle qualité (blocs 4 et 5).
6. Accès et QR code (bloc 6), tournées (bloc 8).
7. Chiffrage et marge (bloc 9), facturation (bloc 12).
8. Véhicules, matériel, location (blocs 10 et 11).
9. Rapport client unique (bloc 1) et finitions SaaS (bloc 13).

Après chaque étape : tests verts, mise en ligne, et une phrase au propriétaire pour lui dire quoi
essayer.

## À fournir par le propriétaire

- Le **fichier Excel** des tâches récurrentes.
- Le **code source** de l'application de référence (inspiring-cuchufli), s'il n'est pas récupérable
  depuis Netlify.
- Les tarifs habituels : taux horaire, marge minimale, prix de location.
