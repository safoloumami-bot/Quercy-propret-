# Quercy Propreté — application terrain

Notice de mise en service. Aucune connaissance technique n'est nécessaire,
mais lisez les étapes dans l'ordre. Comptez vingt minutes.

---

## Nouveau dans la version 3

- **Le pilotage**, dès l'ouverture de l'onglet Tournée : qui est sur site, qui est
  en retard, ce qui attend une action (demandes, clôtures, factures), le chiffre du
  mois et la satisfaction des clients.
- **Les alertes automatiques** : retard d'arrivée, départ oublié, point du matin,
  rappel de la veille pour chaque agent, factures échues.
- **Les avis clients** : le client note l'intervention en dix secondes, depuis un lien
  ou le QR imprimé sur le bon ; à partir de 4 étoiles, on lui propose de publier son
  avis sur Google.
- **Des documents au niveau des meilleurs logiciels** (mise en page inspirée de Stripe
  et de Qonto) : bon d'intervention, facture avec QR de paiement et mentions 2026,
  attestation fiscale conforme. Bouton **Partager** : WhatsApp, SMS ou mail en un geste.
- **L'itinéraire de la journée** pour les agents, et la **prochaine intervention** en tête.
- **La recherche** (loupe en haut à droite, ou Ctrl K sur ordinateur).

---

## 1. Ce que fait cette application

Vos agents ouvrent un lien sur leur téléphone, se connectent avec un identifiant
et un code à 6 chiffres, et pour chaque chantier :

- ils pointent leur arrivée et leur départ — **l'heure est inscrite par le serveur**,
  pas par le téléphone, donc elle n'est pas modifiable ;
- ils cochent le contrôle qualité, pièce par pièce. Un point marqué « critique »
  non validé bloque la clôture tant qu'un motif écrit n'est pas saisi ;
- ils prennent des photos avant / après, rattachées à la pièce concernée ;
- ils comptent les consommables posés ;
- ils font signer le client sur l'écran ;
- ils clôturent. Le bon d'intervention est alors numéroté, envoyé au client par mail
  si vous avez configuré l'envoi, et téléchargeable en PDF : une page, vos coordonnées,
  les heures réelles face au prévu, le contrôle qualité pièce par pièce, les réserves,
  les consommables, les photos et les deux signatures.

**Sans réseau, tout continue de fonctionner.** Ce que l'agent saisit est gardé sur
son téléphone et repart tout seul dès que la connexion revient. Un pointage fait
hors réseau est accepté mais signalé comme tel dans le journal, pour rester honnête.

Vous, en tant que responsable, avez en plus un espace pour créer les comptes des
agents et planifier les chantiers.

**Rien ne se perd.** Ce que l'agent saisit sans réseau est gardé sur son téléphone,
photos comprises, et repart tout seul au retour de la connexion. Même déconnecté,
l'application s'ouvre et affiche la tournée du jour enregistrée sur l'appareil.

### Les onglets du bas

| Responsable | Agent |
|---|---|
| **Tournée** — la journée ; toucher la grande case ouvre le calendrier | **Tournée** |
| **Calendrier** — le mois, un point par intervention ; touchez un jour | **Calendrier** |
| **Demandes** — les devis reçus du site, avec pastille rouge | **Historique** — ses propres tâches |
| **Annonces** — les sites où trouver des clients | |
| **Équipe** — activité du mois, historique de chaque agent | |

Votre photo en haut à droite ouvre **Mon compte** : photo de profil,
**Apparence** (Clair, Sombre, Auto), **Notifications** et **Sauvegarde**.

Sur ordinateur, la barre du bas devient une barre latérale et les écrans
s'étalent sur deux colonnes. C'est la même application, à la même adresse.

---

## 2. Déposer l'application sur Netlify

### Méthode 1 — le glisser-déposer (la plus simple)

1. Décompressez le dossier `quercy-app` sur votre ordinateur.
2. Allez sur **app.netlify.com** et connectez-vous.
3. Cliquez sur **Add new site**, puis **Deploy manually**.
4. Faites glisser le dossier `quercy-app` **entier** dans la zone prévue.
5. Attendez la fin. Netlify vous donne une adresse du type
   `nom-au-hasard-123.netlify.app`.

### Méthode 2 — par GitHub (si la méthode 1 ne marche pas)

Si, en ouvrant le site, vous voyez un message d'erreur au lieu de l'écran de
connexion, c'est que la partie serveur n'a pas été installée. Dans ce cas :

1. Créez un compte gratuit sur **github.com**.
2. Créez un dépôt (*repository*) privé, puis déposez-y le contenu du dossier
   avec le bouton **Add file → Upload files**.
3. Sur Netlify : **Add new site → Import an existing project → GitHub**,
   choisissez le dépôt, laissez les réglages proposés, validez.

C'est la méthode que Netlify recommande, et elle a un avantage : à chaque
modification future, le site se met à jour tout seul.

---

## 3. Première ouverture

Il n'y a **rien à configurer**. Ouvrez l'adresse que Netlify vous a donnée.

L'application vous accueille avec l'écran **Première mise en service** :
indiquez votre prénom, choisissez un code à 6 chiffres, confirmez-le.
C'est tout. Vous êtes connecté.

Votre identifiant est désormais `patron`, et votre code celui que vous venez
de choisir. **Notez-le** : personne ne peut vous le redonner.

Faites cette étape tout de suite après le déploiement, tant que l'adresse du
site n'est connue que de vous : le premier qui ouvre l'application est celui
qui crée le compte responsable.

---

## 4. Prendre l'outil en main avec les exemples

Dans **Équipe → Gestion et réglages**, section **Données d'exemple**, le bouton
**Charger les exemples** crée trois agents et sept chantiers réalistes —
dont un entièrement déroulé, signé et clôturé, pour voir à quoi ressemble
le résultat. Vous pouvez vous connecter à leur place :

| Identifiant | Code |
|---|---|
| `sandrine` | 245780 |
| `karim` | 319642 |
| `lea` | 670183 |

Le bouton **Tout effacer** les retire sans toucher à vos vraies données.

---

## 5. Créer vos agents et vos chantiers

### Les agents

Onglet **Équipe → Gestion et réglages**, partie **Agents** :
prénom, identifiant (en minuscules, sans accent ni espace, par exemple `sandrine`),
et un code à 6 chiffres que vous lui communiquez.

Si un agent oublie son code, ressaisissez le même identifiant avec un nouveau code :
l'ancien est remplacé. Il n'y a volontairement pas de récupération automatique par
mail — c'est vous qui redonnez le code.

Chaque agent peut recevoir une **photo de profil** : bouton *Photo* sur sa ligne.
Elle apparaît ensuite sur les tournées et les fiches de chantier. Chacun peut
aussi changer la sienne depuis **Mon compte**.

### Les chantiers

Toujours dans Gestion et réglages, remplissez le formulaire **Nouveau chantier**.
Quatre **modèles de contrôle qualité** sont disponibles : logement meublé,
bureaux et locaux, remise en état, parties communes. Chacun a ses propres points,
dont les points critiques qui bloquent la clôture.

La **récurrence** crée d'un coup toute une série : chaque semaine, toutes les deux
semaines ou chaque mois, jusqu'à 26 fois.

L'adresse mail du client est facultative, mais c'est elle qui permet l'envoi
automatique du bon d'intervention à la fin.

### L'activité du mois

L'onglet **Équipe** donne le nombre d'interventions,
les heures prévues face aux heures réellement pointées, le chiffre d'affaires estimé,
et la répartition par agent. Touchez un agent : son historique s'affiche,
et chaque tâche s'ouvre sur sa fiche complète. C'est là que se lit la rentabilité : un agent
systématiquement au-dessus du temps prévu signale un chantier mal évalué.

---

## 6. L'espace Gestion

Onglet **Équipe → Gestion et réglages**. Sept entrées :

| Entrée | Ce qu'on y fait |
|---|---|
| **Planifier un chantier** | Créer une intervention, ou une série qui se répète |
| **Mon équipe** | Créer les agents, réinitialiser un code, changer une photo |
| **Carnet clients** | Historique par client, QR de pointage, attestation fiscale |
| **Devis et factures** | Facturer les interventions clôturées, suivre les règlements |
| **Absences et remplacements** | Confier d'un coup les chantiers d'un agent absent |
| **Réglages de l'entreprise** | Coordonnées, facturation, n° SAP, lien d'avis Google, alertes |
| **Sauvegarde** | Enregistrer toutes vos données sur l'appareil |

### Le QR de pointage

Dans une fiche client, **QR de pointage** crée une affichette à imprimer et à coller
sur place. L'agent la scanne avec l'appareil photo de son téléphone : l'application
s'ouvre et pointe l'arrivée, puis le départ au second passage. Le QR reste valable
pour toutes les interventions suivantes chez ce client.

### Les factures

**Devis et factures** liste les interventions clôturées qui ne sont sur aucune facture.
Cochez-les, le document est créé et numéroté (`FA-2026-0001`). Il porte les mentions
obligatoires, y compris celles ajoutées en 2026 : date de la prestation, catégorie de
l'opération (« Prestation de services ») et SIREN du client s'il s'agit d'une entreprise
— renseignez-le sur la fiche chantier, champ **SIREN du client**.

Si votre IBAN est saisi dans les réglages, la facture comporte un **QR de paiement** :
le client le scanne avec son appli bancaire, le virement se remplit tout seul
(montant, IBAN, référence). Le bouton **Partager** l'envoie par WhatsApp, SMS ou mail.
Le suivi distingue *à payer*, *payée* et *en retard*.

### L'attestation fiscale

Pour les clients particuliers, la fiche client produit l'attestation annuelle du
crédit d'impôt, conforme à l'article D7233-4 du Code du travail : votre numéro de
déclaration SAP, l'adresse du bénéficiaire, le **montant réellement payé** (les
factures réglées dans l'année), et pour chaque intervention la date, la durée et le
nom de l'intervenant. Saisissez votre numéro SAP dans **Réglages de l'entreprise**.
De janvier à mars, c'est l'attestation de l'année précédente qui est proposée ; elle
doit être remise avant le 31 mars.

### Les absences

Vous indiquez l'agent absent, son remplaçant et la période : toutes ses interventions
non terminées changent de main, et le remplaçant reçoit une notification.

### Modifier ou annuler

Sur une fiche d'intervention non clôturée, le responsable dispose de **Modifier**
(date, heure, agent, client, consignes) et **Annuler**. Une intervention annulée
sort de la tournée mais reste tracée.

### Les réserves reprises

Un point non conforme laissé en réserve chez un client réapparaît automatiquement
en haut de la fiche au passage suivant : « À reprendre du dernier passage ».

---

### La démonstration

**Gestion → Démonstration → Lancer la démonstration** met tout en scène d'un coup :
deux demandes arrivent du site — une notification part si vous les avez activées —,
l'une d'elles est planifiée, l'intervention est pointée, contrôlée point par point,
signée par la cliente avec une réserve, clôturée, et la facture en est tirée.

Une barre en bas de l'écran vous guide en huit étapes, du devis reçu jusqu'au
pilotage, en passant par le bon, l'avis cinq étoiles de la cliente et la facture.
**Effacer la démonstration** retire l'ensemble sans toucher à vos vraies données.

---

### Le pilotage

En ouvrant l'application le matin, l'onglet **Tournée** vous montre :

- la journée en direct : **sur site**, **à venir**, **en retard** (arrivée non pointée
  un quart d'heure après l'heure prévue), **faites** ;
- **À traiter** : les demandes de devis, les interventions à clôturer ou jamais
  pointées, les factures en retard et ce qui reste à facturer — chaque ligne mène
  directement où il faut agir ;
- le **chiffre du mois**, avec les six derniers mois en graphique (réalisé et encaissé)
  et la note moyenne de vos clients.

L'onglet **Équipe** reprend le graphique et les derniers avis clients.

### Les avis clients

Sur une intervention clôturée, **Demander un avis** envoie au client un lien (SMS,
WhatsApp, mail…). Le bon d'intervention porte aussi un **QR « Votre avis compte »**.
Le client note de 1 à 5 étoiles, sans compte ni mot de passe, et peut laisser un mot.
Vous êtes prévenu, et l'agent aussi quand l'avis est bon. Si vous avez collé votre
lien Google dans les réglages, les clients qui donnent 4 ou 5 étoiles se voient
proposer de publier leur avis sur Google : c'est la première source de demandes locales.

### La recherche

La loupe en haut à droite (ou **Ctrl K** sur ordinateur) retrouve en deux lettres un
client, une intervention, une facture, une demande ou un agent.

---

## 7. Les notifications

Dans **Mon compte → Notifications**, le bouton **Activer** demande l'autorisation
du téléphone. Ensuite, même application fermée :

| Le responsable reçoit | L'agent reçoit |
|---|---|
| chaque demande de devis venue du site | chaque intervention confiée ou réattribuée |
| un **retard** : arrivée non pointée 15 min après l'heure | un rappel s'il a oublié de pointer son arrivée |
| un **départ oublié** (sur place bien au-delà du prévu) | le **rappel de la veille**, dès 18 h : ses interventions du lendemain |
| le **point du matin** (7 h - 10 h) : interventions, demandes, impayés | un « Bravo » quand un client lui met 4 ou 5 étoiles |
| chaque **facture échue**, et chaque **avis client** | |

Ces alertes se règlent une à une dans **Réglages de l'entreprise → Alertes
automatiques**. Netlify les vérifie toutes les dix minutes, gratuitement ; elles sont
aussi vérifiées à chaque ouverture de l'application.

C'est gratuit et sans compte à créer. Deux conditions sur iPhone : l'application
doit être **installée sur l'écran d'accueil** (partie 8), et iOS doit être à jour
(iOS 16.4 ou plus récent). Le bouton **Tester** envoie une notification d'essai.

---

## 8. Les demandes de devis du site

Chaque demande envoyée depuis le formulaire de quercy-proprete.fr arrive dans
l'onglet **Demandes** : pastille rouge, badge sur l'icône de l'application, et
vibration si l'application est ouverte. Pour que ça marche, un petit bloc doit
être ajouté au site : voir le fichier **LIAISON-SITE.md**.

Dans une demande : **Appeler**, **Écrire**, puis **Planifier et attribuer** —
le formulaire de chantier s'ouvre déjà rempli (client, téléphone, mail, type de
contrôle qualité) ; il ne reste qu'à choisir l'agent, la date et l'adresse.
La demande passe alors en « Traitée », avec un lien vers le chantier.

Le bouton **Simuler une demande du site** en bas de l'onglet permet d'essayer
sans passer par le site.

Si vous avez configuré Brevo (partie 10), un mail vous prévient aussi, à
l'adresse de l'entreprise ou à celle de la variable `MAIL_PATRON`.

---

## 9. Installer l'application sur les téléphones

Ce n'est pas une application à télécharger sur un magasin, mais elle se comporte
exactement comme telle une fois installée.

- **iPhone :** ouvrir l'adresse dans **Safari** (obligatoirement Safari),
  bouton Partager, puis **Sur l'écran d'accueil**.
- **Android :** ouvrir l'adresse dans Chrome, menu à trois points,
  **Installer l'application** ou **Ajouter à l'écran d'accueil**.

L'icône verte apparaît sur l'écran d'accueil, l'application s'ouvre en plein écran,
sans barre de navigateur.

---

## 10. Envoyer le bon d'intervention au client (facultatif)

1. Créez un compte gratuit sur **brevo.com** (société française, 300 mails par jour
   offerts).
2. Dans Brevo : **SMTP & API → Générer une nouvelle clé API**. Copiez la clé.
3. Sur Netlify, ajoutez trois variables d'environnement supplémentaires :

| Nom | Valeur |
|---|---|
| `BREVO_API_KEY` | la clé copiée |
| `MAIL_FROM` | `contact@quercy-proprete.fr` |
| `MAIL_FROM_NOM` | `Quercy Propreté` |

Ces trois-là, contrairement au reste, demandent un redéploiement : onglet
**Deploys → Trigger deploy → Deploy site**.

Pour que vos mails n'arrivent pas en indésirable, Brevo vous demandera d'ajouter
quelques lignes dans la zone DNS de votre domaine chez OVH. Brevo fournit les
valeurs exactes à recopier ; c'est une manipulation de cinq minutes.

Sans cette configuration, tout fonctionne : simplement, le bon n'est pas envoyé
automatiquement et l'agent le remet en PDF.

---

## 11. Mettre votre nom de domaine

Si vous souhaitez une adresse du type `terrain.quercy-proprete.fr` plutôt que
l'adresse Netlify :

1. Sur Netlify : **Domain management → Add a domain**, saisissez
   `terrain.quercy-proprete.fr`.
2. Netlify affiche une valeur à recopier. Chez OVH, dans la **zone DNS** de votre
   domaine, ajoutez un enregistrement **CNAME** nommé `terrain` pointant vers
   l'adresse indiquée par Netlify.
3. Comptez une à deux heures. Le certificat de sécurité (le cadenas) est ajouté
   automatiquement et gratuitement.

---

## 12. Ce que vous devez savoir avant de le mettre entre les mains des agents

**C'est un outil de suivi du temps de travail.** À ce titre :

- vos salariés doivent être **informés** de son existence, de ce qu'il enregistre
  et de la durée de conservation des données ;
- les données de pointage doivent être conservées une durée limitée
  (l'usage courant est cinq ans pour les éléments liés à la paie) ;
- l'application **ne géolocalise pas** les agents, volontairement : la
  géolocalisation des salariés est très encadrée et demande des formalités
  supplémentaires ;
- le site de la CNIL (`cnil.fr`) détaille ces obligations. Si vous avez un
  comptable ou un conseil en droit social, parlez-lui-en avant le déploiement.

**Les sauvegardes.** Les données sont stockées chez Netlify. Le bouton
**Gestion → Sauvegarde** (ou **Mon compte → Sauvegarder mes données**) télécharge
l'ensemble — chantiers, bons, clients, factures — dans un fichier daté.
Prenez-en une par mois et rangez-la ailleurs que sur le téléphone.

**La facture électronique.** Depuis le 1er septembre 2026, toutes les entreprises
doivent pouvoir **recevoir** des factures électroniques ; l'**émission** deviendra
obligatoire pour les TPE au 1er septembre 2027. Les factures de l'application portent
déjà les nouvelles mentions (SIREN du client, catégorie d'opération, date de
prestation) mais restent des PDF : pour les factures aux entreprises et aux
collectivités, il faudra passer par une plateforme agréée d'ici septembre 2027.
Les factures aux particuliers ne sont pas concernées.

**Les limites assumées de cette version :**

- pas de récupération de code par mail : c'est vous qui réinitialisez ;
- un chantier est affecté à un seul agent ;
- pas de géolocalisation du pointage, volontairement.

---

## 13. Retirer le badge « Powered by Netlify »

Sur app.netlify.com, ouvrez le projet, puis **Project configuration → General →
Powered by Netlify badge** et désactivez-le. C'est immédiat, sans redéploiement.
À faire pour l'application **et** pour le site.

---

## 14. En cas de problème

| Ce que vous voyez | Ce qu'il faut faire |
|---|---|
| « La partie serveur n'a pas été installée » | Le glisser-déposer n'a pas emporté le sous-dossier `netlify`. Redéployez le dossier **entier**, ou passez par la méthode 2 (GitHub). |
| « Le serveur n'a pas répondu » | Attendez une minute et rechargez : le déploiement n'est peut-être pas terminé. |
| « Identifiant ou code incorrect » alors que c'est le bon | Après huit essais ratés, l'accès est bloqué un quart d'heure. Patientez. |
| Les photos restent « En attente » | Le téléphone n'a pas de réseau. Elles partiront seules ; ne fermez pas l'application avant. |
| Le mail n'est pas parti | Vérifiez la partie 10, et que le chantier comporte bien une adresse client. |
| Le bouton **Partager** n'apparaît pas | Le navigateur ne sait pas partager un fichier (certains ordinateurs) : le bouton **PDF** l'enregistre. |
| Aucune alerte ne vient | Activez les notifications dans **Mon compte**, sur chaque téléphone ; vérifiez qu'elles sont allumées dans **Réglages → Alertes automatiques**. |

---

*Application développée pour Quercy Propreté, Cahors (46).
Les identifiants, les clés et les données vous appartiennent entièrement.*
