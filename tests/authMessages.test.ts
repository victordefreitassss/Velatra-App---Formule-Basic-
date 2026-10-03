import { it } from 'node:test';
import assert from 'node:assert/strict';
import { authErrorMessage, registrationErrorMessage, resetSuccessMessage } from '../components/auth/authErrors';

it('does not disclose whether login email exists', () => {
  const message = authErrorMessage({ code: 'auth/invalid-credential' });
  for (const code of ['auth/user-not-found', 'auth/wrong-password']) assert.equal(authErrorMessage({ code }), message);
});
it('never renders raw provider errors or sensitive error content', () => {
  const secret = 'credential-secret@example.test';
  for (const code of ['auth/user-disabled', 'auth/network-request-failed', 'auth/unauthorized-domain', 'auth/operation-not-allowed', 'auth/too-many-requests', 'unknown']) {
    const text = authErrorMessage({ code, message: secret });
    assert.ok(text.length > 10); assert.ok(!text.includes(code)); assert.ok(!text.includes(secret));
  }
});
it('dismissed Google popup is quiet, conflicts require the usual login method', () => {
  assert.equal(authErrorMessage({ code: 'auth/popup-closed-by-user' }), '');
  assert.equal(authErrorMessage({ code: 'auth/cancelled-popup-request' }), '');
  for (const code of ['auth/account-exists-with-different-credential', 'auth/credential-already-in-use', 'auth/email-already-in-use']) assert.match(authErrorMessage({ code }), /méthode habituelle/);
});
it('reset response is conditional and registration keeps server failures generic', () => {
  assert.match(resetSuccessMessage, /^Si cette adresse/);
  assert.match(registrationErrorMessage(403), /code/i);
  assert.match(registrationErrorMessage(409), /existe déjà/);
  assert.equal(registrationErrorMessage(500), registrationErrorMessage(503));
});
