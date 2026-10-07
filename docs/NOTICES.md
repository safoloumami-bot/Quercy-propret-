# Notices — ce qui change pour vous

Une notice courte par lot, pour un utilisateur non technicien.

## Lot 7 — Matériel, véhicules, stock et location

Dans le menu **Matériel & véhicules**, chaque machine a sa fiche : où elle est (au dépôt,
chez un salarié, sur un chantier), son état (en réparation, louée…) et l'historique de tous
ses déplacements. Chaque véhicule a son kilométrage et ses échéances (contrôle technique,
entretien, assurance) : vous êtes prévenu un mois avant. Sur le téléphone, l'agent fait
l'état des lieux de son véhicule (kilométrage, remarques, photo) et signale une panne en
deux gestes ; vous recevez l'alerte aussitôt.

Les **locations** de matériel se réservent sur un calendrier (un même matériel ne peut pas
être loué deux fois en même temps), puis « Sortie », « Retour » et « Facturer » préparent la
facture. Le **stock** se suit par emplacement (dépôt, véhicule, salarié) : une commande
fournisseur reçue fait entrer les articles, et les produits relevés par l'agent sur un
passage sortent du stock à la clôture. Une alerte arrive quand un article passe sous son
seuil.

## Lot 8 — Chiffrage, devis, contrats et facturation des passages

**Nettoyage › Chiffrages** : saisissez le nombre de personnes, les heures, les kilomètres,
les produits et la marge voulue ; le logiciel calcule tout de suite le coût de revient, le
prix minimum et le prix conseillé (coût ÷ (1 − marge)). Le chiffrage est validé par le chef,
et aussi par le patron si la marge est trop basse. Ensuite, un clic crée le devis, puis le
contrat (ponctuel ou à l'année), sans rien ressaisir ; le planning se remplit tout seul.

**Nettoyage › Facturation des passages** : en début de mois, choisissez le mois écoulé ; le
logiciel prépare une facture par client, avec le détail par site, les passages manqués
déduits et les suppléments que vous avez validés. Les factures sont créées en brouillon :
vous les relisez puis les émettez. Un passage déjà facturé ne peut pas l'être une seconde
fois. Les contrats à l'année se reconduisent et leurs prix se révisent tout seuls à la date
prévue.

## Lot 9 — Pilotage financier et application hors réseau

**Nettoyage › Pilotage financier** montre en un écran votre chiffre d'affaires (récurrent
et ponctuel), ce que vous avez facturé, vos coûts (salariés, sous-traitants, produits,
véhicules…), votre marge et votre trésorerie, sur la période et pour le client de votre
choix. Les contrats qui ne rapportent pas assez sont listés en rouge en haut de la page :
c'est là qu'il faut renégocier ou réorganiser. Pour des chiffres justes, renseignez le coût
horaire de chaque intervenant (Nettoyage › Intervenants).

Sur le téléphone, l'application s'ouvre maintenant sur un **écran d'accueil** : les passages
du jour, le prochain chantier, le véhicule et les absences. Elle fonctionne aussi **sans
réseau** : la tournée et les fiches du jour restent consultables dans un sous-sol ou à la
campagne, et tout ce que l'agent saisit part dès que le réseau revient.

## Application terrain v15

L'application des agents a pris l'écran de la **v15** : tournée, calendrier, demandes de
devis, équipe, clients, factures, pilotage, absences, réglages, avis clients, QR de pointage
et notifications du téléphone. Les ajouts déjà faits restent : absences demandées par
l'agent, véhicule et matériel, anomalies, fiche mission, consommables, hors réseau.

**Tout est relié au logiciel** : un chantier planifié sur le téléphone apparaît dans le
planning, une facture créée sur le téléphone est une vraie facture du logiciel (même
numérotation), les réglages de l'entreprise sont ceux de Ventes › Paramètres. Rien de ce que
fait l'application ne change le fonctionnement du logiciel.

**À faire une fois** : dans le site quercy-proprete.fr, remplacer l'adresse du bloc qui
envoie les demandes de devis (ligne `var APP`) par
`https://radiant-vacherin-c49bd4.netlify.app/terrain/quercy-proprete/api/demande`.
Pour les notifications : ouvrir l'application installée sur l'écran d'accueil, puis
Mon compte › Notifications.
