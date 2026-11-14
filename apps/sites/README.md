# Sites des entreprises (`@quercy/sites`)

Affiche publiquement les sites que les entreprises modifient dans leur espace (module
« Site web », écran **Mon site**). Un seul déploiement sert tous les sites : le nom d'hôte de
la visite choisit le site (`dupont-plomberie.sebt.site` ou un domaine personnel comme
`dupont-plomberie.fr`).

Le contenu vient de l'API publique du logiciel (`/api/public/sites/[hôte]`) ; seule la
version **publiée** est affichée. Le formulaire de contact passe par `/api/contact`, qui le
relaie au logiciel : le message devient un contact « Site web » avec une tâche « Répondre »,
et les responsables de l'espace sont notifiés.

## Variables

| Variable                  | Rôle                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SEBT_API_URL`            | Adresse du logiciel (ex. `https://app.sebt.cloud`).                                                                                                          |
| `SITES_REVALIDATE_SECRET` | Secret partagé avec le logiciel (16 caractères au moins) : une publication est visible tout de suite. Sans lui, le site se met à jour en moins d'une minute. |
| `SITES_DOMAIN`            | Domaine des adresses par défaut (même valeur que dans le logiciel, `sebt.site` par défaut).                                                                  |
| `SITE_DEV_HOST`           | En local seulement : le site à afficher sur `localhost` (ou `?site=…`).                                                                                      |

Côté logiciel : `SITES_DOMAIN` (ex. `sebt.site`), `SITES_APP_URL` (adresse de cette
application) et le même `SITES_REVALIDATE_SECRET`.

## Sans domaine : mode chemin

Sur l'adresse technique de l'hébergeur (`….netlify.app`, `….vercel.app` ou
`SITES_PLATFORM_HOST`), le premier segment du chemin choisit le site :
`sebt-sites.netlify.app/dupont-plomberie`. Côté logiciel, `SITES_BASE_URL` (ex.
`https://sebt-sites.netlify.app`) fait afficher cette adresse dans « Mon site ».

## Mise en ligne (Netlify)

Voir `netlify.toml` : projet distinct, construit depuis la racine du dépôt. Variables :
`SEBT_API_URL`, `SITES_DOMAIN`, et `SITES_REVALIDATE_SECRET` (facultatif).

## Mise en ligne (Vercel)

1. Nouveau projet Vercel sur ce dépôt, dossier racine `apps/sites`.
2. Variables ci-dessus.
3. Domaines : `*.sebt.site` (domaine générique, DNS chez Vercel) pour les adresses
   par défaut, puis chaque domaine personnel d'un client ajouté au même projet.

En local : `SEBT_API_URL=http://localhost:3000 SITE_DEV_HOST=<adresse>.sebt.site pnpm dev`
(port 3300).
