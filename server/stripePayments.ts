import type { Firestore } from 'firebase-admin/firestore';

// Both invoice events and Stripe retries must resolve to the same payment.
export async function recordPaidInvoice(db: Firestore, invoice: any) {
  const subscription = invoice.subscription || invoice.parent?.subscription_details?.subscription;
  const subscriptionId = typeof subscription === 'string' ? subscription : subscription?.id;
  if (!subscriptionId || typeof invoice.id !== 'string' || !/^in_[a-zA-Z0-9]+$/.test(invoice.id)) return;
  if (!Number.isFinite(invoice.amount_paid) || !Number.isFinite(invoice.created)) throw new Error('Invalid invoice');
  const subscriptions = await db.collection('subscriptions').where('stripeSubscriptionId', '==', subscriptionId).limit(2).get();
  if (subscriptions.empty) throw new Error('Invoice subscription is not associated yet');
  if (subscriptions.size !== 1) throw new Error('Invoice subscription association is ambiguous');
  const { clubId, memberId } = subscriptions.docs[0].data();
  const ref = db.doc(`payments/stripe_${invoice.id}`);
  await db.runTransaction(async tx => {
    if ((await tx.get(ref)).exists) return;
    tx.create(ref, {
      id: ref.id, clubId, memberId, amount: invoice.amount_paid / 100,
      date: new Date(invoice.created * 1000).toISOString(), status: 'paid',
      method: 'card', category: 'subscription', stripeInvoiceId: invoice.id,
      ...(typeof invoice.charge === 'string' ? { stripeChargeId: invoice.charge } : {})
    });
  });
}
