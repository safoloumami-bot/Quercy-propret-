# Application terrain

L'application de l'entreprise sur téléphone, **écran de la v15** : tournée et cockpit du
responsable, calendrier, demandes de devis, annonces, équipe, clients, factures, pilotage,
absences et remplacements, réglages, avis clients, QR de pointage, notifications, PDF (bon
d'intervention, facture, attestation fiscale). S'y ajoutent les blocs reliés au logiciel :
absences demandées par l'agent, véhicule et matériel, anomalies, fiche mission et
informations du site, consommables du stock. Elle fonctionne hors réseau.

L'écran est celui de la v15 ; **les données sont celles du logiciel** (même base). Les
fichiers de la v15 d'origine ne sont pas dans le dépôt.

## Où la trouver

Dans le logiciel : **Nettoyage › Application terrain** (lien et QR code). L'adresse est
`https://<site>/terrain/<espace>`, une par entreprise.

## Ce qui est relié

| Application terrain        | Logiciel                                                     |
| -------------------------- | ------------------------------------------------------------ |
| Chantier                   | Intervention (module Nettoyage), sur un site client          |
| Agent (identifiant + code) | Membre de l'espace (accès terrain)                           |
| Pointage arrivée / départ  | Arrivée, départ, temps travaillé, statut de l'intervention   |
| Observations, signature    | Compte rendu, signature et signataire de l'intervention      |
| Photos                     | Pièces jointes de l'intervention                             |
| Clôture                    | Bon n° BI-AAAA-NNNN, intervention réalisée, contrôle qualité |
| Bon envoyé au client       | E-mail du logiciel (Resend)                                  |
| Client, facture, devis     | Entreprise et document de vente (numérotation du logiciel)   |
| Réglages de l'entreprise   | Paramètres de vente (+ tarif, TVA, SAP, avis, alertes)       |
| Absence, remplacement      | Absence du logiciel, intervenant remplaçant                  |
| Demande de devis du site   | Demande (`QuoteRequest`), notifiée aux responsables          |
| Avis du client             | Avis (`ClientReview`) rattaché à l'intervention              |

Les interventions planifiées dans le logiciel (contrats d'entretien, planning) apparaissent
dans la tournée de l'agent à qui elles sont affectées.

## Convertible

Rien n'est propre à une entreprise : le nom, les initiales, l'icône de l'écran d'accueil, la
couleur (si l'entreprise en a choisi une, sinon le vert d'origine), la ville du pied de page
et l'en-tête du PDF viennent des réglages de l'espace (nom, couleur d'accent, paramètres de
vente). Le logo est celui de l'entreprise s'il est public ; Quercy Propreté garde ses logo
et icônes d'origine (`apps/web/public/terrain-quercy/`). Les grilles de contrôle s'adaptent
à la prestation : logement meublé, bureaux et locaux, parties communes, remise en état.

## Modifier l'écran

1. Modifier `public/index.html` (les repères `%%NOM%%`, `%%BASE%%`, `%%LOGO%%`… sont
   remplis par le logiciel ; la configuration est dans la variable `T` du script, et les
   adresses relatives partent de `<base href="%%BASE%%">`).
2. Lancer `pnpm terrain:generer` : la page est recopiée dans
   `apps/web/src/server/terrain/template.generated.ts` (un test vérifie qu'elle est à jour).

Le serveur est dans `apps/web/src/server/terrain/` (mêmes routes que le serveur d'origine).
