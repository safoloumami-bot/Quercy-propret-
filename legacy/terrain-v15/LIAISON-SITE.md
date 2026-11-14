# Relier le formulaire du site à l'application

Une fois ce petit bloc ajouté au site quercy-proprete.fr, **chaque demande de devis
arrive aussi dans l'onglet Demandes de l'application**, avec la pastille rouge et
le badge sur l'icône. Le mail FormSubmit continue d'arriver comme avant, en filet
de sécurité.

## Le bloc à coller

À placer dans `index.html` du site, **juste avant `</body>`** :

```html
<script>
/* Envoie aussi chaque demande de devis à l'application terrain */
(function () {
  var APP = "https://boisterous-marigold-953808.netlify.app/api/demande";
  document.querySelectorAll('form[action*="formsubmit"]').forEach(function (f) {
    f.addEventListener("submit", function () {
      try {
        var d = {};
        new FormData(f).forEach(function (v, k) { if (typeof v === "string") d[k] = v; });
        fetch(APP, { method: "POST", mode: "no-cors", keepalive: true,
          headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(d) });
      } catch (e) {}
    }, true);
  });
})();
</script>
```

Si un jour l'application passe sur `terrain.quercy-proprete.fr`, il suffit de
changer l'adresse de la ligne `var APP`.

## Ce que ça ne change pas

- Le formulaire part toujours chez FormSubmit, le mail arrive toujours.
- Si l'application ne répond pas, le visiteur ne voit aucune différence.
- Les robots qui remplissent le champ piège `_honey` sont ignorés ; au-delà de
  cinq envois en dix minutes depuis la même connexion, les suivants sont refusés.

## Vérifier

Envoyez-vous une demande depuis le site. Dans l'application, l'onglet
**Demandes** affiche une pastille dans la minute (immédiatement si vous
rouvrez l'application).
