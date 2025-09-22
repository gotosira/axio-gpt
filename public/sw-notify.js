/* Minimal service worker for notification display */
self.addEventListener('install', (e) => { self.skipWaiting && self.skipWaiting(); });
self.addEventListener('activate', (e) => { self.clients && self.clients.claim && self.clients.claim(); });

// Allow notificationclick to focus the app
self.addEventListener('notificationclick', function(event) {
  const n = event.notification; n.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});


