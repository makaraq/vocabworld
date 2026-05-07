// google-auth.ts — legacy file kept for auth-service.ts compatibility
// Actual Google sign-in is handled via Supabase OAuth in auth-context.tsx

export async function initializeGoogleAuth() {}

export async function signInWithGoogleMobile(): Promise<{ success: boolean; error: string; data: { idToken: string } | null }> {
  return { success: false, error: 'Use signInWithGoogle from auth-context instead', data: null }
}

export async function signInWithGoogleWeb() {
  return { success: true, data: null }
}

export async function signOutFromGoogle() {}
