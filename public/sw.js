self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
// One PWA worker, data-only FCM. Never display raw message content or payload logs.
self.addEventListener('push', event => {
  let data;
  try { data = event.data?.json()?.data; } catch { return; }
  if (data?.kind !== 'velatra-notification-v2' || !/^[a-f0-9]{64}$/.test(data.notificationId || '')) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows.forEach(client => client.postMessage({ kind: 'velatra-notifications-changed' }));
    if (windows.some(client => client.visibilityState === 'visible' && client.focused)) return;
    await self.registration.showNotification('Velatra', {
      body: 'Une nouvelle notification vous attend dans Velatra.',
      icon: '/brand/icon-192.png', badge: '/brand/icon-192.png',
      tag: data.notificationId, data: { notificationId: data.notificationId },
    });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const id = event.notification.data?.notificationId;
  if (!/^[a-f0-9]{64}$/.test(id || '')) return;
  const url = new URL(`/dashboard?notification=${id}`, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(url); await existing.focus(); }
    else await self.clients.openWindow(url);
  })());
});
