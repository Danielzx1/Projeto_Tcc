// Service Worker Básico (Pass-through) para PWA
self.addEventListener('install', (event) => {
    // Força o SW a se ativar imediatamente
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Assume o controle imediatamente
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Apenas repassa a requisição sem travar no cache antigo
    event.respondWith(fetch(event.request));
});