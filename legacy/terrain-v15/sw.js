/* Service worker : garde l'application utilisable sans réseau.
   La coque (page, icônes, polices) est servie depuis le cache ;
   les données passent toujours par le réseau, et jamais par le cache. */
var CACHE = "qp-v4";
var COQUE = ["./", "./index.html", "./manifest.json", "./icone-192.png", "./icone-180.png", "./icone-512.png", "./logo.webp", "./logo-pdf.png", "./favicon.png", "./badge-96.png"];

self.addEventListener("install", function (ev) {
  ev.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(COQUE).catch(function(){}); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function (ev) {
  ev.waitUntil(caches.keys().then(function (l) {
    return Promise.all(l.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (ev) {
  var req = ev.request;
  if (req.method !== "GET") return;
  var u = new URL(req.url);
  if (u.pathname.indexOf("/api/") >= 0 || u.pathname.indexOf("/.netlify/") >= 0) return;   /* données : réseau seulement */

  if (req.mode === "navigate") {
    ev.respondWith(fetch(req).then(function (r) {
      var copie = r.clone();
      caches.open(CACHE).then(function (c) { c.put("./index.html", copie); });
      return r;
    }).catch(function () {
      return caches.match("./index.html").then(function (r) { return r || new Response("Hors réseau", { status: 503 }); });
    }));
    return;
  }
  ev.respondWith(caches.match(req).then(function (hit) {
    var reseau = fetch(req).then(function (r) {
      if (r && r.ok && (u.origin === location.origin || u.hostname.indexOf("gstatic") >= 0 || u.hostname.indexOf("googleapis") >= 0 || u.hostname.indexOf("cdnjs") >= 0)) {
        var copie = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copie); });
      }
      return r;
    }).catch(function () { return hit; });
    return hit || reseau;
  }));
});

/* Notifications : le message arrive ici même quand l'application est fermée. */
self.addEventListener("push", function (ev) {
  var d = {};
  try { d = ev.data ? ev.data.json() : {}; } catch (x) { d = { titre: "Quercy Propreté", corps: ev.data ? ev.data.text() : "" }; }
  ev.waitUntil(self.registration.showNotification(d.titre || "Quercy Propreté", {
    body: d.corps || "", icon: "./icone-192.png", badge: "./badge-96.png",
    data: { onglet: d.onglet || "tournee" }, tag: d.tag || d.onglet || "qp", renotify: true,
  }));
});
self.addEventListener("notificationclick", function (ev) {
  ev.notification.close();
  var cible = "./?onglet=" + ((ev.notification.data && ev.notification.data.onglet) || "tournee");
  ev.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (l) {
    for (var i = 0; i < l.length; i++) {
      if ("focus" in l[i]) { l[i].postMessage({ onglet: (ev.notification.data || {}).onglet }); return l[i].focus(); }
    }
    return self.clients.openWindow(cible);
  }));
});
