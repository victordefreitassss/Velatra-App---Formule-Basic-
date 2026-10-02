import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getMessagingClient, auth } from '../firebase';
export const notificationsChanged = () => window.dispatchEvent(new Event('velatra-notifications-changed'));
export async function notificationRequest(path: string, method = 'GET', body?: unknown) {
  const response = await apiFetch(path, { method, ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'Les notifications sont indisponibles.');
  return value;
}
export function useNotificationBadge(uid?: string, clubId?: string) {
  const [count, setCount] = useState(0);
  const refresh = useCallback(async () => {
    if (!uid || !clubId) { setCount(0); return; }
    const result = await notificationRequest('/api/notifications/unread-count');
    return Math.max(0, Number(result.count) || 0);
  }, [uid, clubId]);
  useEffect(() => {
    let active = true;
    setCount(0);
    const update = () => { if (!document.hidden) void refresh().then(value => { if (active) setCount(value || 0); }).catch(() => { if (active) setCount(0); }); };
    update();
    const timer = setInterval(update, 30000);
    window.addEventListener('focus', update);
    window.addEventListener('velatra-notifications-changed', update);
    const worker = () => update();
    navigator.serviceWorker?.addEventListener('message', worker);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', update); window.removeEventListener('velatra-notifications-changed', update); navigator.serviceWorker?.removeEventListener('message', worker); };
  }, [refresh]);
  return count;
}
const optedKey = 'velatra-push-opted-uid-v2';
const deviceKey = 'velatra-push-device-v2';
export function pushStatus() {
  if (!window.isSecureContext || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'unavailable';
  return Notification.permission === 'denied' ? 'denied' : 'unconfigured';
}
function deviceId() {
  let id = localStorage.getItem(deviceKey);
  if (!id || !/^[a-zA-Z0-9_-]{16,128}$/.test(id)) { id = crypto.randomUUID(); localStorage.setItem(deviceKey, id); }
  return id;
}
export async function syncPushDevice(uid: string, explicit = false) {
  if (pushStatus() === 'unavailable') throw new Error('Les notifications push sont indisponibles sur cet appareil.');
  if (Notification.permission === 'denied') throw new Error('Notifications refusées. Modifiez les permissions dans votre navigateur.');
  if (!explicit && (localStorage.getItem(optedKey) !== uid || Notification.permission !== 'granted')) return;
  if (explicit && Notification.permission !== 'granted' && await Notification.requestPermission() !== 'granted') throw new Error('Notifications refusées.');
  const sdk = await getMessagingClient();
  if (!sdk || !sdk.vapidKey) throw new Error('Le service push est indisponible.');
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const token = await sdk.getToken(sdk.messaging, { vapidKey: sdk.vapidKey, serviceWorkerRegistration: registration });
  if (auth.currentUser?.uid !== uid) throw new Error('Votre session a changé.');
  if (!token) throw new Error('L’appareil ne peut pas être enregistré.');
  await notificationRequest('/api/notifications/devices', 'POST', { deviceId: deviceId(), token, platform: 'web' });
  localStorage.setItem(optedKey, uid);
}
export async function disableCurrentPush() {
  localStorage.removeItem(optedKey);
  const id = localStorage.getItem(deviceKey);
  if (id) await notificationRequest(`/api/notifications/devices/${encodeURIComponent(id)}`, 'DELETE');
  const sdk = await getMessagingClient();
  if (sdk) await sdk.deleteToken(sdk.messaging);
}
export function usePushDeviceSync(uid?: string) {
  useEffect(() => {
    if (!uid || localStorage.getItem(optedKey) !== uid || pushStatus() !== 'unconfigured' || Notification.permission !== 'granted') return;
    let active = true;
    const sync = () => void notificationRequest('/api/notifications/preferences').then(prefs => { if (active && prefs.pushEnabled) return syncPushDevice(uid); }).catch(() => {});
    sync(); window.addEventListener('focus', sync);
    return () => { active = false; window.removeEventListener('focus', sync); };
  }, [uid]);
}
