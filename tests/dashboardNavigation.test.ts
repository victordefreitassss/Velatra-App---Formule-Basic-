import { it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createClient360LocationState,
  createDashboardLocationState,
  createPlanningLocationState,
  getClient360MemberId,
  getPlanningMemberId,
} from '../components/dashboardNavigation.ts';

const lucas = 901;

it('Client 360 → Planifier carries Lucas only on the Planning history entry', () => {
  const planning = createPlanningLocationState(lucas);
  assert.equal(getPlanningMemberId(planning), lucas);
  assert.equal(getClient360MemberId(planning), null);
});

it('Planning → Retour au dossier carries Lucas back to Client 360', () => {
  const dossier = createClient360LocationState(lucas);
  assert.equal(getClient360MemberId(dossier), lucas);
  assert.equal(getPlanningMemberId(dossier), null);
});

it('leaving contextual Planning for Business creates a clean route state', () => {
  const business = createDashboardLocationState('crm_pipeline');
  assert.equal(getPlanningMemberId(business), null);
  assert.equal(getClient360MemberId(business), null);
});

it('a later normal Planning visit does not inherit Lucas', () => {
  const planning = createDashboardLocationState('calendar');
  assert.equal(getPlanningMemberId(planning), null);
});

it('normal Clients navigation does not reopen the previous dossier', () => {
  const clients = createDashboardLocationState('users');
  assert.equal(getClient360MemberId(clients), null);
});

it('Back/Forward restores each explicit history entry without leaking context between pages', () => {
  const history = [
    createClient360LocationState(lucas),
    createPlanningLocationState(lucas),
    createDashboardLocationState('crm_pipeline'),
    createDashboardLocationState('calendar'),
  ];
  let index = 2;

  index -= 1;
  assert.equal(getPlanningMemberId(history[index]), lucas);
  index += 1;
  assert.equal(getPlanningMemberId(history[index]), null);
  index += 1;
  assert.equal(getPlanningMemberId(history[index]), null);
  index -= 1;
  assert.equal(getPlanningMemberId(history[index]), null);
});

it('ignores member IDs attached to a different dashboard page or invalid IDs', () => {
  assert.equal(getPlanningMemberId({ velatraPage: 'users', planningMemberId: lucas }), null);
  assert.equal(getPlanningMemberId({ velatraPage: 'calendar', planningMemberId: -1 }), null);
  assert.equal(getClient360MemberId({ velatraPage: 'calendar', client360MemberId: lucas }), null);
});
