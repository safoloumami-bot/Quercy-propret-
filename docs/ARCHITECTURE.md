# Architecture

## Monorepo

pnpm workspaces + Turborepo. Les paquets internes sont consommés **en TypeScript source**
(`exports` vers `src/`), transpilés par Next.js (`transpilePackages`) : pas d'étape de build
intermédiaire, et le typage traverse tout le dépôt.

```
@quercy/web  ──►  @quercy/ui        (composants, jetons)
      │      ──►  @quercy/core      (règles pures : permissions, registre des fiches, ventes…)
      │      ──►  @quercy/db        ──►  @quercy/core
      │      ──►  @quercy/storage   (fichiers, local ou S3)
      │      ──►  @quercy/mailer    (emails : Resend ou boîte de développement)
      └────►  @quercy/documents ──►  core, db, mailer (PDF, Factur-X, numérotation, relances)
      └────►  @quercy/reports   ──►  core, db, documents, mailer (rapports, droits, envois)
@quercy/worker ──►  db, storage, documents, mailer, reports
```

`@quercy/core` ne dépend d'aucun framework (seulement Zod). Il est testable unitairement
et utilisable côté serveur comme côté client.

## Multi-entreprises

- `Organization` = un espace. `Membership` relie un `User` à un espace avec un `Role`.
- Toute table métier porte `organizationId`, `createdAt`, `updatedAt`, `deletedAt`
  (suppression douce, corbeille de 30 jours).
- `AuditLog` trace qui a fait quoi, quand, avec les valeurs avant et après.
- L'espace actif est mémorisé **dans la session** (`session.activeOrganizationId`). À chaque
  requête, `resolveWorkspace()` vérifie que l'utilisateur en est toujours membre ; sinon il
  retombe sur son premier espace.
- **Isolation garantie par la base** : `forTenant(organizationId)` (`packages/db/src/tenant.ts`)
  est une extension Prisma. Elle ajoute `organizationId` à toute lecture, mise à jour ou
  suppression sur les modèles métier, et le force à la création. Un identifiant d'un autre
  espace est donc introuvable, même si le code appelant se trompe. Les éléments en corbeille
  (`deletedAt`) sont masqués par défaut.
- Les tests `apps/web/src/server/__tests__/isolation.test.ts` le prouvent sur une vraie base :
  deux espaces, et aucune procédure appelée depuis A ne lit ni ne modifie B.
- **Défense en profondeur dans PostgreSQL** (migration `core_lot1`) :
  - chaque requête de `forTenant` s'exécute dans une transaction sous le rôle
    **`quercy_tenant`** (sans passe-droit RLS), avec `app.org_id` = l'espace. La politique RLS
    `quercy_tenant_isolation` de chaque table à `organizationId` n'y laisse lire ni écrire
    que les lignes de l'espace ;
  - le trigger **`quercy_tenant_guard`** refuse qu'une ligne pointe vers une ligne d'une autre
    entreprise (code 23503, vu par Prisma comme P2003), y compris pour les tâches système qui
    travaillent hors de ce rôle ;
  - `quercy_install_tenant_security()` (idempotente) pose RLS et triggers sur toutes les
    tables concernées : **toute migration qui ajoute une table métier doit la rappeler**
    (`SELECT quercy_install_tenant_security();`).
  - Prouvé par `apps/web/src/server/__tests__/db-security.test.ts`.
- **L'historique ne disparaît pas** : journal, preuves et anomalies empêchent l'effacement
  de leur intervention (`ON DELETE NO ACTION`) ; la corbeille ne purge que ce qui n'a aucun
  historique, le reste reste archivé.

## Chaîne contractuelle (CORE)

`Client → Site → Contrat → ServiceLine (prestation) → RecurrenceSeries → RecurrenceRuleVersion
→ Intervention`. La fréquence n'est jamais dans le site. Une fréquence qui change crée une
nouvelle version de règle (date d'effet) ; les interventions générées portent `seriesId`,
`ruleVersionId` et un `slotKey` unique (`organizationId`, `slotKey`) qui interdit les doublons.
Une intervention distingue l'intervenant prévu (`ownerId`), le remplaçant
(`replacementAgentId`) et l'intervenant réel (`actualAgentId`). Statuts : `planned`
(= scheduled), `in_progress`, `done` (= completed), `rescheduled`, `access_impossible`,
`missed`, `to_rework`, `cancelled`. Le journal `InterventionEvent` (types dans
`INTERVENTION_EVENT_TYPES`) est alimenté par l'application terrain, le pointage du logiciel et
la tâche quotidienne. Photos et preuves (`InterventionProof`) et anomalies (`Anomaly`) sont
des entités à part. Les règles de récurrence sont décrites par `recurrenceRuleSchema`
(`packages/core/src/recurrence.ts`).

## Authentification

Better Auth (`apps/web/src/server/auth.ts`), avec l'adaptateur Prisma :

- mot de passe haché en **Argon2id** (`@node-rs/argon2`, paramètres OWASP) ;
- lien magique, Google et Microsoft (activés seulement si configurés) ;
- double authentification TOTP avec codes de secours, et appareil de confiance 30 jours ;
- sessions en base, listables et révocables ; limitation de débit en production.

Le middleware (`src/middleware.ts`) ne fait qu'un filtre rapide sur la présence du cookie. La
session est ensuite réellement vérifiée à chaque rendu serveur (`requireWorkspaceContext`) et à
chaque appel d'API.

## API

tRPC v11 (`apps/web/src/server/trpc`) : `/api/trpc`, typage de bout en bout, superjson.

- `publicProcedure` → `authedProcedure` (session obligatoire) → `orgProcedure`, qui résout
  l'espace actif, le rôle, les équipes et fournit `ctx.db = forTenant(...)`.
- `authorize(ctx, ressource, action)` : contrôle de permission côté serveur, avec un message
  clair.
- `recordAudit(ctx, …)` : entrée du journal d'audit (acteur, IP, changements avant/après).
- Côté client, `useTRPC()` et TanStack Query fournissent les mises à jour optimistes (rôle d'un
  membre) et les squelettes de chargement.
- Côté serveur, `api()` crée un appelant direct pour les composants serveur.

## Abonnements

- **Offres** (`packages/core/src/billing.ts`) : prix par utilisateur, remise annuelle de 20 %,
  limites (membres, modules, stockage, crédits IA, automatisations).
- **`billingState()`**, fonction pure, calcule à tout instant l'offre effective et l'état de
  l'espace. Un essai terminé sans abonnement repasse en Gratuit. Au-delà des limites, l'espace
  passe en lecture seule. Un paiement refusé ouvre 7 jours de grâce, puis la lecture seule ;
  un impayé met l'espace en lecture seule immédiatement.
- **Côté serveur**, `orgProcedure` refuse toute mutation d'un espace en lecture seule, sauf
  celles qui permettent d'en sortir (payer, retirer un membre, réduire les modules, partir).
  Les invitations et l'activation de modules vérifient les limites de l'offre. L'erreur porte
  `data.planLimit`, et l'interface propose alors « Voir les offres ».
- **Stripe** (`apps/web/src/server/billing`) : Checkout pour la première souscription,
  changement d'offre au prorata, portail client, annulation en fin de période. Les sièges
  suivent automatiquement le nombre de membres.
- **Webhooks** : signature vérifiée, puis chaque événement est enregistré dans `stripe_event`,
  dont l'identifiant sert de clé d'idempotence, avant d'être traité. Un échec reste en base
  (`FAILED`) et se rejoue depuis `/admin`. Stripe reste la source de vérité ; le traitement
  recopie l'état de l'abonnement.

## Moteur générique des fiches

Tout module métier s'appuie sur le même moteur (`packages/core/src/records`,
`apps/web/src/server/records`, `apps/web/src/components/records`) :

- **Registre d'entités** (`ENTITIES`) : champs typés (texte, nombre, montant, date, liste,
  étiquettes, personne, relation…), avec leurs propriétés : modifiable, triable,
  filtrable, regroupable, agrégat. Les **champs personnalisés** (`CustomFieldDefinition`)
  s'y ajoutent ; leurs valeurs sont stockées dans la colonne JSON `customFields`.
- **Filtres** (`FilterGroup`, deux niveaux ET/OU) convertis par `buildWhere()` en clause
  Prisma, sur **liste blanche** : aucune règle ne peut viser une colonne hors du registre, ni
  `organizationId`.
- **Validation** unique (`parseRecordInput`), utilisée pour la création, l'édition en
  cellule, les actions groupées et l'import ligne par ligne.
- **API** `records.*` : liste paginée (infinie), groupes avec nombre et sous-totaux (`groupBy`
  SQL), fiche, création, modification, actions groupées, corbeille et restauration, import
  (vérification à blanc, puis import). Export CSV ou Excel par `/api/records/<entité>/export`.
- **Portée des droits** : « les siens » ou « son équipe » s'appliquent via `ownerId` à la
  lecture, à la modification et à la suppression.
- **Historique** : chaque modification est inscrite dans `AuditLog` (avant/après, champ par
  champ), et l'onglet Historique de la fiche la relit.
- **Tableau** (`DataTable`) : TanStack Table (largeurs) + TanStack Virtual (100 000+ lignes),
  vues enregistrées (personnelles ou partagées), mise à jour optimiste.
- **Collaboration** : commentaires avec @mentions, notifications, pièces jointes (stockage
  local ou S3, liens signés de 5 minutes, types et quota contrôlés), présence (Redis, TTL de
  45 s) et mises à jour en direct (Redis Pub/Sub, puis Server-Sent Events vers
  `RealtimeListener`).
- **Corbeille** : suppression douce, purge définitive à 30 jours par le worker
  (`apps/worker`, BullMQ, tous les jours à 3 h 15, heure de Paris).

- **Affichages** : tableau, Kanban (colonnes = valeurs d'un champ liste, glisser-déposer ou
  menu « Déplacer vers » au clavier, sommes par colonne), calendrier mensuel sur un champ date
  (glisser change la date), Gantt (barres déplaçables et redimensionnables). Chaque entité
  déclare ses affichages (`layouts`) ; le choix fait partie de la vue enregistrée.
- **Relations génériques** : un champ `relation` vise n'importe quelle entité ; libellés,
  listes de choix, import par libellé, contrôle d'appartenance à l'espace et onglets de
  « fiches liées » (`related`, vue 360°) sont déduits du registre.
- **Règles métier** (`records/hooks.ts`) : probabilité et date de clôture d'une opportunité
  selon l'étape, date de fin d'une tâche, verrouillage d'une facture émise, suppression limitée
  aux brouillons.

Ajouter un module métier revient à : déclarer l'entité dans le registre (`entities.ts` :
champs, titre, affichages, fiches liées), ajouter le modèle Prisma (avec `organizationId`,
`ownerId`, `customFields`, `deletedAt`) à `TENANT_MODELS`. Tableaux, fiches, Kanban/calendrier,
filtres, import/export, historique, commentaires, fichiers et recherche globale sont alors
disponibles, sous `/<module>/<entité>` (route dynamique commune).

## Ventes et facturation

- Une table `sales_document` porte devis, commandes, factures, avoirs et modèles récurrents
  (`kind`) ; le moteur les expose comme cinq entités distinctes (`baseWhere`). Les lignes
  (`sales_document_line`) et les montants sont en **centimes entiers** ; la TVA est calculée
  par taux sur la somme des bases (`computeTotals`, `@quercy/core`).
- **Numérotation continue** par type et par année (`FA-2026-0042`), attribuée à l'émission dans
  la même transaction que le document (`INSERT … ON CONFLICT … RETURNING` sur
  `number_sequence`) : une émission refusée ne consomme pas de numéro. Une facture émise est
  figée (sauf responsable, étiquettes, échéance) et ne se supprime pas : on la corrige par un
  avoir, qui s'impute sur son reste dû.
- `@quercy/documents` produit le **PDF** (pdf-lib, police Geist embarquée) et, pour les factures
  et avoirs, le **XML Factur-X** (CII, profil BASIC) joint au PDF avec ses métadonnées XMP.
  Le même paquet porte les opérations métier (émission, paiements, avoirs, transformations,
  récurrence, facturation du temps) et l'envoi des emails avec pièce jointe.
- **Worker** : chaque matin à 7 h, factures récurrentes échues (émises, envoyées si demandé),
  passage « en retard », expiration des devis et relances aux paliers configurés.
- **Paiement en ligne** : chaque entreprise enregistre ses propres clés Stripe (chiffrées en
  AES-256-GCM) ; le lien public de la facture ouvre Stripe Checkout et le webhook de
  l'entreprise (`/api/stripe/ventes/<espace>`) enregistre le paiement (idempotent par session).
- **Lien public** `/document/<jeton>` (jeton aléatoire, non indexé) : consultation, PDF,
  acceptation d'un devis (nom du signataire horodaté et tracé), paiement d'une facture.

## Projets et temps

Projets, tâches et saisies de temps sont des entités du moteur (Gantt, Kanban, calendrier).
Le chronomètre (`timer.*`) crée une saisie ouverte (`startedAt` sans `minutes`), une seule par
personne ; l'arrêter calcule la durée. « Facturer le temps » crée une facture brouillon du
temps facturable non encore facturé d'un projet, au taux horaire du projet.

## Tableaux de bord et rapports

- **Périodes** (`resolvePeriod`, `@quercy/core`) : aujourd'hui, 7 j, 30 j, mois, trimestre,
  année, 12 mois, personnalisée, calculées dans le fuseau de l'espace, avec la période
  précédente de même durée pour les comparaisons.
- **Widgets** : registre `WIDGETS` (core), calcul serveur par widget
  (`server/analytics/widgets.ts`, droits et portée du module), liens vers la liste filtrée
  (`?filtre=` lu par `useViewState`). Disposition par personne (`dashboard`), sinon tableau par
  défaut du rôle (`defaultDashboard`). Grille : react-grid-layout (déplacer, redimensionner) et
  menu clavier équivalent (monter, descendre, élargir, réduire).
- **Rapports** : définition validée (`reportDefinitionSchema` : entité, mesure, regroupement,
  intervalle de date, champ de période, filtre, graphique). `@quercy/reports` lit les seules
  colonnes utiles dans le périmètre de la personne, puis agrège en mémoire
  (`aggregateReport`, pur et testé), jusqu'à 50 000 fiches. Le même code sert l'écran, les
  exports (PDF, Excel, CSV) et le worker, qui envoie les rapports programmés (lundi ou 1er du
  mois) avec les droits de leur auteur.
- **Graphiques** : Recharts avec les jetons de couleur du thème (`--chart-1…6`), infobulles,
  légendes, et un tableau équivalent pour les lecteurs d'écran.

## Assistant IA

- **Modèle** : API Claude via le SDK officiel (`@anthropic-ai/sdk`), `claude-opus-5` par défaut
  (`AI_MODEL`), réflexion adaptative et niveau d'effort réglable (`AI_EFFORT`), repli
  automatique côté serveur (`fallbacks: "default"`), invite système identique pour tous mise
  en cache (`cache_control`), le contexte variable (date, espace, personne, écran ouvert,
  comptes rendus d'actions) arrivant avec chaque question.
- **Boucle** (`server/ai/chat.ts`) : réponse en flux (`/api/ai/chat`, Server-Sent Events),
  exécution des outils demandés par le modèle, 8 allers-retours au plus, historique au format
  de l'API Messages borné aux 12 dernières questions ; en cas d'échec l'historique n'est pas
  corrompu. Conversations par personne (`ai_conversation` : messages pour le modèle, tours
  affichés pour l'écran).
- **Outils** (`server/ai/tools.ts`, entrées validées par Zod) : lecture (`search_records`,
  `run_report`, `get_record`, `list_members`) via l'appelant tRPC de la personne — mêmes droits,
  même portée, mêmes filtres que l'interface — et **propositions d'action** (`propose_*` :
  création ou modification de fiche, devis, relances, envoi de document). Une proposition
  n'exécute rien : elle crée une `ai_action` en attente, affichée en carte à confirmer ;
  `ai.confirmAction` l'exécute une seule fois (transition atomique) avec les droits actuels, et
  le compte rendu est transmis au modèle au tour suivant.
- **Lecture de documents** (`server/ai/extract.ts`) : PDF ou photo (10 Mo), sortie structurée
  validée par un schéma Zod (`documentExtractionSchema` : fournisseur, numéro, dates, HT, TVA
  par taux, TTC, lignes, IBAN, remarques), contrôle HT + TVA = TTC ; les données lues
  rejoignent la conversation.
- **Crédits** (`ai_usage`) : 1 par question (quelle que soit la longueur des étapes d'outils),
  3 par document ; quota mensuel = crédits par membre de l'offre effective × membres ; jetons
  consommés conservés pour le suivi des coûts.
- **Interface** : panneau ancré à droite (non modal : la navigation reste possible), fiche
  ouverte transmise en contexte (`useAssistantFocus`), rendu Markdown (liens internes seulement
  en navigation directe, pas d'images distantes), tableaux, graphiques Recharts, cartes
  d'action et de document lu.
- **Tests** : `scripts/fake-anthropic.ts` imite l'API (flux SSE et JSON) avec des réponses
  scriptées ; il sert aux tests d'intégration et aux parcours E2E.

## Modules complémentaires, automatisations et intégrations

- **Modules** (achats, stocks, agenda, support, RH, trésorerie, documents) : entités du
  registre ; règles propres dans `server/records/hooks.ts` (dates automatiques, jours ouvrés)
  et `server/records/after-change.ts` (stock des articles, soldes bancaires recalculés).
- **Après chaque écriture** (`afterRecordChange`) : valeurs calculées, puis livraison des
  webhooks (`server/automations/webhooks.ts` → file BullMQ `webhooks` → worker
  `packages/jobs/src/webhooks.ts`, signature HMAC) et automatisations (`server/automations/engine.ts`).
- **API publique** : `app/api/v1/[entity]` appelle les procédures tRPC internes avec la
  session de la personne qui a créé la clé (`server/api/keys.ts`) ; description OpenAPI
  générée depuis le registre (`server/api/openapi.ts`).

## Super-admin

Plugin `admin` de Better Auth (`user.role = "admin"`). L'espace `/admin` et le routeur
`admin.*` refusent l'accès pendant une session d'assistance. La connexion « en tant que » crée
une session marquée `impersonatedBy` : un hook l'inscrit dans le journal d'audit de chaque
espace de la personne, et chaque action faite pendant la session y est enregistrée avec
`impersonatorId`.

Les invitations stockent un **hash SHA-256 du jeton** ; le jeton lui-même n'existe que dans le
lien envoyé.

## Permissions

Matrice `ressource × action → portée` (`all` / `team` / `own`) définie dans
`packages/core/src/permissions.ts`. Les six rôles prédéfinis y sont décrits, et chaque
nouvel espace en reçoit une copie en base (`Role.permissions`), modifiable plus tard.
Les rôles personnalisés sont des lignes `Role` de plus. La fonction `can()` est appelée
**côté serveur** avant chaque écriture (ex. `updateAccentColor`) ; l'interface s'en sert
seulement pour masquer ce qui n'est pas permis.

## Interface

- **Jetons** : `packages/ui/src/styles/globals.css`. Ce sont des variables CSS
  (clair : `:root, .light` ; sombre : `.dark`), exposées à Tailwind 4 via `@theme inline`.
  Aucune couleur n'est écrite en dur dans les écrans.
- **Accent par espace** : `accentPalette()` (core) calcule une déclinaison claire et une
  sombre, avec texte lisible (contraste ≥ 4,5:1). `<AccentStyle>` les injecte dans
  `--brand*` au rendu serveur, donc sans flash.
- **Thème** : `next-themes` (classe `dark` sur `<html>`, mode « système » inclus).
- **Cadre** : `components/shell/*`, avec `ShellProvider` (état de la palette, de l'aide et de
  la barre latérale). L'état replié de la barre latérale est gardé dans un cookie et lu au
  rendu serveur.
- **Navigation** : `lib/navigation.ts` est la source unique. La barre latérale, le fil
  d'Ariane, la palette et les raccourcis « G puis X » en dérivent. Un écran n'y figure que
  s'il est livré.
- **Raccourcis** : `resolveShortcut()` est une fonction pure testée. Le hook
  `useGlobalShortcuts` la branche sur `keydown`.

## Santé et observabilité

`GET /api/health` vérifie PostgreSQL (`SELECT 1`) et Redis (`PING`), renvoie les latences et
répond 503 si un service est en panne (journal JSON structuré sur `stderr`).
