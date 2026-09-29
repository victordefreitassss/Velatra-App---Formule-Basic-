// Disposable local fixtures only. Never run against a real Firebase project.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
if (process.env.GCLOUD_PROJECT !== 'demo-velatra' || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') throw new Error('Local emulators required');
initializeApp({ projectId: 'demo-velatra' });
const db = getFirestore();
for (const [uid, id, role, clubId] of [['qa-owner', 1, 'owner', '123456'], ['qa-coach', 2, 'coach', '123456'], ['qa-other-owner', 3, 'owner', '654321']]) {
  const email = `${uid}@example.test`;
  try { await getAuth().createUser({ uid, email, password: 'Local-QA-only-2026!', emailVerified: true }); } catch (error) { if (error.code !== 'auth/uid-already-exists') throw error; }
  const ref = db.doc(`users/${uid}`);
  if (!(await ref.get()).exists) await ref.set({ id, role, clubId, firebaseUid: uid, email, name: uid, assignedMemberIds: [], createdAt: new Date().toISOString(), onboardingCompleted: false });
}
for (const [id, ownerId] of [['123456', 'qa-owner'], ['654321', 'qa-other-owner']]) {
  const ref = db.doc(`clubs/${id}`);
  if (!(await ref.get()).exists) await ref.set({ id, ownerId, accountType: id === '123456' ? 'studio' : 'solo', name: 'Velatra QA', email: `${ownerId}@example.test`, phone: '0100000000', isActive: true, settings: { booking: { enabled: true } } });
}
console.log('Local fixtures ready: qa-owner@example.test / qa-coach@example.test');
