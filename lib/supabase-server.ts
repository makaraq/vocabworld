import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

/**
 * Get a Supabase client for server-side use with service role key
 * Lazy-loaded to prevent build-time initialization errors
 */
export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, key)
}

/**
 * Get a Supabase client for client-side use with anon key
 * Lazy-loaded to prevent build-time initialization errors
 */
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, key)
}

/**
 * Get a Stripe client for server-side use
 * Lazy-loaded to prevent build-time initialization errors
 */
export function getStripeServer() {
  const key = process.env.STRIPE_SECRET_KEY
  
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable')
  }
  
  return new Stripe(key, {
    apiVersion: '2025-12-15.clover',
  })
}
