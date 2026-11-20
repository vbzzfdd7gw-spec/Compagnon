// Cryptes & Dés : hors connexion.
//  - pages, scripts et styles : réseau d'abord (dernière version), cache en secours ;
//  - bibliothèques et modèles 3D (lourds) : cache d'abord, mise à jour en arrière-plan.
const V = 'cd-14';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('cd-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  const reseau = () => fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
    return res;
  });
  if (/\/(lib|modeles)\//.test(u.pathname)) {
    e.respondWith(caches.match(r).then(m => {
      const maj = reseau().catch(() => m);
      return m || maj;
    }));
    return;
  }
  e.respondWith(reseau().catch(() => caches.match(r)));
});
