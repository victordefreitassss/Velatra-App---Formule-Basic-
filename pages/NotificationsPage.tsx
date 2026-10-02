import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '../types';
import { categoryLabels, defaultPreferences, safeNotificationDestination, type NotificationV2, type NotificationPreferences, type NotificationDestination } from '../notifications/model';
import { notificationRequest, notificationsChanged, pushStatus, syncPushDevice, disableCurrentPush } from '../notifications/client';
const button = 'min-h-11 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50';
export function NotificationsPage({ user, onOpen }: { user: User; onOpen: (destination: NotificationDestination) => void }) {
  const [items, setItems] = useState<NotificationV2[]>([]), [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'legacy'>('all');
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPreferences), [devices, setDevices] = useState<any[]>([]);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState(pushStatus);
  const requestVersion = useRef(0);
  const refresh = useCallback(async (next?: string) => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: '20', ...(filter === 'unread' ? { unread: 'true' } : {}), ...(filter === 'legacy' ? { legacy: 'true' } : {}), ...(next ? { cursor: next } : {}) });
      const result = await notificationRequest(`/api/notifications?${query}`);
      if (version !== requestVersion.current) return;
      setItems(previous => next ? [...previous, ...result.items] : result.items); setCursor(result.nextCursor); setError('');
    } catch (err) { if (version === requestVersion.current) setError(err instanceof Error ? err.message : 'Chargement impossible.'); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, [filter, user.firebaseUid, user.clubId]);
  useEffect(() => { setItems([]); setCursor(null); void refresh(); }, [refresh]);
  useEffect(() => {
    const update = () => { if (!document.hidden) void refresh(); };
    window.addEventListener('focus', update); navigator.serviceWorker?.addEventListener('message', update);
    return () => { window.removeEventListener('focus', update); navigator.serviceWorker?.removeEventListener('message', update); requestVersion.current++; };
  }, [refresh]);
  useEffect(() => { let active = true; Promise.all([notificationRequest('/api/notifications/preferences'), notificationRequest('/api/notifications/devices')]).then(([preferences, result]) => { if (active) { setPrefs(preferences); setDevices(result.devices); } }).catch(() => {}); return () => { active = false; }; }, [user.firebaseUid, user.clubId]);
  const run = async (task: () => Promise<unknown>) => { if (busy) return; setBusy(true); try { await task(); notificationsChanged(); await refresh(); setError(''); } catch (err) { setError(err instanceof Error ? err.message : 'Cette action a échoué.'); } finally { setBusy(false); setPermission(pushStatus()); } };
  const savePreferences = async (next: NotificationPreferences) => { const saved = await notificationRequest('/api/notifications/preferences', 'PUT', next); setPrefs(saved); };
  const open = (item: NotificationV2) => run(async () => {
    const destination = safeNotificationDestination(item.destination); if (!destination) return;
    await notificationRequest(`/api/notifications/${item.id}/read`, 'POST'); notificationsChanged(); onOpen(destination);
  });
  const pushLabel = permission === 'unavailable' ? 'Indisponibles' : permission === 'denied' ? 'Refusées' : prefs.pushEnabled && devices.some(device => device.enabled) && Notification.permission === 'granted' ? 'Activées' : 'Non configurées';
  return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6" aria-label="Centre de notifications">
    <header><h1 className="text-2xl font-bold text-zinc-950">Notifications</h1><p className="mt-1 text-sm text-zinc-700">Ce qui vient de se produire dans votre espace.</p></header>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}<button className={`${button} ml-3`} onClick={() => void refresh()}>Réessayer</button></div>}
    <section className="rounded-2xl border border-zinc-200 bg-white p-4" aria-label="Préférences de notifications push">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-zinc-950">Notifications push</h2><p className="text-sm text-zinc-700" role="status">{pushLabel}</p></div>
        {permission !== 'unavailable' && permission !== 'denied' && <button className={button} disabled={busy} onClick={() => run(async () => { await syncPushDevice(user.firebaseUid!, true); await savePreferences({ ...prefs, pushEnabled: true }); const result = await notificationRequest('/api/notifications/devices'); setDevices(result.devices); })}>Activer les notifications push</button>}
        {prefs.pushEnabled && <button className={button} disabled={busy} onClick={() => run(async () => { await savePreferences({ ...prefs, pushEnabled: false }); await disableCurrentPush(); const result = await notificationRequest('/api/notifications/devices'); setDevices(result.devices); })}>Désactiver le push</button>}
      </div>
      {permission === 'denied' && <p className="mt-2 text-sm text-zinc-700">Les permissions se modifient dans les réglages du navigateur. Nous ne vous les redemanderons pas.</p>}
      <fieldset className="mt-3 flex flex-wrap gap-3"><legend className="sr-only">Catégories push</legend>{(['MESSAGE', 'PLANNING', 'FOLLOWUP', ...(user.role !== 'member' ? ['SALES'] : [])] as const).map(category => <label key={category} className="flex min-h-11 items-center gap-2 text-sm text-zinc-800"><input type="checkbox" disabled={busy} checked={prefs.categories[category]} onChange={event => { const checked = event.target.checked; void run(() => savePreferences({ ...prefs, categories: { ...prefs.categories, [category]: checked, ...(category === 'FOLLOWUP' ? { COACHING: checked } : {}) } })); }} />{category === 'FOLLOWUP' ? 'Coaching / suivi' : categoryLabels[category]}</label>)}</fieldset>
      {devices.length > 0 && <details className="mt-2 text-sm text-zinc-700"><summary className="min-h-11 cursor-pointer py-3">Mes appareils ({devices.filter(device => device.enabled).length} actifs)</summary><ul>{devices.map((device, index) => <li key={device.deviceId} className="flex items-center justify-between gap-2 border-t border-zinc-100 py-2"><span>Appareil {index + 1} · {device.platform} · {device.enabled ? 'Actif' : 'Désactivé'}</span>{device.enabled && <button className={button} disabled={busy} onClick={() => run(async () => { await notificationRequest(`/api/notifications/devices/${device.deviceId}`, 'DELETE'); const result = await notificationRequest('/api/notifications/devices'); setDevices(result.devices); })}>Désactiver</button>}</li>)}</ul></details>}
    </section>
    <div className="flex flex-wrap items-center justify-between gap-3"><div role="group" aria-label="Filtrer les notifications" className="flex gap-2">{[['all', 'Toutes'], ['unread', 'Non lues'], ['legacy', 'Anciennes']] .map(([value, label]) => <button key={value} className={button} aria-pressed={filter === value} onClick={() => setFilter(value as typeof filter)}>{label}</button>)}</div>{filter !== 'legacy' && <button className={button} disabled={busy || loading} onClick={() => run(() => notificationRequest('/api/notifications/read-all', 'POST'))}>Tout marquer comme lu</button>}</div>
    {loading && <p role="status" className="text-sm text-zinc-700">Chargement…</p>}
    {!loading && !items.length && <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-700">Aucune notification {filter === 'unread' ? 'non lue' : 'pour le moment'}.</p>}
    <ul className="space-y-3">{items.map(item => <li key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4"><div className="flex flex-wrap justify-between gap-2 text-xs text-zinc-600"><span>{categoryLabels[item.category] || 'Historique'} · <strong>{item.readAt ? 'Lue' : 'Non lue'}</strong></span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('fr-FR')}</time></div><h2 className="mt-2 font-semibold text-zinc-950">{item.title}</h2><p className="mt-1 text-sm text-zinc-700">{item.body}</p>{filter !== 'legacy' && <div className="mt-3 flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={() => void open(item)}>Ouvrir</button><button className={button} disabled={busy} onClick={() => run(() => notificationRequest(`/api/notifications/${item.id}/${item.readAt ? 'unread' : 'read'}`, 'POST'))}>{item.readAt ? 'Marquer comme non lu' : 'Marquer comme lu'}</button></div>}</li>)}</ul>
    {cursor && <button className={button} disabled={busy || loading} onClick={() => void refresh(cursor)}>Charger 20 suivantes</button>}
  </main>;
}
