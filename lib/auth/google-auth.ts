// google-auth.ts — legacy file kept for auth-service.ts compatibility
// Actual Google sign-in is handled via @capgo/capacitor-social-login in auth-context.tsx

export async function initializeGoogleAuth() {}

export async function signInWithGoogleMobile() {
  return { success: false, error: 'Use SocialLogin from auth-context instead' }
}

export async function signInWithGoogleWeb() {
  return { success: true, data: null }
}

export async function signOutFromGoogle() {}
