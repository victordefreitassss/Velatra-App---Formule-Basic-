import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Club, User } from '../types';
import { createMemberAndSendAccess, getMemberCreationCoachOptions } from '../components/memberAccess';
import { getClient360CoachingContact } from '../components/client360';

const solo = { id: 'solo', accountType: 'solo', ownerId: 'owner-uid' } as Club;
const studio = { id: 'studio', accountType: 'studio', ownerId: 'studio-owner-uid' } as Club;
const owner = { id: 1, clubId: 'solo', role: 'owner', firebaseUid: 'owner-uid' } as User;
const studioOwner = { id: 2, clubId: 'studio', role: 'owner', firebaseUid: 'studio-owner-uid' } as User;
const coach = { id: 3, clubId: 'studio', role: 'coach', firebaseUid: 'coach-uid' } as User;
const outsider = { id: 4, clubId: 'other', role: 'coach', firebaseUid: 'other-uid' } as User;

describe('member creation contact and access', () => {
  it('offers only same-club coaches to a Studio owner', () => {
    assert.equal(getMemberCreationCoachOptions(solo, owner, [coach]), null);
    assert.deepEqual(getMemberCreationCoachOptions(studio, studioOwner, [coach, outsider]), [coach]);
    assert.equal(getMemberCreationCoachOptions(studio, coach, [coach]), null);
    assert.equal(getMemberCreationCoachOptions(studio, owner, [coach]), null);
  });

  it('resolves the canonical Solo owner and an explicit Studio coach in Client 360', () => {
    const soloMember = { id: 5, role: 'member', clubId: 'solo' } as User;
    const studioMember = { id: 6, role: 'member', clubId: 'studio', assignedCoachUid: 'coach-uid' } as User;
    assert.equal(getClient360CoachingContact(soloMember, solo, [owner, coach]), owner);
    assert.equal(getClient360CoachingContact(studioMember, studio, [studioOwner, coach]), coach);
    assert.equal(getClient360CoachingContact({ ...studioMember, assignedCoachUid: undefined }, studio, [studioOwner, coach]), null);
  });

  it('keeps the created account when the access email fails and does not create it twice', async () => {
    let creations = 0;
    const create = async () => { creations++; return { member: { email: 'member@example.test' } }; };
    const failed = await createMemberAndSendAccess(create, async () => { throw new Error('Email unavailable'); });
    assert.equal(failed.emailStatus, 'failed');
    assert.equal(creations, 1);
    assert.equal(failed.created.member.email, 'member@example.test');
    const sent = await createMemberAndSendAccess(create, async email => { assert.equal(email, 'member@example.test'); });
    assert.equal(sent.emailStatus, 'sent');
    assert.equal(creations, 2);
  });
});
