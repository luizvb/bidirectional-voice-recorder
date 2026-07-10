import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { query } from '../config/db';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_fallback', {
  apiVersion: '2026-06-24.dahlia' as any,
});

// Create Checkout Session
router.post('/create-checkout-session', express.json(), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || req.body.userId;

    if (!userId) {
       res.status(401).json({ error: 'Unauthorized' });
       return;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1TrgegKD7xVMZWERPV78Sc0a',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'http://localhost:5173/?checkout=success',
      cancel_url: 'http://localhost:5173/?checkout=cancel',
      client_reference_id: userId,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Webhook for Stripe
// Note: This is mounted before express.json() in server.ts
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.client_reference_id) {
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;

          await query(
            `UPDATE users
             SET stripe_customer_id = $1, stripe_subscription_id = $2, subscription_status = $3
             WHERE id = $4`,
            [customerId, subscriptionId, 'active', session.client_reference_id]
          );
          console.log(`Updated user ${session.client_reference_id} with subscription ${subscriptionId}`);
        }
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await query(
          `UPDATE users
           SET subscription_status = $1, subscription_price_id = $2
           WHERE stripe_subscription_id = $3`,
          [
            subscription.status,
            subscription.items.data[0].price.id,
            subscription.id
          ]
        );
        console.log(`Updated subscription status for ${subscription.id} to ${subscription.status}`);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.send();
  } catch (err: any) {
    console.error(`Error processing webhook: ${err.message}`);
    res.status(500).send('Webhook processing error');
  }
});

export default router;
