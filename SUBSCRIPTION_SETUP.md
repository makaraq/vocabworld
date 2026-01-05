# 🎯 Subscription System Setup Guide

Your VOCO app now has a complete Stripe subscription system!

## Architecture Overview

```
User clicks premium topic → Paywall Modal → Stripe Checkout → Webhook → Database Update → User has access
```

## Files Created

### Core Files
- `lib/stripe.ts` - Stripe client & pricing configuration
- `lib/subscription-service.ts` - Server-side subscription logic
- `contexts/auth-context.tsx` - Updated with subscription state

### API Routes
- `app/api/subscription/checkout/route.ts` - Creates Stripe checkout sessions
- `app/api/subscription/webhook/route.ts` - Handles Stripe webhook events
- `app/api/subscription/status/route.ts` - Gets user subscription status
- `app/api/subscription/portal/route.ts` - Creates Stripe billing portal sessions

### UI Components
- `components/paywall/paywall-modal.tsx` - Premium upgrade modal
- `app/subscription/success/page.tsx` - Post-payment success page

### Database
- `database-subscription-schema.sql` - Run this in Supabase SQL Editor

## Setup Steps

### 1. Environment Variables

Add these to your `.env.local`:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_MONTHLY_PRICE_ID=price_xxx
STRIPE_YEARLY_PRICE_ID=price_xxx
```

### 2. Create Stripe Products

In [Stripe Dashboard](https://dashboard.stripe.com/products):

1. Click "Add Product"
2. Create "VOCO Premium Monthly"
   - Price: $4.99/month
   - Billing period: Monthly
   - Copy the Price ID → `STRIPE_MONTHLY_PRICE_ID`

3. Create "VOCO Premium Yearly"
   - Price: $29.99/year
   - Billing period: Yearly
   - Copy the Price ID → `STRIPE_YEARLY_PRICE_ID`

### 3. Database Setup

Run `database-subscription-schema.sql` in Supabase SQL Editor to add:
- `subscription_status` column to `user_profiles`
- `stripe_customer_id` column
- `stripe_subscription_id` column
- `subscription_events` table for audit logs

### 4. Stripe Webhook Setup

**For Local Development:**

```bash
# Install Stripe CLI
# Then run:
stripe listen --forward-to localhost:3000/api/subscription/webhook
```

Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

**For Production (Vercel):**

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/subscription/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret to Vercel env vars

### 5. Configure Stripe Customer Portal

In Stripe Dashboard → Settings → Billing → Customer Portal:
- Enable subscription cancellation
- Enable subscription pausing (optional)
- Enable invoice history

## How It Works

### Free Topics
Topics 1 (Greetings), 2 (Numbers), 3 (Time) are always free.

### Premium Access Check

```typescript
// In components:
const { isPremium, canAccessTopic } = useAuth()

if (!canAccessTopic(topicId)) {
  setShowPaywall(true)
  return
}
```

### Subscription Flow

1. User clicks locked topic → Shows paywall modal
2. User selects plan → Redirects to Stripe Checkout
3. Payment succeeds → Stripe sends webhook
4. Webhook updates `user_profiles.subscription_status = 'premium'`
5. User redirected to `/subscription/success`
6. App detects `subscriptionJustActivated` flag → Refreshes status
7. User now has access to all topics

## Testing

### Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### Test Flow
1. Sign in with Google
2. Click a premium topic (4+)
3. Paywall modal appears
4. Select plan and click "Subscribe Now"
5. Use test card `4242 4242 4242 4242`
6. Complete checkout
7. Should redirect to success page
8. Then redirect to main app with premium access

## Pricing

Current configuration in `lib/stripe.ts`:
- Monthly: $4.99/month
- Yearly: $29.99/year (50% savings)

To change pricing, update both:
1. Stripe Dashboard (actual prices)
2. `lib/stripe.ts` PRICING object (display prices)

## Troubleshooting

### Webhook not working
- Check `STRIPE_WEBHOOK_SECRET` is correct
- Verify webhook URL in Stripe Dashboard
- Check Stripe Dashboard → Developers → Webhooks → Recent deliveries

### Subscription not updating
- Check `subscription_events` table for audit logs
- Verify `user_profiles` has subscription columns
- Check server logs for webhook errors

### Payment successful but no access
- Webhook may have failed - check Stripe webhook logs
- Manually update user: `UPDATE user_profiles SET subscription_status = 'premium' WHERE id = 'xxx'`
