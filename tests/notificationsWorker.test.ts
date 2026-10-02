import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
function worker(visible = false) {
  const handlers: Record<string, any> = {}, shown: any[] = [], opened: string[] = [], refreshed: any[] = [];
  const clients = visible ? [{ visibilityState: 'visible', focused: true, url: 'https://app.test/dashboard', postMessage: (data: any) => refreshed.push(data), navigate: async (url: string) => opened.push(url), focus: async () => {} }] : [];
  runInNewContext(readFileSync('public/sw.js', 'utf8'), { URL, self: { addEventListener: (name: string, fn: any) => handlers[name] = fn, skipWaiting() {}, location: { origin: 'https://app.test' }, clients: { claim() {}, matchAll: async () => clients, openWindow: async (url: string) => opened.push(url) }, registration: { showNotification: async (title: string, options: any) => shown.push({ title, options }) } } });
  return { shown, opened, refreshed, async push(data: any) { let promise: any; handlers.push({ data: { json: () => ({ data }) }, waitUntil: (p: any) => promise = p }); await promise; }, async click(id: string) { let promise: any; handlers.notificationclick({ notification: { close() {}, data: { notificationId: id } }, waitUntil: (p: any) => promise = p }); await promise; } };
}
it('background worker ignores private payloads and opens only an authenticated same-origin opaque notification link', async () => {
  const instance = worker(), id = 'a'.repeat(64);
  await instance.push({ kind: 'velatra-notification-v2', notificationId: id, title: 'Private name', body: 'Health Stripe private message', url: 'https://foreign.test' });
  assert.equal(instance.shown.length, 1); assert.equal(instance.shown[0].title, 'Velatra');
  assert.equal(instance.shown[0].options.body, 'Une nouvelle notification vous attend dans Velatra.'); assert.ok(!JSON.stringify(instance.shown).includes('Health'));
  await instance.click(id); assert.equal(instance.opened[0], `https://app.test/dashboard?notification=${id}`);
  await instance.click('https://foreign.test'); assert.equal(instance.opened.length, 1);
  await instance.push({ kind: 'velatra-notification-v2', notificationId: 'bad' }); assert.equal(instance.shown.length, 1);
});
it('foreground worker refreshes inbox badge without creating a duplicate browser toast', async () => {
  const instance = worker(true), id = 'b'.repeat(64);
  await instance.push({ kind: 'velatra-notification-v2', notificationId: id });
  assert.equal(instance.shown.length, 0); assert.equal(instance.refreshed.length, 1);
  await instance.click(id); assert.equal(instance.opened[0], `https://app.test/dashboard?notification=${id}`);
});
