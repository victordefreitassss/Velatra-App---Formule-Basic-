import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let server: Server;
let url: string;
const previousEnv = { NODE_ENV: process.env.NODE_ENV, VERCEL: process.env.VERCEL, CLUB_INVITE_CODE: process.env.CLUB_INVITE_CODE };
before(async () => {
  process.env.NODE_ENV = 'production'; process.env.VERCEL = '1'; process.env.CLUB_INVITE_CODE = 'local-product-test';
  const { default: app } = await import('../server.ts');
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  for (const [key, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
});

async function identity(email = `foundation-${randomUUID()}@example.test`, emailVerified = false) {
  const user = await getAuth().createUser({ email, password: 'Local-product-test-only!', emailVerified });
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-emulator`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Local-product-test-only!', returnSecureToken: true }),
  });
  assert.equal(response.status, 200);
  return { uid: user.uid, token: (await response.json()).idToken as string };
}
function post(path: string, token: string, body: unknown, method = 'POST') {
  return fetch(url + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
}
const signup = (accountType: unknown) => ({ clubName: 'Fixture Product', ownerName: 'Fixture Owner', inviteCode: 'local-product-test', accountType });

for (const accountType of ['solo', 'studio'] as const) {
  it(`registers and logs in a new ${accountType} owner, persisting only the club type`, async () => {
    const user = await identity();
    const response = await post('/api/register-club', user.token, { ...signup(accountType), role: 'superadmin', plan: 'premium', entitlements: ['premium'], isActive: false, canAddStaff: true, capabilities: { inventory: true }, ownerId: 'attacker' });
    assert.equal(response.status, 200);
    const result = await response.json();
    const club = (await getFirestore().doc(`clubs/${result.clubId}`).get()).data()!;
    const profile = (await getFirestore().doc(`users/${user.uid}`).get()).data()!;
    assert.equal(club.accountType, accountType); assert.equal(club.ownerId, user.uid);
    assert.equal(profile.role, 'owner'); assert.equal(profile.clubId, result.clubId);
    assert.equal('accountType' in profile, false); assert.equal('capabilities' in club, false); assert.equal(club.canAddStaff, false); assert.equal(club.plan, 'basic'); assert.equal(club.isActive, true); assert.equal('entitlements' in club, false);
    const duplicate = await post('/api/register-club', user.token, signup(accountType === 'solo' ? 'studio' : 'solo'));
    assert.equal(duplicate.status, 409);
    assert.equal((await getFirestore().doc(`clubs/${result.clubId}`).get()).data()!.accountType, accountType);
    // The same real emulator login session resolves the server profile after registration.
    assert.equal((await post('/api/stripe/status', user.token, undefined, 'GET')).status, 200);
  });
}

it('rejects invalid types/invitations without creating a profile', async () => {
  const user = await identity();
  for (const type of [null, 'legacy', 'premium', {}, ['solo']]) {
    assert.equal((await post('/api/register-club', user.token, signup(type))).status, 400);
  }
  assert.equal((await post('/api/register-club', user.token, { ...signup('studio'), inviteCode: 'wrong' })).status, 403);
  assert.equal((await getFirestore().doc(`users/${user.uid}`).get()).exists, false);
  assert.equal((await fetch(url + '/api/register-club', { method: 'POST' })).status, 401);
});

for (const role of ['coach', 'member', 'superadmin'] as const) {
  it(`rejects forged owner/type/capabilities from ${role} at protected HTTP endpoints`, async () => {
    const user = await identity();
    const clubId = `foundation-${randomUUID()}`;
    await getFirestore().doc(`clubs/${clubId}`).set({ isActive: true, id: clubId, ownerId: 'owner', accountType: 'studio', canAddStaff: true });
    await getFirestore().doc(`users/${user.uid}`).set({ id: 891, role, clubId, firebaseUid: user.uid });
    const forged = { role: 'owner', accountType: 'studio', requestorUid: 'owner', canAddStaff: true, capabilities: { teamManagement: true }, clubId };
    for (const [path, body, method] of [
      ['/api/create-staff', { ...forged, name: 'Denied', email: `denied-${randomUUID()}@example.test`, password: 'Local-denied-test!' }, 'POST'],
      ['/api/assign-member-coach', { ...forged, memberUid: 'arbitrary', coachUid: user.uid }, 'POST'],
      ['/api/stripe/connect', { ...forged, secretKey: 'not-a-real-secret' }, 'POST'],
      ['/api/stripe/connect', forged, 'DELETE'],
    ] as const) assert.equal((await post(path, user.token, body, method)).status, 403, path);
  });
}

it('keeps authorized legacy staff API access and prevents cross-club creation', async () => {
  const user = await identity();
  const clubId = `legacy-${randomUUID()}`;
  await getFirestore().doc(`clubs/${clubId}`).set({ isActive: true, id: clubId, ownerId: user.uid, canAddStaff: true, plan: 'basic' });
  await getFirestore().doc(`users/${user.uid}`).set({ id: 892, role: 'owner', clubId, firebaseUid: user.uid });
  const body = { clubId, name: 'Legacy staff', email: `staff-${randomUUID()}@example.test`, password: 'Local-staff-test!' };
  assert.equal((await post('/api/create-staff', user.token, { ...body, clubId: 'other' })).status, 403);
  assert.equal((await post('/api/create-staff', user.token, body)).status, 200);
  assert.equal((await getFirestore().doc(`clubs/${clubId}`).get()).data()!.accountType, undefined);
});

// Real Auth emulator Google identities, then the same protected registration endpoint.
async function googleIdentity(email: string, subject: string) {
  const jwt = [Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: subject, email, email_verified: true, name: 'Google Fixture', aud: 'demo-velatra', iss: 'https://accounts.google.com', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), ''].join('.');
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=local-emulator`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', postBody: `id_token=${jwt}&providerId=google.com`, returnSecureToken: true })
  });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result.error));
  return { uid: result.localId as string, token: result.idToken as string };
}
for (const accountType of ['solo', 'studio'] as const) {
  it(`Google ${accountType}: no tenant before explicit signup, server authority and one profile per UID`, async () => {
    const email = `google-${randomUUID()}@gmail.com`, subject = randomUUID();
    const user = await googleIdentity(email, subject);
    assert.equal((await getFirestore().doc(`users/${user.uid}`).get()).exists, false);
    const denied = await post('/api/register-club', user.token, { ...signup(accountType), inviteCode: 'wrong' });
    assert.equal(denied.status, 403);
    assert.equal((await getFirestore().doc(`users/${user.uid}`).get()).exists, false);
    const response = await post('/api/register-club', user.token, { ...signup(accountType), role: 'superadmin', plan: 'premium', isActive: false, canAddStaff: true });
    assert.equal(response.status, 200);
    const { clubId } = await response.json();
    const profile = (await getFirestore().doc(`users/${user.uid}`).get()).data()!;
    const club = (await getFirestore().doc(`clubs/${clubId}`).get()).data()!;
    assert.equal(profile.role, 'owner'); assert.equal(profile.email, email);
    assert.equal(club.plan, 'basic'); assert.equal(club.isActive, true); assert.equal(club.canAddStaff, false); assert.equal(club.accountType, accountType);
    const again = await googleIdentity(email, subject);
    assert.equal(again.uid, user.uid);
    assert.equal((await post('/api/register-club', again.token, signup(accountType))).status, 409);
  });
}
it('Google with an existing verified email/password identity retains the same UID and business profile', async () => {
  const email = `same-${randomUUID()}@gmail.com`;
  const passwordIdentity = await identity(email, true);
  const created = await post('/api/register-club', passwordIdentity.token, signup('solo'));
  assert.equal(created.status, 200);
  const before = (await getFirestore().doc(`users/${passwordIdentity.uid}`).get()).data();
  const google = await googleIdentity(email, randomUUID());
  assert.equal(google.uid, passwordIdentity.uid);
  assert.deepEqual((await getFirestore().doc(`users/${google.uid}`).get()).data(), before);
  assert.equal((await post('/api/register-club', google.token, signup('studio'))).status, 409);
});
