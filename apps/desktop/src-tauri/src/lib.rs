//! Application de bureau Quercy : une fenêtre native qui embarque l'application web
//! (serveur `QUERCY_URL`), avec les fonctions du système (zone de notification, badge,
//! notifications, raccourci global, multi-fenêtres, impression, démarrage automatique,
//! mises à jour signées).

use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;

use tauri::menu::{
    CheckMenuItemBuilder, Menu, MenuBuilder, MenuEvent, MenuItemBuilder, PredefinedMenuItem,
    SubmenuBuilder,
};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Runtime, WebviewUrl, WebviewWindow, WebviewWindowBuilder, Wry};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_updater::UpdaterExt;

const MAIN: &str = "main";
const DEFAULT_URL: &str = "https://app.quercy.fr";

/// Niveau de zoom de l'interface (Ctrl + / Ctrl − / Ctrl 0).
struct Zoom(Mutex<f64>);
/// Compteur des fenêtres secondaires (fiches ouvertes à part).
static WINDOWS: AtomicU32 = AtomicU32::new(0);

/// Adresse du serveur : variable `QUERCY_URL` au lancement, sinon celle de la compilation.
fn server_url() -> url::Url {
    let raw = std::env::var("QUERCY_URL")
        .ok()
        .or_else(|| option_env!("QUERCY_URL").map(String::from))
        .unwrap_or_else(|| DEFAULT_URL.to_string());
    url::Url::parse(&raw).unwrap_or_else(|_| url::Url::parse(DEFAULT_URL).expect("URL par défaut"))
}

fn window_builder<'a, R: Runtime, M: Manager<R>>(
    manager: &'a M,
    label: &'a str,
    url: url::Url,
) -> WebviewWindowBuilder<'a, R, M> {
    let builder = WebviewWindowBuilder::new(manager, label, WebviewUrl::External(url))
        .title("Quercy")
        .inner_size(1440.0, 900.0)
        .min_inner_size(1280.0, 720.0);
    // Barre de titre intégrée à l'interface : boutons natifs sous macOS, dessinés par
    // l'application ailleurs.
    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true);
    #[cfg(not(target_os = "macos"))]
    let builder = builder.decorations(false);
    builder
}

fn show_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn focused_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.webview_windows()
        .into_values()
        .find(|w| w.is_focused().unwrap_or(false))
        .or_else(|| app.get_webview_window(MAIN))
}

/// Ouvre une page de Quercy (fiche, liste…) dans une nouvelle fenêtre.
#[tauri::command]
fn open_window(app: AppHandle, path: String) -> Result<(), String> {
    if !path.starts_with('/') || path.starts_with("//") {
        return Err("Chemin invalide.".into());
    }
    let url = server_url().join(&path).map_err(|e| e.to_string())?;
    let label = format!("fenetre-{}", WINDOWS.fetch_add(1, Ordering::Relaxed) + 1);
    window_builder(&app, &label, url)
        .build()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Nombre de notifications non lues : badge de l'icône et info-bulle de la zone de notification.
#[tauri::command]
fn set_badge(app: AppHandle, count: u32) {
    if let Some(window) = app.get_webview_window(MAIN) {
        let _ = window.set_badge_count(if count == 0 { None } else { Some(count as i64) });
    }
    if let Some(tray) = app.tray_by_id("quercy") {
        let tooltip = match count {
            0 => "Quercy".to_string(),
            1 => "Quercy — 1 notification".to_string(),
            n => format!("Quercy — {n} notifications"),
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

/// Notification du système (hors de la fenêtre).
#[tauri::command]
fn notify(app: AppHandle, title: String, body: Option<String>) -> Result<(), String> {
    let mut builder = app.notification().builder().title(title);
    if let Some(body) = body {
        builder = builder.body(body);
    }
    builder.show().map_err(|e| e.to_string())
}

/// Impression native de la page affichée (devis, factures…).
#[tauri::command]
fn print_page(window: WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| e.to_string())
}

/// Recharge l'application (après une coupure de connexion).
#[tauri::command]
fn reload_app(app: AppHandle) -> Result<(), String> {
    let window = app.get_webview_window(MAIN).ok_or("Fenêtre introuvable.")?;
    window.navigate(server_url()).map_err(|e| e.to_string())
}

/// Vérifie, télécharge et installe une mise à jour signée ; `true` si une mise à jour a été
/// installée (appliquée au prochain démarrage).
#[tauri::command]
async fn check_updates(app: AppHandle) -> Result<bool, String> {
    install_update(&app).await.map_err(|e| e.to_string())
}

async fn install_update(app: &AppHandle) -> tauri_plugin_updater::Result<bool> {
    let Ok(updater) = app.updater() else {
        return Ok(false);
    };
    if let Some(update) = updater.check().await? {
        let version = update.version.clone();
        update.download_and_install(|_, _| {}, || {}).await?;
        let _ = app
            .notification()
            .builder()
            .title("Mise à jour de Quercy")
            .body(format!("La version {version} s'appliquera au prochain démarrage."))
            .show();
        return Ok(true);
    }
    Ok(false)
}

fn set_zoom(app: &AppHandle, next: impl Fn(f64) -> f64) {
    let state = app.state::<Zoom>();
    let mut zoom = state.0.lock().expect("zoom");
    *zoom = next(*zoom).clamp(0.5, 2.0);
    for window in app.webview_windows().values() {
        let _ = window.set_zoom(*zoom);
    }
}

fn app_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let file = SubmenuBuilder::new(app, "Fichier")
        .item(&MenuItemBuilder::with_id("new-window", "Nouvelle fenêtre").accelerator("CmdOrCtrl+N").build(app)?)
        .item(&MenuItemBuilder::with_id("print", "Imprimer…").accelerator("CmdOrCtrl+P").build(app)?)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, Some("Fermer la fenêtre"))?)
        .item(&PredefinedMenuItem::quit(app, Some("Quitter Quercy"))?)
        .build()?;
    let edit = SubmenuBuilder::new(app, "Édition")
        .item(&PredefinedMenuItem::undo(app, Some("Annuler"))?)
        .item(&PredefinedMenuItem::redo(app, Some("Rétablir"))?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, Some("Couper"))?)
        .item(&PredefinedMenuItem::copy(app, Some("Copier"))?)
        .item(&PredefinedMenuItem::paste(app, Some("Coller"))?)
        .item(&PredefinedMenuItem::select_all(app, Some("Tout sélectionner"))?)
        .build()?;
    let view = SubmenuBuilder::new(app, "Affichage")
        .item(&MenuItemBuilder::with_id("reload", "Recharger").accelerator("CmdOrCtrl+R").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("zoom-in", "Zoom avant").accelerator("CmdOrCtrl+=").build(app)?)
        .item(&MenuItemBuilder::with_id("zoom-out", "Zoom arrière").accelerator("CmdOrCtrl+-").build(app)?)
        .item(&MenuItemBuilder::with_id("zoom-reset", "Taille réelle").accelerator("CmdOrCtrl+0").build(app)?)
        .separator()
        .item(&PredefinedMenuItem::fullscreen(app, Some("Plein écran"))?)
        .build()?;
    let help = SubmenuBuilder::new(app, "Aide")
        .item(&MenuItemBuilder::with_id("updates", "Rechercher des mises à jour").build(app)?)
        .build()?;
    MenuBuilder::new(app).items(&[&file, &edit, &view, &help]).build()
}

fn on_menu(app: &AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        "new-window" => {
            let _ = open_window(app.clone(), "/".into());
        }
        "print" => {
            if let Some(window) = focused_window(app) {
                let _ = window.print();
            }
        }
        "reload" => {
            if let Some(window) = focused_window(app) {
                let _ = window.eval("window.location.reload()");
            }
        }
        "zoom-in" => set_zoom(app, |z| z + 0.1),
        "zoom-out" => set_zoom(app, |z| z - 0.1),
        "zoom-reset" => set_zoom(app, |_| 1.0),
        "updates" => {
            let app = app.clone();
            tauri::async_runtime::spawn(async move {
                let installed = install_update(&app).await.unwrap_or(false);
                if !installed {
                    let _ = app
                        .notification()
                        .builder()
                        .title("Quercy est à jour")
                        .show();
                }
            });
        }
        "show" => show_main(app),
        "autostart" => {
            let launcher = app.autolaunch();
            let enabled = launcher.is_enabled().unwrap_or(false);
            let _ = if enabled { launcher.disable() } else { launcher.enable() };
        }
        "quit" => app.exit(0),
        _ => {}
    }
}

fn tray(app: &AppHandle) -> tauri::Result<()> {
    let autostart = CheckMenuItemBuilder::with_id("autostart", "Lancer au démarrage de l'ordinateur")
        .checked(app.autolaunch().is_enabled().unwrap_or(false))
        .build(app)?;
    let menu = MenuBuilder::new(app)
        .item(&MenuItemBuilder::with_id("show", "Ouvrir Quercy").build(app)?)
        .item(&MenuItemBuilder::with_id("new-window", "Nouvelle fenêtre").build(app)?)
        .separator()
        .item(&autostart)
        .separator()
        .item(&MenuItemBuilder::with_id("quit", "Quitter").build(app)?)
        .build()?;
    let mut builder = TrayIconBuilder::with_id("quercy")
        .tooltip("Quercy")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(on_menu)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                show_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();
    #[cfg(desktop)]
    {
        // Une seule instance : relancer l'application ramène la fenêtre existante.
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _, _| show_main(app)));
    }
    builder
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .manage(Zoom(Mutex::new(1.0)))
        .invoke_handler(tauri::generate_handler![
            open_window,
            set_badge,
            notify,
            print_page,
            reload_app,
            check_updates
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            // Mises à jour signées : actives quand la clé publique est fournie à la compilation
            // (voir docs/DESKTOP.md) ; vérification au démarrage.
            if app.config().plugins.0.contains_key("updater") {
                handle.plugin(tauri_plugin_updater::Builder::new().build())?;
                let for_update = handle.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = install_update(&for_update).await;
                });
            }
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
                // Raccourci global : Ctrl+Maj+Espace ramène Quercy au premier plan.
                let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);
                handle.plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |app, pressed, event| {
                            if pressed == &shortcut && event.state() == ShortcutState::Pressed {
                                show_main(app);
                            }
                        })
                        .build(),
                )?;
                // Un raccourci déjà pris par une autre application n'empêche pas le démarrage.
                let _ = handle.global_shortcut().register(shortcut);
            }
            app.set_menu(app_menu(&handle)?)?;
            app.on_menu_event(on_menu);
            tray(&handle)?;
            window_builder(app, MAIN, server_url()).build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erreur au démarrage de Quercy");
}
