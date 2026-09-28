/** Bounded code-only warmup. It never fetches user data or writes storage. */
export interface WarmupTask { key: string; load: () => Promise<unknown> }
export interface WarmupHost {
  afterPaint: (callback: () => void) => () => void;
  later: (callback: () => void, delay: number) => number;
  cancelTimer: (id: number) => void;
  idle?: (callback: () => void) => number;
  cancelIdle?: (id: number) => void;
  canRun: () => boolean;
}
export interface WarmupConditions {
  online: boolean; visible: boolean; saveData?: boolean; effectiveType?: string;
  editing: boolean; sessionOpen: boolean;
}
export function canWarmPages(c: WarmupConditions): boolean {
  return c.online && c.visible && !c.saveData && !c.editing && !c.sessionOpen &&
    !['slow-2g', '2g', '3g'].includes(c.effectiveType || '');
}
const inFlight = new WeakSet<Set<string>>();
export function schedulePageWarmup(tasks: WarmupTask[], attempted: Set<string>, host: WarmupHost): () => void {
  let cancelled = false;
  let timer: number | undefined;
  let idle: number | undefined;
  let index = 0;
  const next = () => {
    if (cancelled || attempted.size >= 2 || inFlight.has(attempted) || !host.canRun()) return;
    while (index < tasks.length && attempted.has(tasks[index].key)) index += 1;
    const task = tasks[index++];
    if (!task) return;
    attempted.add(task.key);
    // A started import cannot be aborted. Never launch the next one after cancellation.
    inFlight.add(attempted);
    void Promise.resolve().then(() => {
      if (!cancelled && host.canRun()) return task.load();
    }).catch(() => undefined).then(() => {
      inFlight.delete(attempted);
      if (!cancelled) queue(700);
    });
  };
  const queue = (delay: number) => {
    timer = host.later(() => {
      timer = undefined;
      if (cancelled || !host.canRun()) return;
      if (host.idle) idle = host.idle(() => { idle = undefined; next(); });
      else next(); // Safari without requestIdleCallback: delayed, sequential best effort.
    }, delay);
  };
  const cancelPaint = host.afterPaint(() => queue(1800));
  return () => {
    cancelled = true;
    cancelPaint();
    if (timer !== undefined) host.cancelTimer(timer);
    if (idle !== undefined) host.cancelIdle?.(idle);
  };
}
const sessions = new Map<string, Set<string>>();
export function warmupAttempts(identity: string): Set<string> {
  if (!sessions.has(identity)) {
    if (sessions.size >= 8) sessions.delete(sessions.keys().next().value!);
    sessions.set(identity, new Set());
  }
  return sessions.get(identity)!;
}
export function warmupTasks(role: string): WarmupTask[] {
  if (role === 'member') return [
    { key: 'calendar', load: () => import('../pages/CalendarPage') },
    { key: 'performances', load: () => import('../pages/StatsPage') },
  ];
  if (role === 'coach' || role === 'owner') return [
    { key: 'users', load: () => import('../pages/MembersPage') },
    { key: 'coaching', load: () => import('../pages/CoachingPage') },
  ];
  return [];
}
export function browserWarmupHost(): WarmupHost {
  return {
    afterPaint(callback) {
      let second: number | undefined;
      const first = requestAnimationFrame(() => { second = requestAnimationFrame(callback); });
      return () => { cancelAnimationFrame(first); if (second !== undefined) cancelAnimationFrame(second); };
    },
    later: (fn, delay) => window.setTimeout(fn, delay),
    cancelTimer: id => window.clearTimeout(id),
    idle: window.requestIdleCallback ? fn => window.requestIdleCallback(fn) : undefined,
    cancelIdle: window.cancelIdleCallback ? id => window.cancelIdleCallback(id) : undefined,
    canRun() {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
      const focused = document.activeElement;
      return canWarmPages({
        online: navigator.onLine, visible: document.visibilityState === 'visible',
        saveData: connection?.saveData, effectiveType: connection?.effectiveType,
        editing: Boolean(document.querySelector('.va-workspace-mode')) ||
          (focused instanceof HTMLElement && (focused.matches('input,textarea,select') || focused.isContentEditable)),
        sessionOpen: Boolean(document.querySelector('.va-workout[open],.va-coaching-session,.va-session-loading')),
      });
    },
  };
}
