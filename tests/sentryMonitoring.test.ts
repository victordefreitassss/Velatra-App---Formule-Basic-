import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import * as Sentry from '@sentry/react';
import type { Event, ErrorEvent } from '@sentry/react';
import type { Envelope } from '@sentry/core';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { captureReactError, createMonitoringOptions, initializeMonitoring, sanitizeErrorEvent, setMonitoringContext } from '../monitoring/sentry';

test('monitoring is disabled without DSN and in development, with no SDK client or transport', () => {
  assert.equal(createMonitoringOptions(true).enabled, false);
  assert.equal(createMonitoringOptions(false, 'configured').enabled, false);
  initializeMonitoring(true);
  initializeMonitoring(false, 'configured');
  captureReactError(new Error('private message'));
  assert.equal(Sentry.getClient(), undefined);
});

test('privacy allowlist strips arbitrary error, user, health, payment, URL and attachment data', () => {
  const secret = 'sensitive-canary';
  const event: Event = {
    event_id: 'a'.repeat(32), timestamp: 10,
    message: secret, user: { email: secret, ip_address: secret },
    request: { url: secret, headers: { authorization: secret }, data: secret },
    extra: { weight: secret, injuries: secret, checkin: secret, stripe: secret },
    contexts: { app: { message: secret } }, breadcrumbs: [{ message: secret }],
    tags: { role: secret, email: secret }, transaction: secret,
    exception: { values: [{ type: secret, value: secret, mechanism: { type: secret, data: { secret } },
      stacktrace: { frames: [{ filename: `https://example.invalid/assets/index-ABC123.js?email=${secret}`, lineno: 2, colno: 3, function: secret, vars: { secret }, context_line: secret }, { filename: `/users/${secret}`, lineno: 4 }] } }] },
  };
  setMonitoringContext('manager', 'studio');
  const result = sanitizeErrorEvent(event)!;
  assert.ok(!JSON.stringify(result).includes(secret));
  assert.deepEqual(result.tags, { role: 'manager', accountType: 'studio' });
  assert.equal(result.exception!.values![0].stacktrace!.frames![0].filename, '/assets/index-ABC123.js');
  assert.equal(result.exception!.values![0].stacktrace!.frames![1].filename, undefined);
  assert.equal(result.exception!.values![0].type, 'Error');
  assert.equal(sanitizeErrorEvent({ message: secret }), null);
  assert.equal(sanitizeErrorEvent({ ...event, type: 'transaction' }), null);
  setMonitoringContext(secret, secret);
  assert.deepEqual(sanitizeErrorEvent(event)!.tags, { role: 'anonymous', accountType: 'unknown' });
  setMonitoringContext('owner', 'solo');
  setMonitoringContext();
  assert.deepEqual(sanitizeErrorEvent(event)!.tags, { role: 'anonymous', accountType: 'unknown' });
});

test('V1 captures only errors, removes attachments and deduplicates the original exception', () => {
  const options = createMonitoringOptions(true, undefined, 'b'.repeat(40));
  assert.equal(options.tracesSampleRate, 0.1);
  assert.equal(options.defaultIntegrations, false);
  assert.deepEqual(options.integrations.map(integration => integration.name), ['GlobalHandlers']);
  assert.equal(options.beforeSendLog(), null);
  assert.equal(options.beforeSendMetric(), null);
  assert.equal(options.dataCollection.userInfo, false);
  assert.equal(options.beforeSendTransaction(), null);
  assert.ok(options.ignoreSpans[0].test('anything'));
  const error = new Error('private');
  const event: ErrorEvent = { type: undefined, exception: { values: [{ type: 'TypeError', value: error.message }] } };
  const hint = { originalException: error, attachments: [{ filename: 'private.txt', data: 'private' }] };
  const result = options.beforeSend(event, hint)!;
  assert.deepEqual(hint.attachments, []);
  assert.equal(result.release, 'b'.repeat(40));
  assert.equal(result.environment, 'production');
  assert.equal(options.beforeSend(event, hint), null);
  assert.ok(options.beforeSend(event, { originalException: new Error('private') }));
  assert.equal(createMonitoringOptions(true, undefined, 'private').beforeSend(event, {}).release, 'unversioned');
});

test('real SDK transport receives one redacted React exception and no session/log/replay payload', async () => {
  const envelopes: Envelope[] = [];
  // Synthetic runtime DSN for an in-memory transport; no credential or network call.
  const fixtureUrl = new URL('https://monitoring.invalid/1');
  fixtureUrl.username = randomBytes(16).toString('hex');
  Sentry.init({ ...createMonitoringOptions(true, fixtureUrl.href),
    transport: () => ({ send: async envelope => { envelopes.push(envelope); return { statusCode: 200 }; }, flush: async () => true }),
  });
  try {
    Sentry.setUser({ email: 'private-canary' });
    Sentry.setExtra('stripe', 'private-canary');
    Sentry.addBreadcrumb({ message: 'private-canary' });
    Sentry.logger.error('private-canary');
    const error = new TypeError('private-canary');
    const boundary = new ErrorBoundary({});
    const originalConsoleError = console.error;
    console.error = () => {};
    try { boundary.componentDidCatch(error, { componentStack: 'private-canary' }); }
    finally { console.error = originalConsoleError; }
    captureReactError(error);
    assert.equal(await Sentry.flush(2000), true);
    assert.equal(envelopes.length, 1);
    assert.deepEqual(envelopes[0][1].map(item => item[0].type), ['event']);
    assert.ok(!JSON.stringify(envelopes).includes('private-canary'));
    assert.ok(JSON.stringify(envelopes).includes('TypeError'));
    assert.ok(JSON.stringify(envelopes).includes('message redacted'));
  } finally { await Sentry.close(2000); }
});
