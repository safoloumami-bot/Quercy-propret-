/**
 * Code du service worker de l'application terrain (une entreprise = une adresse) :
 * - l'écran (page, manifeste, icônes) : réseau d'abord, copie gardée pour le hors-réseau ;
 * - les lectures de données (état, tournée, fiche) : réseau d'abord, dernière réponse gardée,
 *   rendue hors réseau avec l'en-tête `x-qp-memoire` (heure de la copie) ;
 * - les envois (POST) ne passent jamais par le cache : la file d'attente de l'application
 *   les rejoue au retour du réseau.
 */
export function terrainServiceWorker(base: string): string {
  const b = JSON.stringify(base);
  return `"use strict";
var BASE = ${b};
var SHELL = "qp-ecran-v1";
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
  event.waitUntil(self.clients.claim());
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
`;
}
