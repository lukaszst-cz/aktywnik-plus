const CACHE='aktywnik-plus-v44';
const ASSETS=[
  './',
  './index.html',
  './app.html',
  './konto.html',
  './paper.html',
  './paper-uniwersalny.html',
  './paper.js',
  './pobierz.html',
  './prywatnosc.html',
  './o-projekcie.html',
  './faq.html',
  './dla-nauczyciela.html',
  './teacher.js',
  './404.html',
  './landing.css',
  './styles.css',
  './app.js',
  './i18n.js',
  './auth-config.js',
  './auth.js',
  './sync-client.js',
  './family-sync-client.js',
  './install.js',
  './share.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys=>Promise.all(
        keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))
      ))
    ])
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin===self.location.origin && url.pathname.startsWith('/api/')){
    event.respondWith(fetch(event.request));
    return;
  }

  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
          return response;
        })
        .catch(async()=>{
          return (await caches.match(event.request))
            || (await caches.match('./app.html'))
            || (await caches.match('./index.html'));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached=>{
        if(cached) return cached;
        return fetch(event.request).then(response=>{
          if(response && response.ok && response.type==='basic'){
            const copy=response.clone();
            caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
          }
          return response;
        });
      })
  );
});
