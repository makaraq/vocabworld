// Script to create Stripe price IDs for Sprind subscription plans
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function setupStripePrices() {
  try {
    console.log('🔄 Setting up Stripe prices for Sprind...');

    // Create product first
    const product = await stripe.products.create({
      name: 'Sprind Unlimited',
      description: 'Access to all vocabulary topics and premium features',
      metadata: {
        app: 'sprind'
      }
    });

    console.log('✅ Created product:', product.id);

    // Create yearly price with trial
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 2900, // $29.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'year',
        trial_period_days: 7
      },
      metadata: {
        plan: 'yearly',
        app: 'sprind'
      }
    });

    console.log('✅ Created yearly price:', yearlyPrice.id);

    // Create monthly price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 499, // $4.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan: 'monthly',
        app: 'sprind'
      }
    });

    console.log('✅ Created monthly price:', monthlyPrice.id);

    console.log('\n🎉 Stripe setup complete!');
    console.log('\nAdd these to your .env.local file:');
    console.log(`STRIPE_YEARLY_PRICE_ID=${yearlyPrice.id}`);
    console.log(`STRIPE_MONTHLY_PRICE_ID=${monthlyPrice.id}`);
    console.log(`NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=${yearlyPrice.id}`);
    console.log(`NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=${monthlyPrice.id}`);

  } catch (error) {
    console.error('❌ Error setting up Stripe prices:', error.message);
  }
}

setupStripePrices();