// Agenda Toilettage : fonctionnement hors connexion
const V='tg-6';
const CORE=['./','index.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('tg-')&&k!==V&&k!=='tg-lib').map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  if(r.mode==='navigate'||u.pathname.endsWith('/index.html')){
    e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put('index.html',cp));return res;}).catch(()=>caches.match('index.html')));return;}
  const store=u.pathname.includes('/lib/')?'tg-lib':V;
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(store).then(c=>c.put(r,cp));}return res;})));
});
