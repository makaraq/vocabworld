# Stripe Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs (create these in your Stripe dashboard)
STRIPE_YEARLY_PRICE_ID=price_yearly_subscription_id
STRIPE_MONTHLY_PRICE_ID=price_monthly_subscription_id

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Setting up Stripe Products and Prices

1. **Create Products in Stripe Dashboard:**
   - Go to Stripe Dashboard > Products
   - Create "Sprind Yearly" product
   - Create "Sprind Monthly" product

2. **Create Prices:**
   - Yearly: $29.00 USD, recurring every 12 months, with 7-day trial
   - Monthly: $4.99 USD, recurring every 1 month, no trial

3. **Copy Price IDs:**
   - Add the price IDs to your environment variables

## Webhook Configuration

1. **Create Webhook Endpoint:**
   - Go to Stripe Dashboard > Webhooks
   - Add endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

2. **Copy Webhook Secret:**
   - Add the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Testing

For testing, use Stripe's test mode and test card numbers:
- Success: `4242424242424242`
- Decline: `4000000000000002`

## Production Checklist

- [ ] Switch to live Stripe keys
- [ ] Update webhook endpoint to production URL
- [ ] Test subscription flows
- [ ] Verify webhook events are processed correctly
- [ ] Test payment failures and subscription cancellations