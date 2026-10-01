import { it } from 'node:test';
import assert from 'node:assert/strict';
import { canShowClient360AccountActions, getClient360AdminSections, getClient360Facts, getClient360QuickActions, getClient360Sections } from '../components/client360.ts';
import { getProductCapabilities } from '../productCapabilities.ts';
import type { AppState, Club, User } from '../types.ts';

const club = (accountType?: 'solo' | 'studio') => ({ id: 'club-1', accountType, canAddStaff: true } as Club);
const actor = (role: 'owner' | 'coach' | 'member') => ({ role, clubId: 'club-1' });
const expected = ['overview', 'coaching', 'progress', 'followup', 'retention', 'nutrition', 'calendar', 'administrative', 'communication'];

for (const [role, accountType] of [['owner', 'solo'], ['owner', 'studio'], ['coach', 'studio'], ['owner', undefined]] as const) {
  it(`exposes a complete Client 360 for ${role} / ${accountType || 'legacy'}`, () => {
    const sections = getClient360Sections(club(accountType), actor(role));
    assert.deepEqual(sections.map(section => section.id), expected);
    assert.equal(sections[0].id, 'overview');
    assert.deepEqual(getClient360QuickActions(sections), ['message', 'program', 'plan', 'note']);
    assert.deepEqual(getClient360AdminSections(club(accountType), actor(role)).map(section => section.id), ['profile', 'billing', 'documents']);
    assert.equal(canShowClient360AccountActions(club(accountType), actor(role)), role === 'owner');
    assert.equal(getProductCapabilities(club(accountType), actor(role)).coachAssignments.usable, role === 'owner' && accountType !== 'solo');
  });
}

it('never exposes a dossier or unrelated unimplemented features through neighboring capabilities', () => {
  assert.deepEqual(getClient360Sections(club('studio'), actor('member')), []);
  assert.deepEqual(getClient360AdminSections(club('studio'), actor('member')), []);
  assert.deepEqual(getClient360Sections(club('studio'), { role: 'coach', clubId: 'other' }), []);
  assert.deepEqual(getClient360Sections(null, actor('owner')), []);
  assert.equal(canShowClient360AccountActions(club('studio'), actor('coach')), false);
  assert.ok(!expected.includes('boutique'));
});

const member = { id: 7, coachingNotesHistory: [
  { id: '1', date: '2026-09-01T10:00:00.000Z', content: 'Ancienne note' },
  { id: '2', date: '2026-09-05T10:00:00.000Z', content: 'Nouvelle note' },
] } as User;
const emptyState = { bookings: [], logs: [], bodyData: [], subscriptions: [], programs: [] } as unknown as Pick<AppState, 'bookings' | 'logs' | 'bodyData' | 'subscriptions' | 'programs'>;

it('shows honest empty facts when a client has no program, appointment or subscription', () => {
  const facts = getClient360Facts({ id: 7 } as User, emptyState, Date.parse('2026-09-30T00:00:00.000Z'));
  assert.deepEqual(facts, { nextBooking: null, lastActivity: null, lastBodyRecord: null, activeSubscription: null, lastNote: null, activeProgram: null });
});

it('uses only the selected member’s existing records and chooses chronological facts', () => {
  const state = {
    bookings: [
      { memberId: 8, status: 'confirmed', startTime: '2026-10-01T10:00:00.000Z' },
      { memberId: 7, status: 'confirmed', startTime: '2026-10-03T10:00:00.000Z' },
      { memberId: 7, status: 'cancelled', startTime: '2026-10-01T10:00:00.000Z' },
      { memberId: 7, status: 'confirmed', startTime: '2026-10-02T10:00:00.000Z' },
    ],
    logs: [{ memberId: 7, date: '2026-09-10' }, { memberId: 8, date: '2026-09-30' }, { memberId: 7, date: '2026-09-20' }],
    bodyData: [{ memberId: 8, date: '2026-09-30', weight: 99 }, { memberId: 7, date: '2026-09-15', weight: 72 }],
    subscriptions: [{ memberId: 8, status: 'active' }, { memberId: 7, status: 'expired' }, { memberId: 7, status: 'active', planName: 'Coaching' }],
    programs: [{ memberId: 8, name: 'Autre' }, { memberId: 7, isPlannedSession: true, name: 'Séance' }, { memberId: 7, name: 'Programme réel' }],
  } as unknown as typeof emptyState;
  const facts = getClient360Facts(member, state, Date.parse('2026-09-30T00:00:00.000Z'));
  assert.equal(facts.nextBooking?.startTime, '2026-10-02T10:00:00.000Z');
  assert.equal(facts.lastActivity?.date, '2026-09-20');
  assert.equal(facts.lastBodyRecord?.weight, 72);
  assert.equal(facts.activeSubscription?.planName, 'Coaching');
  assert.equal(facts.activeProgram?.name, 'Programme réel');
  assert.equal(facts.lastNote?.content, 'Nouvelle note');
});
