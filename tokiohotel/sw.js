// TH Fan Hub : fonctionne hors connexion
const V='thfan-2';
const CORE=['./','index.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('thfan-')&&k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  if(r.mode==='navigate'||u.pathname.endsWith('/index.html')||u.pathname.endsWith('.json')){
    e.respondWith(fetch(r).then(res=>{const cp=res.clone();const key=u.pathname.endsWith('.json')?r:'index.html';if(res.ok)caches.open(V).then(c=>c.put(key,cp));return res;}).catch(()=>caches.match(u.pathname.endsWith('.json')?r:'index.html')));return;}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));}return res;})));
});
