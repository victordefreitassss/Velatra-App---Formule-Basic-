import * as Sentry from '@sentry/react';
import type { Event, ErrorEvent, EventHint } from '@sentry/react';

const roles = new Set(['superadmin', 'owner', 'manager', 'coach', 'member']);
const errorTypes = new Set(['Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'URIError', 'EvalError', 'AggregateError']);
let role = 'anonymous';
let accountType = 'unknown';

export function setMonitoringContext(nextRole?: string, nextAccountType?: string) {
  role = nextRole && roles.has(nextRole) ? nextRole : 'anonymous';
  accountType = nextAccountType === 'solo' || nextAccountType === 'studio' ? nextAccountType : 'unknown';
}

// Rebuild the payload from a small allowlist: error messages, URLs, component
// stacks, request data, arbitrary tags and application state can contain PII.
export function sanitizeErrorEvent(event: Event): ErrorEvent | null {
  if (event.type || !event.exception?.values?.length) return null;
  return {
    type: undefined,
    event_id: /^[a-f0-9]{32}$/.test(event.event_id ?? '') ? event.event_id : undefined,
    timestamp: event.timestamp,
    platform: 'javascript',
    level: 'error',
    exception: { values: event.exception.values.map(exception => ({
      type: errorTypes.has(exception.type ?? '') ? exception.type : 'Error',
      value: 'Frontend exception (message redacted)',
      mechanism: { type: 'generic', handled: exception.mechanism?.handled !== false },
      stacktrace: { frames: (exception.stacktrace?.frames ?? []).map(frame => {
        // Only bundled static JS asset paths are retained, never origin/query/hash.
        const asset = frame.filename?.match(/(?:^|\/)assets\/([A-Za-z0-9_-]+\.js)(?:[?#].*)?$/);
        return {
          filename: asset ? `/assets/${asset[1]}` : undefined,
          lineno: frame.lineno,
          colno: frame.colno,
        };
      }) },
    })) },
    tags: { role, accountType },
  };
}

export function createMonitoringOptions(production: boolean, dsn?: string, commit?: string) {
  const environment = production ? 'production' : 'development';
  const appVersion = /^[a-f0-9]{40}$/.test(commit ?? '') ? commit! : 'unversioned';
  const seenErrors = new WeakSet<object>();
  return {
    dsn,
    environment,
    enabled: production && !!dsn,
    tracesSampleRate: 0.1,
    traceLifecycle: 'static' as const,
    defaultIntegrations: false as const,
    integrations: [Sentry.globalHandlersIntegration()],
    // SDK v11 replaces sendDefaultPii with explicit dataCollection controls.
    dataCollection: {
      userInfo: false, cookies: false, httpHeaders: false, httpBodies: [],
      urlQueryParams: false, databaseQueryData: false, queues: false,
      stackFrameVariables: false, frameContextLines: 0,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
    },
    beforeSendLog: () => null,
    beforeSendMetric: () => null,
    sendClientReports: false,
    beforeSend(event: ErrorEvent, hint: EventHint) {
      hint.attachments = [];
      const original = hint.originalException;
      if (original && typeof original === 'object') {
        if (seenErrors.has(original)) return null;
        seenErrors.add(original);
      }
      const safeEvent = sanitizeErrorEvent(event);
      if (!safeEvent) return null;
      return { ...safeEvent, environment, release: appVersion, tags: { ...safeEvent.tags, appVersion, environment } };
    },
    // No tracing integration in V1; do not forward manually created transactions.
    beforeSendTransaction: () => null,
    ignoreSpans: [/.*/],
  } satisfies Parameters<typeof Sentry.init>[0];
}

export function initializeMonitoring(production: boolean, dsn?: string, commit?: string) {
  const options = createMonitoringOptions(production, dsn, commit);
  if (!options.enabled) return;
  // A malformed deployment setting must never stop React from mounting.
  try { Sentry.init(options); } catch { /* Monitoring is optional. */ }
}

export function captureReactError(error: Error) {
  try {
    if (Sentry.getClient()?.getOptions().enabled) Sentry.captureException(error);
  } catch { /* Keep the existing React fallback available even if monitoring fails. */ }
}
