import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateMemberRegistration } from '../server/memberRegistration';
import { validatePublicProspect } from '../server/prospectValidation';
import { validatePublicContact } from '../server/contactValidation';

const validRequest = {
  clubId: '482910',
  name: '  Camille Martin  ',
  age: 28,
  weight: 65,
  height: 170,
  gender: 'F',
  objectifs: ['Force', '  Mobilité  '],
  notes: '  ' ,
  experienceLevel: 'Débutant',
  trainingDays: 3,
  sessionDuration: 60,
  equipment: 'Salle complète',
  injuries: ''
};

describe('member registration validation', () => {
  it('normalizes valid profile data and drops blank goals', () => {
    assert.deepEqual(validateMemberRegistration(validRequest), {
      ...validRequest,
      clubId: '482910',
      name: 'Camille Martin',
      objectifs: ['Force', 'Mobilité'],
      notes: ''
    });
  });

  it('rejects malformed club IDs and profile values outside supported bounds', () => {
    assert.equal(validateMemberRegistration({ ...validRequest, clubId: 'ABC123' }), null);
    assert.equal(validateMemberRegistration({ ...validRequest, age: 12 }), null);
    assert.equal(validateMemberRegistration({ ...validRequest, trainingDays: 8 }), null);
  });

  it('rejects unexpected types, oversized free text, and oversized goal lists', () => {
    assert.equal(validateMemberRegistration({ ...validRequest, weight: '65' }), null);
    assert.equal(validateMemberRegistration({ ...validRequest, notes: 'x'.repeat(2001) }), null);
    assert.equal(validateMemberRegistration({ ...validRequest, objectifs: Array(13).fill('Goal') }), null);
    assert.equal(validateMemberRegistration(null), null);
  });
});

describe('public discovery request validation', () => {
  it('keeps only bounded answers and normalizes contact details', () => {
    assert.deepEqual(validatePublicProspect({
      clubCode: ' 482910 ',
      formData: { name: ' Camille Martin ', email: ' CAMILLE@EXAMPLE.FR ', phone: '06 00', goals: ['Force'], injected: 'ignored' }
    }), {
      clubId: '482910',
      name: 'Camille Martin',
      email: 'camille@example.fr',
      answers: { name: 'Camille Martin', email: 'camille@example.fr', phone: '06 00', goals: ['Force'] }
    });
  });

  it('rejects invalid contact data and oversized or unexpected answer values', () => {
    const formData = { name: 'Camille Martin', email: 'camille@example.fr' };
    assert.equal(validatePublicProspect({ clubCode: '123', formData }), null);
    assert.equal(validatePublicProspect({ clubCode: '482910', formData: { ...formData, email: 'not-an-email' } }), null);
    assert.equal(validatePublicProspect({ clubCode: '482910', formData: { ...formData, condition: 'x'.repeat(1001) } }), null);
    assert.equal(validatePublicProspect({ clubCode: '482910', formData: { ...formData, determination: 11 } }), null);
  });
});

describe('public contact validation', () => {
  it('normalizes a valid contact request', () => {
    assert.deepEqual(validatePublicContact({
      name: ' Camille Martin ', email: ' CAMILLE@EXAMPLE.FR ', subject: ' Démo ', message: ' Bonjour Velatra. '
    }), { name: 'Camille Martin', email: 'camille@example.fr', subject: 'Démo', message: 'Bonjour Velatra.' });
  });

  it('rejects malformed addresses, line breaks in subjects, and oversized messages', () => {
    const valid = { name: 'Camille', email: 'camille@example.fr', subject: 'Démo', message: 'Bonjour Velatra.' };
    assert.equal(validatePublicContact({ ...valid, email: 'invalid' }), null);
    assert.equal(validatePublicContact({ ...valid, subject: 'Sujet\nBcc:someone@example.fr' }), null);
    assert.equal(validatePublicContact({ ...valid, message: 'x'.repeat(5001) }), null);
  });
});
