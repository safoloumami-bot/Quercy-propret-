/**
 * Code du service worker de l'application terrain (une entreprise = une adresse) :
 * - l'écran (page, manifeste, icônes) : réseau d'abord, copie gardée pour le hors-réseau ;
 * - les lectures de données (état, tournée, fiche) : réseau d'abord, dernière réponse gardée,
 *   rendue hors réseau avec l'en-tête `x-qp-memoire` (heure de la copie) ;
 * - les envois (POST) ne passent jamais par le cache : la file d'attente de l'application
 *   les rejoue au retour du réseau ;
 * - les polices et la bibliothèque PDF (sites externes) : copie gardée pour le hors-réseau ;
 * - les notifications du téléphone (push) : affichées même application fermée, le toucher
 *   ouvre l'écran concerné.
 */
export function terrainServiceWorker(
  base: string,
  brand: { name: string; icon: string; badge: string } = { name: "Terrain", icon: "", badge: "" },
): string {
  const b = JSON.stringify(base);
  return `"use strict";
var BASE = ${b};
var NOM = ${JSON.stringify(brand.name)};
var ICONE = ${JSON.stringify(brand.icon)};
var BADGE = ${JSON.stringify(brand.badge)};
var SHELL = "qp-ecran-v2";
var EXTERNES = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"];
var DATA = "qp-donnees";
var READS = ["etat", "tournee", "chantier"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL).then(function (c) {
      return c.addAll([BASE, BASE + "/manifest.json"]).catch(function () {});
    }).then(function () { return self.skipWaiting(); })
  );
});
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (l) {
      return Promise.all(l.filter(function (k) { return k.indexOf("qp-ecran-") === 0 && k !== SHELL; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function mine(url) {
  return url.origin === self.location.origin &&
    (url.pathname === BASE || url.pathname.indexOf(BASE + "/") === 0);
}
function isRead(url) {
  var route = url.pathname.slice((BASE + "/api/").length);
  return url.pathname.indexOf(BASE + "/api/") === 0 && READS.indexOf(route) >= 0;
}
function remember(cacheName, request, response) {
  if (!response || !response.ok) return response;
  var copy = response.clone();
  caches.open(cacheName).then(function (c) {
    return copy.blob().then(function (body) {
      var headers = new Headers(copy.headers);
      headers.set("x-qp-memoire", String(Date.now()));
      return c.put(request, new Response(body, { status: copy.status, headers: headers }));
    });
  }).catch(function () {});
  return response;
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (EXTERNES.indexOf(url.hostname) >= 0) {
    // Polices et bibliothèque PDF : la copie d'abord (elles ne changent pas).
    event.respondWith(
      caches.open(SHELL).then(function (c) {
        return c.match(req).then(function (hit) {
          return hit || fetch(req).then(function (res) {
            if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }
  if (!mine(url)) return;
  if (url.pathname.indexOf(BASE + "/api/") === 0 && !isRead(url)) return;
  var cacheName = isRead(url) ? DATA : SHELL;
  var key = req.mode === "navigate" ? BASE : req;
  event.respondWith(
    fetch(req).then(function (res) {
      return remember(cacheName, key, res);
    }).catch(function () {
      return caches.open(cacheName).then(function (c) { return c.match(key); }).then(function (hit) {
        return hit || new Response(JSON.stringify({ erreur: "Hors réseau." }), {
          status: 503,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      });
    })
  );
});

/* Notifications : le message arrive ici même quand l'application est fermée. */
self.addEventListener("push", function (event) {
  var d = {};
  try { d = event.data ? event.data.json() : {}; } catch (x) { d = { titre: NOM, corps: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(d.titre || NOM, {
    body: d.corps || "", icon: ICONE || undefined, badge: BADGE || undefined,
    data: { onglet: d.onglet || "tournee" }, tag: d.tag || d.onglet || "qp", renotify: true
  }));
});
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var onglet = (event.notification.data && event.notification.data.onglet) || "tournee";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (l) {
    for (var i = 0; i < l.length; i++) {
      if (mine(new URL(l[i].url)) && "focus" in l[i]) { l[i].postMessage({ onglet: onglet }); return l[i].focus(); }
    }
    return self.clients.openWindow(BASE + "/?onglet=" + encodeURIComponent(onglet));
  }));
});
`;
}
