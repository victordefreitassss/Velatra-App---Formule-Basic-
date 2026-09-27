import test from 'node:test';
import assert from 'node:assert/strict';
import type { Exercise, ExerciseEntry, Program, SessionLog, User, Performance } from '../types';
import { completionPayload, createWorkoutDraft, draftKey, draftOwner, executionSteps, latestExerciseLog, matchesCurrentProgram, readWorkoutDraft, restAfter, restSeconds, validSet, writeWorkoutDraft, isBodyweightExercise, prepareFollowingSet, updateSetValue, remainingRest, extendRest, comparableLoadGain, formatSet, performanceReference } from '../components/workoutSession.ts';
const user = { id: 7, firebaseUid: 'member-a', clubId: 'club-a' } as User;
const exercise = { id: 1, name: 'Squat', cat: 'Jambes', perfId: 'squat' } as Exercise;
const entry = (extra: Partial<ExerciseEntry> = {}): ExerciseEntry => ({ exId: 1, sets: 3, reps: '8-12', rest: '90', tempo: '', duration: '', notes: '', setGroup: null, setType: 'normal', setName: null, ...extra });
const program = (entries = [entry()]): Program => ({ id: 42, clubId: 'club-a', memberId: 7, name: 'Force', nbDays: 1, currentDayIndex: 0, days: [{ name: 'Séance A', isCoaching: false, exercises: entries }], startDate: '2026-09-27', completedWeeks: [], presetId: null });
const store = () => {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) || null, setItem: (key: string, value: string) => { data.set(key, value); } };
};
const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const log = (completedAt: string, weight: string, extra: Partial<SessionLog> = {}): SessionLog => ({ id: 1, clubId: 'club-a', memberId: 7, date: '2026-09-27', completedAt, dayName: 'Séance A', week: 1, isCoaching: false, exerciseData: {}, exercises: [{ exId: 1, name: 'Squat', sets: [{ weight, reps: '10', duration: '' }] }], ...extra });

test('draft survives recreation with exact cursor, confirmed sets, values, timer and stable request id', () => {
  const storage = store();
  const draft = createWorkoutDraft(program(), user, [], [exercise], 1000, id);
  draft.values['0:0'] = { weight: '7,5', reps: '10', duration: '' };
  draft.confirmed = ['0:0']; draft.cursor = 1; draft.restUntil = 91000;
  assert.equal(writeWorkoutDraft(draft, storage), true);
  const restored = readWorkoutDraft(user, storage)!;
  assert.deepEqual(restored, draft);
  assert.equal(restored.requestId, id);
});

test('local recovery is isolated by member and space, and rejects corrupt data', () => {
  const storage = store(), draft = createWorkoutDraft(program(), user, [], [exercise], 1000, id);
  writeWorkoutDraft(draft, storage);
  assert.equal(readWorkoutDraft({ ...user, firebaseUid: 'member-b' }, storage), null);
  assert.equal(readWorkoutDraft({ ...user, clubId: 'club-b' }, storage), null);
  storage.setItem(draftKey(draftOwner(user)), '{bad json');
  assert.equal(readWorkoutDraft(user, storage), null);
  storage.setItem(draftKey(draftOwner(user)), JSON.stringify({ ...draft, program: { ...draft.program, memberId: 999 } }));
  assert.equal(readWorkoutDraft(user, storage), null);
  assert.equal(writeWorkoutDraft(draft, { setItem: () => { throw new Error('Quota exceeded'); } }), false);
});

test('detects an edited, advanced or removed program without discarding the draft', () => {
  const current = program(), draft = createWorkoutDraft(current, user, [], [exercise], 1000, id);
  assert.equal(matchesCurrentProgram(draft, [current]), true);
  assert.equal(matchesCurrentProgram(draft, [{ ...current, currentDayIndex: 1 }]), false);
  assert.equal(matchesCurrentProgram(draft, [program([entry({ sets: 4 })])]), false);
  assert.equal(matchesCurrentProgram(draft, []), false);
  assert.equal(draft.program.currentDayIndex, 0);
});

test('preserves prescription and proposes only actual historical or single numeric values', () => {
  const empty = createWorkoutDraft(program(), user, [], [exercise], 1000, id);
  assert.equal(empty.values['0:0'].reps, '');
  assert.equal(empty.program.days[0].exercises[0].reps, '8-12');
  const remembered = createWorkoutDraft(program(), user, [log('2026-09-27T09:00:00Z', '20'), log('2026-09-27T11:00:00Z', '25')], [exercise], 1000, id);
  assert.equal(remembered.values['0:0'].weight, '25');
  assert.deepEqual(remembered.confirmed, []);
  assert.equal(latestExerciseLog([log('2026-09-27T12:00:00Z', '100', { memberId: 8 }), log('2026-09-27T11:00:00Z', '25')], user, 1)?.exercises?.[0].sets[0].weight, '25');
});

test('validation accepts zero external load and French decimals but rejects ranges, negatives and blank values', () => {
  assert.equal(validSet({ weight: '0', reps: '12', duration: '' }, false), true);
  assert.equal(validSet({ weight: '7,5', reps: '9', duration: '' }, false), true);
  for (const value of [{weight:'',reps:'10'}, {weight:'-1',reps:'10'}, {weight:'20',reps:'8-12'}, {weight:'20',reps:'0'}, {weight:'2001',reps:'5'}]) assert.equal(validSet({ ...value, duration:'' }, false), false);
  assert.equal(validSet({ weight:'', reps:'', duration:'10 min' }, true), true);
  assert.equal(validSet({ weight:'', reps:'', duration:'500 m' }, true), true);
  assert.equal(validSet({ weight:'', reps:'', duration:'abc' }, true), false);
});

test('supersets alternate exercises before rest, while ordinary and drop sets retain their sequence', () => {
  const day = program([entry({sets:2,setGroup:1,setType:'superset'}), entry({exId:2,sets:2,setGroup:1,setType:'superset'})]).days[0];
  const steps = executionSteps(day);
  assert.deepEqual(steps, [{exercise:0,set:0},{exercise:1,set:0},{exercise:0,set:1},{exercise:1,set:1}]);
  assert.equal(restAfter(day, steps, 0), 0);
  assert.equal(restAfter(day, steps, 1), 90);
  assert.equal(restAfter(day, steps, 3), 0);
  const drops = program([entry({setType:'dropset'})]).days[0];
  assert.equal(restAfter(drops, executionSteps(drops), 0), 0);
  assert.equal(restSeconds('1 min 30 s'), 90);
  assert.equal(restSeconds('01:30'), 90);
  assert.equal(restSeconds('1,5 min'), 90);
  assert.equal(restSeconds('libre'), 0);
});

test('completion reuses an uncertain request exactly after reload and produces canonical series', () => {
  const draft = createWorkoutDraft(program([entry({sets:1})]), user, [], [exercise], 1000, id);
  draft.values['0:0'] = {weight:'7,5',reps:'10',duration:''}; draft.confirmed=['0:0'];
  const payload = completionPayload(draft, user, [exercise], 61000);
  assert.equal(payload.log.duration, 60);
  assert.equal(payload.log.exercises?.[0].sets[0].weight, '7.5');
  assert.equal(payload.performances[0].weight, 7.5);
  const storage=store(); writeWorkoutDraft({...draft,status:'pending',payload},storage);
  assert.deepEqual(completionPayload(readWorkoutDraft(user,storage)!,user,[exercise],999999),payload);
});

test('bodyweight measurements with a tracked exercise remain in performances with zero external load', () => {
  const draft = createWorkoutDraft(program([entry({sets:1})]), user, [], [exercise], 1000, id);
  draft.values['0:0']={weight:'0',reps:'15',duration:''};
  assert.deepEqual(completionPayload(draft,user,[exercise]).performances,[{exId:'squat',weight:0,reps:15}]);
});

test('cardio clock accepts seconds and rejects invalid clocks', () => {
  assert.equal(validSet({ weight: '', reps: '', duration: '00:30' }, true), true);
  assert.equal(validSet({ weight: '', reps: '', duration: '00:00' }, true), false);
  assert.equal(validSet({ weight: '', reps: '', duration: '1:99' }, true), false);
});

test('timed strength sets retain seconds in history without producing a false repetition record', () => {
 const timed = { ...exercise, name: 'Gainage' };
 const draft = createWorkoutDraft(program([entry({sets:1,reps:'30 s'})]), user, [], [timed], 1000, id);
 draft.values['0:0']={weight:'0',reps:'35',duration:''};
 const payload=completionPayload(draft,user,[timed]);
 assert.equal(payload.log.exercises?.[0].sets[0].duration,'35 s');
 assert.deepEqual(payload.performances,[]);
});

test('malformed local series and out-of-range cursor cannot crash recovery', () => {
 const storage=store(), draft=createWorkoutDraft(program(),user,[],[exercise],1000,id);
 for(const broken of [{...draft,cursor:99},{...draft,values:{'0:0':{weight:7,reps:'1',duration:''}}},{...draft,confirmed:['other']}]) {
 storage.setItem(draftKey(draft.owner),JSON.stringify(broken)); assert.equal(readWorkoutDraft(user,storage),null);
 }
});


test('bodyweight equipment proposes zero while a barbell still requires a load, and legacy drafts stay valid', () => {
  const body = { ...exercise, equip: 'Poids du corps' };
  assert.equal(isBodyweightExercise(body), true);
  assert.equal(isBodyweightExercise({ ...body, equip: 'Barre' }), false);
  assert.equal(createWorkoutDraft(program(),user,[],[body],1000,id).values['0:0'].weight,'0');
  assert.equal(createWorkoutDraft(program(),user,[],[exercise],1000,id).values['0:0'].weight,'');
  assert.match(formatSet({weight:'0',reps:'10',duration:''},true),/Poids du corps/);
  assert.match(formatSet({weight:'7.5',reps:'10',duration:''},true),/\+7,5 kg/);
});

test('following series copies actual values without validating, while historical reference remains unchanged', () => {
  const history=[log('2026-09-27T09:00:00Z','77.5')];
  const draft=createWorkoutDraft(program(),user,history,[exercise],1000,id);
  const baseline=structuredClone(draft.values);
  draft.values['0:0']={weight:'80',reps:'9',duration:''};
  const proposed=prepareFollowingSet(draft,baseline);
  assert.deepEqual(proposed['0:1'],draft.values['0:0']);
  assert.deepEqual(draft.confirmed,[]);
  assert.equal(history[0].exercises?.[0].sets[0].weight,'77.5');
  const storage=store();writeWorkoutDraft({...draft,values:proposed,cursor:1,confirmed:['0:0']},storage);
  assert.equal(readWorkoutDraft(user,storage)?.values['0:1'].weight,'80');
});

test('following series preserves manual future values, confirmed sets, dropsets and differing repetition targets', () => {
  const draft=createWorkoutDraft(program(),user,[],[exercise],1000,id), baseline=structuredClone(draft.values);
  draft.values['0:0']={weight:'80',reps:'10',duration:''};draft.values['0:1']={weight:'60',reps:'12',duration:''};
  assert.equal(prepareFollowingSet(draft,baseline)['0:1'].weight,'60');
  assert.equal(prepareFollowingSet({...draft,confirmed:['0:1']},baseline),draft.values);
  const drops=createWorkoutDraft(program([entry({setType:'dropset'})]),user,[],[exercise],1000,id);
  assert.equal(prepareFollowingSet(drops,drops.values),drops.values);
  const pyramid=createWorkoutDraft(program([entry({reps:'10,8,6'})]),user,[],[exercise],1000,id), initial=structuredClone(pyramid.values);
  pyramid.values['0:0']={weight:'30',reps:'11',duration:''};
  assert.equal(prepareFollowingSet(pyramid,initial)['0:1'].reps,'8');
});

test('superset prepares the next round of the same exercise without changing the other exercise', () => {
  const draft=createWorkoutDraft(program([entry({sets:2,setGroup:1,setType:'superset'}),entry({exId:2,sets:2,setGroup:1,setType:'superset'})]),user,[],[exercise],1000,id);
  const baseline=structuredClone(draft.values);draft.values['0:0']={weight:'20',reps:'9',duration:''};
  const proposed=prepareFollowingSet(draft,baseline);
  assert.equal(proposed['0:1'].weight,'20');assert.deepEqual(proposed['1:0'],baseline['1:0']);
});

test('only an actual edit invalidates its series; reading it and unchanged input retain confirmation', () => {
  const draft=createWorkoutDraft(program(),user,[],[exercise],1000,id);draft.values['0:0']={weight:'80',reps:'10',duration:''};draft.confirmed=['0:0','0:1'];
  assert.equal(updateSetValue(draft,'0:0','reps','10'),draft);
  const edited=updateSetValue(draft,'0:0','reps','8');
  assert.deepEqual(edited.confirmed,['0:1']);assert.equal(edited.values['0:0'].reps,'8');
  assert.deepEqual(draft.confirmed,['0:0','0:1']);
});

test('rest deadline survives a suspended clock and extension adds thirty real seconds', () => {
  assert.equal(remainingRest(91000,1000),90);assert.equal(remainingRest(91000,46000),45);
  assert.equal(remainingRest(91000,100000),0);
  assert.equal(extendRest(91000,46000),121000);assert.equal(extendRest(91000,100000),130000);
});

test('load comparison rejects incomplete, timed, cardio and different-repetition references', () => {
  const set=(weight:string,reps='10',duration='')=>({weight,reps,duration});
  assert.equal(comparableLoadGain([set('82,5')],[set('80')],false,false),2.5);
  for(const prior of [undefined,[set('')],[set('80','8')],[set('80','10','30 s')]]) assert.equal(comparableLoadGain([set('85')],prior,false,false),null);
  assert.equal(comparableLoadGain([set('85')],[set('80')],true,false),null);
  assert.equal(comparableLoadGain([set('85')],[set('80')],false,true),null);
  assert.equal(comparableLoadGain([set('75')],[set('80')],false,false),null);
});


test('cardio reference uses the date, never compares meters to minutes; equal strength loads retain more reps', () => {
 const previous={exId:'row',date:'2026-09-26',weight:0,reps:0,duration:'500 m'} as Performance;
 const current={...previous,date:'2026-09-27',duration:'2 min'};
 assert.equal(performanceReference(current,previous,{...exercise,cat:'Cardio'}),current);
 assert.equal(performanceReference({...previous,date:'2026-09-25'},current,{...exercise,cat:'Cardio'}),current);
 assert.equal(performanceReference({...current,weight:20,reps:10},{...previous,weight:20,reps:8},exercise).reps,10);
});
