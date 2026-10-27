// Guarda o app no aparelho para abrir sem internet. Gerado por scripts/gerar-site.js (não edite à mão).
const CACHE = 'rotina-ecfa93948062';
const FILES = ['./', './index.html', './manifest.webmanifest', './icone-180.png', './icone-512.png'];

// Instala guardando os 5 arquivos de uma vez (tudo ou nada).
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// Apaga as cópias de versões antigas.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('rotina-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Ao abrir o app, espera a internet no máximo este tempo; depois usa a cópia guardada.
const NAV_TIMEOUT_MS = 3000;

// Busca na internet a versão mais nova e atualiza a cópia guardada.
// Sem internet, internet lenta ou servidor com erro: usa a cópia guardada.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const isNav = req.mode === 'navigate';
  const network = fetch(req).then((res) => {
    if (!res.ok) return res;
    const copy = res.clone();
    return caches.open(CACHE).then((c) => c.put(req, copy)).then(() => res);
  });
  // A cópia é atualizada mesmo que a resposta chegue depois da cópia guardada já ter sido mostrada.
  e.waitUntil(network.catch(() => {}));
  const saved = () => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (isNav ? caches.match('./') : undefined));
  const wait = isNav ? new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT_MS)) : new Promise(() => {});
  e.respondWith(
    Promise.race([network.catch(() => null), wait]).then((res) => {
      if (res && res.ok) return res;
      return saved().then((hit) => hit || res || Response.error());
    }),
  );
});
