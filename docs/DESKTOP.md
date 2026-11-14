# Application de bureau (Tauri 2)

`apps/desktop` est une fenêtre native (Windows, macOS, Linux) qui embarque l'application web
Quercy hébergée (`QUERCY_URL`, par défaut `https://app.quercy.fr`). Toute la logique reste sur
le serveur : les données, droits et mises à jour de l'interface sont ceux du site.

## Fonctions natives

| Fonction                                                                                                                                     | Où                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Barre de titre intégrée (boutons natifs sous macOS, dessinés sous Windows/Linux), glisser la fenêtre depuis la barre supérieure              | `window_builder`, `WindowControls`, `data-tauri-drag-region` |
| Taille et position mémorisées                                                                                                                | extension `window-state`                                     |
| Multi-fenêtres : « Ouvrir dans une nouvelle fenêtre » sur une fiche ou un document, Fichier › Nouvelle fenêtre (Ctrl+N)                      | commande `open_window`                                       |
| Icône dans la zone de notification (ouvrir, nouvelle fenêtre, lancement au démarrage, quitter), badge du nombre de notifications non lues    | `tray`, commande `set_badge`                                 |
| Notifications du système pour chaque nouvelle notification                                                                                   | commande `notify`                                            |
| Raccourci global Ctrl+Maj+Espace : ramène Quercy au premier plan                                                                             | extension `global-shortcut`                                  |
| Menu natif (Fichier, Édition, Affichage avec zoom, Aide)                                                                                     | `app_menu`                                                   |
| Impression native (Ctrl+P ; bouton « Imprimer » des devis et factures, boîte de dialogue du système)                                         | `print`, `PrintPdfButton`                                    |
| Une seule instance                                                                                                                           | extension `single-instance`                                  |
| Mises à jour automatiques signées (vérification au démarrage et depuis Aide)                                                                 | extension `updater`                                          |
| Hors ligne partiel (commun au navigateur) : écrans et données déjà consultés, créations en file d'attente envoyées au retour de la connexion | `public/sw.js`, `OfflineStatus`                              |

## Développement

```bash
# Prérequis Linux : libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev libxdo-dev
pnpm dev                                   # application web sur http://localhost:3000
pnpm --filter @quercy/desktop tauri:dev    # fenêtre de bureau pointant sur le serveur local
```

`QUERCY_URL` choisit le serveur (au lancement ou à la compilation). Seules les adresses listées
dans `src-tauri/capabilities/default.json` (`remote.urls`) peuvent appeler les fonctions natives :
ajoutez-y votre domaine si vous hébergez Quercy ailleurs.

## Installeurs et mises à jour

L'étiquette `desktop-v0.10.0` (par exemple) déclenche `.github/workflows/desktop-release.yml` :
installeurs `.msi`/`.exe`, `.dmg` (Intel et Apple Silicon) et `.AppImage`/`.deb`, publiés en
brouillon de version GitHub avec `latest.json` pour les mises à jour.

Mises à jour signées, une fois :

1. `pnpm --filter @quercy/desktop tauri signer generate -w ~/.tauri/quercy.key`
2. Secrets du dépôt : `TAURI_SIGNING_PRIVATE_KEY` (contenu du fichier),
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `TAURI_UPDATER_PUBKEY` (clé publique affichée).
3. Variable du dépôt `QUERCY_URL` si le serveur n'est pas `https://app.quercy.fr`.

Sans clé publique, l'application fonctionne sans mise à jour automatique (l'extension n'est
pas chargée). La signature du code Windows (Authenticode) et la notarisation Apple se
configurent avec les secrets habituels de `tauri-action` (certificats de l'éditeur).
