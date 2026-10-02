import * as Sentry from '@sentry/react';
import type { ErrorEvent, EventHint } from '@sentry/react';

import { useEffect } from 'react';
import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';
import { sanitizeErrorEvent, sanitizeTransactionEvent, sanitizeSpan, safeRoute, safeComponentStack, currentDiagnostics } from './privacy';
export { sanitizeErrorEvent } from './privacy';
export { wrapReactRouterRouting } from '@sentry/react';

const roles = new Set(['superadmin', 'owner', 'manager', 'coach', 'member']);
let role = 'anonymous';
let accountType = 'unknown';

export function setMonitoringContext(nextRole?: string, nextAccountType?: string) {
  role = nextRole && roles.has(nextRole) ? nextRole : 'anonymous';
  accountType = role !== 'anonymous' && (nextAccountType === 'solo' || nextAccountType === 'studio') ? nextAccountType : 'unknown';
}

export function createMonitoringOptions(production: boolean, dsn?: string, commit?: string, target: string = production ? 'production' : 'development') {
  const environment = target;
  const appVersion = /^[a-f0-9]{40}$/.test(commit ?? '') ? commit! : undefined;
  const seenErrors = new WeakSet<object>();
  return {
    dsn,
    environment,
    enabled: production && target === 'production' && !!dsn,
    tracesSampleRate: 0.1,
    traceLifecycle: 'static' as const,
    defaultIntegrations: false as const,
    integrations: [Sentry.globalHandlersIntegration(), Sentry.reactRouterBrowserTracingIntegration({
      useEffect, useLocation, useNavigationType, createRoutesFromChildren, matchRoutes,
      traceFetch: false, traceXHR: false, enableHTTPTimings: false,
      enableLongTask: false, enableLongAnimationFrame: false,
      webVitals: { ignore: ['cls', 'inp', 'lcp'], softNavigations: false, bfcacheNavigations: false },
      ignoreResourceSpans: ['resource.script', 'resource.css', 'resource.img', 'resource.other', 'resource.fetch', 'resource.xmlhttprequest', 'resource.link', 'resource.iframe'],
      linkPreviousTrace: 'off',
      beforeStartSpan: options => ({ ...options, name: safeRoute(options.name), attributes: { 'sentry.source': 'route' } }),
    })],
    tracePropagationTargets: [],
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
      const safeEvent = sanitizeErrorEvent(event, currentDiagnostics());
      if (!safeEvent) return null;
      return { ...safeEvent, environment, release: appVersion, tags: { ...safeEvent.tags, role, accountType, ...(appVersion ? { appVersion } : {}), environment } };
    },
    beforeSendTransaction(event) {
      const safeEvent = sanitizeTransactionEvent(event, currentDiagnostics().browser);
      return safeEvent ? { ...safeEvent, environment, release: appVersion, tags: { ...safeEvent.tags, role, accountType, environment } } : null;
    },
    beforeSendSpan: Sentry.withStaticSpan(sanitizeSpan),
    ignoreSpans: [{ op: /^(?!pageload$|navigation$).*/ }],
  } satisfies Parameters<typeof Sentry.init>[0];
}

export function initializeMonitoring(production: boolean, dsn?: string, commit?: string, target?: string) {
  const options = createMonitoringOptions(production, dsn, commit, target);
  if (!options.enabled) return;
  // A malformed deployment setting must never stop React from mounting.
  try { Sentry.init(options); } catch { /* Monitoring is optional. */ }
}

export function captureReactError(error: Error, componentStack?: string | null) {
  try {
    if (Sentry.getClient()?.getOptions().enabled) Sentry.captureException(error, { contexts: { react: { componentStack: safeComponentStack(componentStack) } } });
  } catch { /* Keep the existing React fallback available even if monitoring fails. */ }
}
