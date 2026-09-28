import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canWarmPages, schedulePageWarmup, warmupAttempts, warmupTasks, type WarmupHost } from '../components/pageWarmup';

function clock(withIdle = true) {
  let id = 0;
  let paint: (() => void) | undefined;
  const timers = new Map<number, { fn: () => void; delay: number }>();
  const idle = new Map<number, () => void>();
  const state = { allowed: true };
  const host: WarmupHost = {
    afterPaint(fn) { paint = fn; return () => { paint = undefined; }; },
    later(fn, delay) { const key = ++id; timers.set(key, {fn, delay}); return key; },
    cancelTimer(key) { timers.delete(key); },
    canRun: () => state.allowed,
    ...(withIdle ? { idle(fn: () => void) { const key = ++id; idle.set(key, fn); return key; }, cancelIdle(key: number) { idle.delete(key); } } : {}),
  };
  return {
    host, state, timers, idle,
    paint() { const fn = paint; paint = undefined; fn?.(); },
    tick() { const pair = timers.entries().next().value; if (!pair) return; timers.delete(pair[0]); pair[1].fn(); },
    idleTick() { const pair = idle.entries().next().value; if (!pair) return; idle.delete(pair[0]); pair[1](); },
  };
}
const flush = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); };
const tasks = (events: string[]) => ['one','two','three'].map(key => ({key, load: async () => { events.push(key); }}));

test('warmup rejects data-saving, slow networks, hidden/offline pages and editing/session contexts', () => {
  const ready = { online: true, visible: true, editing: false, sessionOpen: false };
  assert.equal(canWarmPages(ready), true);
  for (const overrides of [{online:false},{visible:false},{saveData:true},{editing:true},{sessionOpen:true},...['slow-2g','2g','3g'].map(effectiveType => ({effectiveType}))]) {
    assert.equal(canWarmPages({...ready,...overrides}), false);
  }
});
test('warmup waits for painted content, delay and idle before importing', async () => {
  const c = clock(), events: string[] = [];
  const cancel = schedulePageWarmup(tasks(events), new Set(), c.host);
  assert.equal(c.timers.size, 0);
  c.paint(); assert.equal([...c.timers.values()][0].delay, 1800);
  c.tick(); assert.deepEqual(events, []);
  c.idleTick(); await flush(); assert.deepEqual(events, ['one']); cancel();
});
test('at most two speculative modules per session, sequentially even across remounts', async () => {
  const a = clock(), b = clock(), attempted = new Set<string>(), events: string[] = [];
  let finish!: () => void;
  const cancelA = schedulePageWarmup([{ key:'one', load: () => { events.push('one'); return new Promise<void>(r => { finish = r; }); } }], attempted, a.host);
  a.paint(); a.tick(); a.idleTick(); await flush();
  const cancelB = schedulePageWarmup(tasks(events), attempted, b.host);
  b.paint(); b.tick(); b.idleTick(); await flush();
  assert.deepEqual(events, ['one']);
  cancelA(); finish(); await flush(); cancelB();
  const c = clock(); const cancelC = schedulePageWarmup(tasks(events), attempted, c.host);
  c.paint(); c.tick(); c.idleTick(); await flush(); c.tick(); c.idleTick(); await flush();
  assert.deepEqual(events, ['one','two']); assert.equal(attempted.size, 2); cancelC();
});
test('pending imports do not start the next task until completion', async () => {
  const c=clock(), events: string[]=[]; let finish!:()=>void;
  const cancel=schedulePageWarmup([{key:'one',load:()=>{events.push('one');return new Promise<void>(r=>{finish=r;});}},...tasks(events).slice(1)],new Set(),c.host);
  c.paint();c.tick();c.idleTick();await flush(); assert.equal(c.timers.size,0);
  finish();await flush();assert.equal([...c.timers.values()][0].delay,700);
  c.tick();c.idleTick();await flush();assert.deepEqual(events,['one','two']);cancel();
});
test('cancellation cleans queued callbacks before an import', async () => {
  for(const stage of ['paint','timer','idle']) {
    const c=clock(), events:string[]=[];const cancel=schedulePageWarmup(tasks(events),new Set(),c.host);
    if(stage!=='paint')c.paint();if(stage==='idle')c.tick();cancel();c.paint();c.tick();c.idleTick();await flush();assert.deepEqual(events,[]);
  }
});
test('cancellation during an import prevents following imports', async () => {
  const c=clock(),events:string[]=[];let finish!:()=>void;
  const cancel=schedulePageWarmup([{key:'one',load:()=>{events.push('one');return new Promise<void>(r=>{finish=r;});}},...tasks(events).slice(1)],new Set(),c.host);
  c.paint();c.tick();c.idleTick();await flush();cancel();finish();await flush();c.tick();c.idleTick();await flush();assert.deepEqual(events,['one']);
});
test('a changed environment at idle cancels a pending speculative import', async () => {
  const c=clock(),events:string[]=[];const cancel=schedulePageWarmup(tasks(events),new Set(),c.host);
  c.paint();c.tick();c.state.allowed=false;c.idleTick();await flush();assert.deepEqual(events,[]);cancel();
});
test('browsers without idle callbacks still use a delayed, bounded sequence', async () => {
  const c=clock(false),events:string[]=[];const cancel=schedulePageWarmup(tasks(events),new Set(),c.host);
  c.paint();assert.deepEqual(events,[]);c.tick();await flush();c.tick();await flush();c.tick();await flush();assert.deepEqual(events,['one','two']);cancel();
});
test('rejected speculative imports are caught and never cause a retry flood', async () => {
  const c=clock(),events:string[]=[];const cancel=schedulePageWarmup([{key:'bad',load:async()=>{throw Error('fixture');}},...tasks(events)],new Set(),c.host);
  c.paint();c.tick();c.idleTick();await flush();c.tick();c.idleTick();await flush();c.tick();c.idleTick();await flush();assert.deepEqual(events,['one']);cancel();
});
test('roles have two appropriate destinations and the same identity shares its budget', () => {
  assert.deepEqual(warmupTasks('member').map(t=>t.key),['calendar','performances']);
  for(const role of ['coach','owner'])assert.deepEqual(warmupTasks(role).map(t=>t.key),['users','coaching']);
  assert.deepEqual(warmupTasks('superadmin'),[]);
  assert.strictEqual(warmupAttempts('fixture-a'),warmupAttempts('fixture-a'));
  assert.notStrictEqual(warmupAttempts('fixture-a'),warmupAttempts('fixture-b'));
});
