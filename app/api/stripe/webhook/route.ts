import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  console.log('[webhook] ====== Stripe webhook received ======');

  // 1. Read raw body
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature') || '';
  console.log('[webhook] signature prefix:', signature.slice(0, 10) + '...');

  // 2. Verify Stripe signature
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log('[webhook] ✅ Signature verified — event type:', event.type);
  } catch (err: any) {
    console.error('[webhook] ❌ Signature verification FAILED:', err.message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  // 3. Service client — bypasses RLS
  const supabase = createServiceClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      console.log('[webhook] Handling checkout.session.completed…');
      const session = event.data.object;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      console.log('[webhook] customer:', customerId, 'subscription:', subscriptionId);

      // Strategy A — look up user by stripe_customer_id
      let userId: string | null = null;
      if (customerId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('stripe_customer_id', customerId)
          .single();
        console.log('[webhook] Profile by customer_id:', profile ? `found (${profile.email})` : 'NOT FOUND');
        userId = profile?.id || null;
      }

      // Strategy B — fallback to metadata
      if (!userId && session.metadata?.userId) {
        console.log('[webhook] Falling back to session.metadata.userId:', session.metadata.userId);
        userId = session.metadata.userId;
      }

      if (!userId) {
        console.error('[webhook] ❌ Could not determine userId — skipping');
        break;
      }

      const planId = session.metadata?.planId || 'pro';
      console.log('[webhook] planId:', planId, '| userId:', userId);

      // Fetch actual subscription for accurate period_end
      let currentPeriodEnd: string;
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
        console.log('[webhook] period_end from Stripe:', currentPeriodEnd);
      } catch {
        currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        console.log('[webhook] ⚠️ fallback period_end:', currentPeriodEnd);
      }

      const { error: upErr } = await supabase
        .from('profiles')
        .update({
          subscription_status: planId,
          subscription_id: subscriptionId,
          current_period_end: currentPeriodEnd,
          scans_used_this_month: 0,
        })
        .eq('id', userId);

      console.log(upErr ? '[webhook] ❌ UPDATE failed:' + JSON.stringify(upErr) : '[webhook] ✅ Profile updated → ' + planId);
      break;
    }

    case 'customer.subscription.updated': {
      console.log('[webhook] Handling customer.subscription.updated…');
      const subscription = event.data.object;
      const { data: profile } = await supabase
        .from('profiles').select('id').eq('subscription_id', subscription.id).single();

      if (!profile) {
        console.error('[webhook] ❌ No profile for sub:', subscription.id);
        break;
      }
      const newStatus = subscription.cancel_at_period_end ? 'free' : (subscription.metadata?.planId || 'pro');
      const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      await supabase.from('profiles').update({ subscription_status: newStatus, current_period_end: periodEnd }).eq('id', profile.id);
      console.log('[webhook] ✅ Updated →', newStatus);
      break;
    }

    case 'customer.subscription.deleted': {
      console.log('[webhook] Handling customer.subscription.deleted…');
      const subscription = event.data.object;
      const { data: profile } = await supabase
        .from('profiles').select('id').eq('subscription_id', subscription.id).single();
      if (!profile) { console.error('[webhook] ❌ No profile for sub:', subscription.id); break; }
      await supabase.from('profiles').update({ subscription_status: 'free', subscription_id: null, current_period_end: null, scans_used_this_month: 0 }).eq('id', profile.id);
      console.log('[webhook] ✅ Reset to free');
      break;
    }

    case 'invoice.payment_failed': {
      console.warn('[webhook] Payment failed for customer:', event.data.object.customer);
      break;
    }

    default:
      console.log('[webhook] Unhandled event:', event.type);
  }

  console.log('[webhook] ====== Done ======');
  return NextResponse.json({ received: true });
}
