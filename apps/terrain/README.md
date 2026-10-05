# Application terrain

L'application des agents sur téléphone : tournée du jour, pointage (l'heure vient du
serveur), contrôle qualité pièce par pièce, photos avant / après, consommables, signature
du client et bon d'intervention en PDF. Elle fonctionne hors réseau et renvoie ses données
dès que la connexion revient.

C'est une copie de l'application d'origine (dépôt `relance`), **à l'écran inchangé**,
reliée au logiciel. L'application d'origine et son site Netlify ne sont pas touchés.

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

Les interventions planifiées dans le logiciel (contrats d'entretien, planning) apparaissent
dans la tournée de l'agent à qui elles sont affectées.

## Convertible

Rien n'est propre à une entreprise : le nom, les initiales, l'icône de l'écran d'accueil, la
couleur (si l'entreprise en a choisi une, sinon le vert d'origine), la ville du pied de page
et l'en-tête du PDF viennent des réglages de l'espace (nom, couleur d'accent, paramètres de
vente). Les grilles de contrôle s'adaptent à la prestation : logement meublé, bureaux,
parties communes, remise en état.

## Modifier l'écran

1. Modifier `public/index.html` (les repères `%%NOM%%`, `%%BASE%%`… sont remplis par le
   logiciel ; la configuration est dans la variable `T` du script).
2. Lancer `pnpm terrain:generer` : la page est recopiée dans
   `apps/web/src/server/terrain/template.generated.ts` (un test vérifie qu'elle est à jour).

Le serveur est dans `apps/web/src/server/terrain/` (mêmes routes que le serveur d'origine).
