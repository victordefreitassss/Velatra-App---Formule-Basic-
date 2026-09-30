import { it, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { recordPaidInvoice } from '../server/stripePayments';

const app = initializeApp({ projectId: 'demo-velatra' });
const db = getFirestore(app);
after(() => deleteApp(app));
it('records a Stripe invoice once across concurrent event delivery and retries', async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Emulator required');
  await db.doc('subscriptions/stripe-test').set({ stripeSubscriptionId: 'sub_test', clubId: '123456', memberId: 42, currency: 'eur' });
  await db.doc('users/stripe-member').set({clubId:'123456',id:42,role:'member',stripeCustomerId:'cus_test'});
  const invoice = { id: 'in_localtest', customer: 'cus_test', currency: 'eur', amount_paid: 4900, created: 1700000000, parent: { subscription_details: { subscription: 'sub_test' } } };
  await Promise.all([recordPaidInvoice(db, invoice, '123456'), recordPaidInvoice(db, invoice, '123456')]);
  await recordPaidInvoice(db, invoice, '123456');
  const payments = await db.collection('payments').where('stripeInvoiceId', '==', invoice.id).get();
  assert.equal(payments.size, 1);
  assert.equal(payments.docs[0].data().amount, 49);
});
