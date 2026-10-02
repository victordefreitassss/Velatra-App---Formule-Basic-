import type { Event, ErrorEvent } from '@sentry/react';
import type { TransactionEvent, SpanJSON } from '@sentry/core';

const routes = new Set(['/', '/login', '/register', '/dashboard', '/produit', '/fonctionnalites', '/tarifs', '/solutions', '/solutions/coach-sportif', '/solutions/studio', '/centre-d-aide', '/blog', '/a-propos', '/contact', '/mentions-legales', '/cgv', '/confidentialite', '/logiciel-coach-sportif', '/logiciel-personal-trainer', '/logiciel-studio-coaching', '/crm-coach-sportif', '/logiciel-suivi-client-coach', '/logiciel-programme-entrainement']);
const errorTypes = new Set(['Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'URIError', 'EvalError', 'AggregateError']);
const hex = (value: unknown, length: number) => typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value) ? value : undefined;
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;

export function safeRoute(input?: string): string {
  const pathname = typeof input === 'string' ? input.split(/[?#]/)[0] : '';
  if (routes.has(pathname)) return pathname;
  if (pathname.startsWith('/blog/')) return '/blog/:slug';
  if (pathname.startsWith('/dashboard/')) return '/dashboard/*';
  return '/other';
}

export function safeAsset(input?: string): string | undefined {
  const match = typeof input === 'string' && input.match(/(?:^|\/)assets\/([A-Za-z0-9_-]+\.js)(?:[?#].*)?$/);
  return match ? `/assets/${match[1]}` : undefined;
}

export function safeComponentStack(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const frames = [...input.matchAll(/(?:^|\/)assets\/([A-Za-z0-9_-]+\.js):(\d+):(\d+)/g)].slice(0, 30);
  return frames.length ? frames.map(match => `at /assets/${match[1]}:${match[2]}:${match[3]}`).join('\n') : undefined;
}

export function safeBrowser(userAgent: string) {
  for (const [name, pattern] of [['Edge', /Edg\/(\d+)/], ['Opera', /OPR\/(\d+)/], ['Firefox', /Firefox\/(\d+)/], ['Chrome', /(?:Chrome|CriOS)\/(\d+)/], ['Safari', /Version\/(\d+).*Safari\//]] as const) {
    const match = userAgent.match(pattern);
    if (match) return { name, version: match[1] };
  }
  return { name: 'Other' };
}

export function currentDiagnostics() {
  return {
    route: safeRoute(typeof window === 'undefined' ? undefined : window.location.pathname),
    browser: safeBrowser(typeof navigator === 'undefined' ? '' : navigator.userAgent),
  };
}

function safeTrace(event: Event) {
  const trace = event.contexts?.trace;
  const trace_id = hex(trace?.trace_id, 32), span_id = hex(trace?.span_id, 16);
  return trace_id && span_id ? { trace_id, span_id, parent_span_id: hex(trace?.parent_span_id, 16), op: trace?.op === 'navigation' ? 'navigation' : trace?.op === 'pageload' ? 'pageload' : undefined } : undefined;
}

// Rebuild from an allowlist; never forward free text, HTTP data or user context.
export function sanitizeErrorEvent(event: Event, diagnostics: ReturnType<typeof currentDiagnostics> = { route: '/other', browser: { name: 'Other' } }): ErrorEvent | null {
  if (event.type || !event.exception?.values?.length) return null;
  const componentStack = safeComponentStack(event.contexts?.react?.componentStack);
  const trace = safeTrace(event);
  const images = event.debug_meta?.images?.filter(image => image.type === 'sourcemap' && safeAsset(image.code_file) && /^[a-f0-9-]{36}$/.test(image.debug_id)).map(image => image.type === 'sourcemap' ? { type: 'sourcemap' as const, code_file: safeAsset(image.code_file)!, debug_id: image.debug_id } : undefined).filter(Boolean);
  return {
    type: undefined, event_id: hex(event.event_id, 32), timestamp: number(event.timestamp),
    platform: 'javascript', level: 'error', transaction: diagnostics.route,
    contexts: { browser: diagnostics.browser, ...(trace ? { trace } : {}), ...(componentStack ? { react: { componentStack } } : {}) },
    ...(images?.length ? { debug_meta: { images } } : {}),
    exception: { values: event.exception.values.slice(0, 8).map(exception => ({
      type: errorTypes.has(exception.type ?? '') ? exception.type : 'Error',
      value: 'Frontend exception (message redacted)',
      mechanism: { type: 'generic', handled: exception.mechanism?.handled !== false },
      stacktrace: { frames: (exception.stacktrace?.frames ?? []).slice(-50).map(frame => ({
        filename: safeAsset(frame.filename), lineno: number(frame.lineno), colno: number(frame.colno),
        in_app: typeof frame.in_app === 'boolean' ? frame.in_app : undefined,
      })) },
    })) },
    tags: { route: diagnostics.route },
  };
}

export function sanitizeSpan(span: SpanJSON): SpanJSON {
  return { trace_id: hex(span.trace_id, 32)!, span_id: hex(span.span_id, 16)!, parent_span_id: hex(span.parent_span_id, 16), start_timestamp: number(span.start_timestamp)!, timestamp: number(span.timestamp), op: span.op === 'navigation' ? 'navigation' : 'pageload', description: safeRoute(span.description), status: 'unknown', data: {} };
}

export function sanitizeTransactionEvent(event: TransactionEvent, browser: ReturnType<typeof safeBrowser> = { name: 'Other' }): TransactionEvent | null {
  const trace = safeTrace(event);
  if (!trace || !trace.op) return null;
  const route = safeRoute(event.transaction);
  return {
    type: 'transaction', event_id: hex(event.event_id, 32), start_timestamp: number(event.start_timestamp), timestamp: number(event.timestamp),
    platform: 'javascript', transaction: route, transaction_info: { source: 'route' },
    contexts: { trace, browser }, spans: [], tags: { route },
  };
}
