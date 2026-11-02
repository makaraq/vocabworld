import { logOutRevenueCat } from '@/lib/revenuecat-client'
import { createClient } from '@/lib/supabase/browser-client'

/**
 * Deletes the account on the server, then signs out: through the app's own
 * sign-out when given (it also resets the app's screens), else directly.
 * Throws with the server's message when the delete fails. Used by both
 * account sheets (manage-account-modal.tsx, native-account-sheet.tsx).
 */
export async function deleteAccount(signOut?: () => unknown): Promise<void> {
  const res = await fetch('/api/account/delete', { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to delete account')
  }
  if (signOut) {
    await signOut()
  } else {
    await logOutRevenueCat()
    await createClient().auth.signOut()
  }
}
