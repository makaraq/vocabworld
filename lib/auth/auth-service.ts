import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { signInWithGoogleMobile, signOutFromGoogle, initializeGoogleAuth } from './google-auth'
import { signInWithAppleMobile, isAppleSignInAvailable } from './apple-auth'

// Types for our authentication system
export interface UserProfile {
  id: string
  auth_user_id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  provider: 'google' | 'apple' | 'email'
  provider_id: string | null
  preferred_language: string
  learning_languages: string[]
  subscription_status: 'free' | 'premium' | 'trial'
  subscription_platform: 'stripe' | 'apple' | null
  subscription_id: string | null
  created_at: string
  updated_at: string
  last_sign_in: string
}

export interface AuthUser {
  id: string
  email: string
  fullName: string
  avatarUrl?: string
}

export interface SignInResult {
  user: AuthUser | null
  error: string | null
  isNewUser: boolean
}

export interface GoogleAuthResult {
  accessToken: string
  idToken: string
  user: {
    id: string
    email: string
    name: string
    imageUrl: string
  }
}

export interface AppleAuthResult {
  identityToken: string
  user: {
    id: string
    email?: string
    name?: string
  }
}

class AuthService {
  public supabase = createClientComponentClient()

  // Platform detection
  isIOS(): boolean {
    if (typeof window === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
  }

  isAndroid(): boolean {
    if (typeof window === 'undefined') return false
    return /Android/.test(navigator.userAgent)
  }

  isMobile(): boolean {
    return this.isIOS() || this.isAndroid()
  }

  // Google Sign-In
  async signInWithGoogle(): Promise<SignInResult> {
    try {
      console.log('🔵 Device check - isMobile:', this.isMobile())
      console.log('🔵 User agent:', navigator.userAgent)
      
      // Force web path for debugging
      console.log('🔵 FORCING web path for debugging')
      return await this.signInWithGoogleWeb()
      
      /* Original logic - temporarily disabled
      if (this.isMobile()) {
        console.log('🔵 Taking mobile path')
        return await this.signInWithGoogleMobile()
      } else {
        console.log('🔵 Taking web path')
        return await this.signInWithGoogleWeb()
      }
      */
    } catch (error) {
      console.error('Google sign-in error:', error)
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Google sign-in failed',
        isNewUser: false
      }
    }
  }

  private async signInWithGoogleWeb(): Promise<SignInResult> {
    console.log('🔵 Starting OAuth with Google...')
    
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })

    console.log('🔵 OAuth response:', { data, error })

    if (error) {
      console.error('🔴 OAuth error:', error)
      return {
        user: null,
        error: error.message,
        isNewUser: false
      }
    }

    console.log('🟢 OAuth redirect should be happening now...')
    // For OAuth, we'll handle the result in the callback
    return {
      user: null,
      error: null,
      isNewUser: false
    }
  }

  private async signInWithGoogleMobile(): Promise<SignInResult> {
    try {
      // Initialize Google Auth first
      await initializeGoogleAuth()
      
      const result = await signInWithGoogleMobile()
      
      if (!result.success || !result.data) {
        return {
          user: null,
          error: result.error || 'Google sign-in failed',
          isNewUser: false
        }
      }

      // Sign in to Supabase with the Google ID token
      const { data, error } = await this.supabase.auth.signInWithIdToken({
        provider: 'google',
        token: result.data.idToken
      })

      if (error) {
        return {
          user: null,
          error: error.message,
          isNewUser: false
        }
      }

      // Handle the authenticated user
      const user = await this.getCurrentUser()
      return {
        user,
        error: null,
        isNewUser: false
      }
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Mobile Google sign-in failed',
        isNewUser: false
      }
    }
  }

  // Apple Sign-In
  async signInWithApple(): Promise<SignInResult> {
    try {
      if (this.isIOS()) {
        return await this.signInWithAppleMobile()
      } else {
        return await this.signInWithAppleWeb()
      }
    } catch (error) {
      console.error('Apple sign-in error:', error)
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Apple sign-in failed',
        isNewUser: false
      }
    }
  }

  private async signInWithAppleWeb(): Promise<SignInResult> {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      return {
        user: null,
        error: error.message,
        isNewUser: false
      }
    }

    return {
      user: null,
      error: null,
      isNewUser: false
    }
  }

  private async signInWithAppleMobile(): Promise<SignInResult> {
    try {
      // Check if Apple Sign-In is available
      const isAvailable = await isAppleSignInAvailable()
      if (!isAvailable) {
        return {
          user: null,
          error: 'Apple Sign-In is not available on this device',
          isNewUser: false
        }
      }

      const result = await signInWithAppleMobile()
      
      if (!result.success || !result.data) {
        return {
          user: null,
          error: result.error || 'Apple sign-in failed',
          isNewUser: false
        }
      }

      // Sign in to Supabase with the Apple identity token
      const { data, error } = await this.supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: result.data.identityToken
      })

      if (error) {
        return {
          user: null,
          error: error.message,
          isNewUser: false
        }
      }

      // Handle the authenticated user
      const user = await this.getCurrentUser()
      return {
        user,
        error: null,
        isNewUser: false
      }
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Mobile Apple sign-in failed',
        isNewUser: false
      }
    }
  }

  // Handle OAuth callback and create/update user profile
  async handleAuthCallback(): Promise<SignInResult> {
    try {
      const { data, error } = await this.supabase.auth.getSession()
      
      if (error || !data.session) {
        return {
          user: null,
          error: error?.message || 'No session found',
          isNewUser: false
        }
      }

      const authUser = data.session.user
      
      // Check if user profile exists
      const { data: existingProfile, error: profileError } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single()

      let profile: UserProfile
      let isNewUser = false

      if (!existingProfile || profileError) {
        // Create new user profile
        const newProfile = await this.createUserProfile(authUser)
        if (!newProfile) {
          return {
            user: null,
            error: 'Failed to create user profile',
            isNewUser: false
          }
        }
        profile = newProfile
        isNewUser = true
      } else {
        // Update last sign-in
        const { data: updatedProfile } = await this.supabase
          .from('user_profiles')
          .update({ last_sign_in: new Date().toISOString() })
          .eq('id', existingProfile.id)
          .select()
          .single()
        
        profile = updatedProfile || existingProfile
      }

      return {
        user: {
          id: authUser.id,
          email: authUser.email!,
          fullName: authUser.user_metadata?.full_name || authUser.email!,
          avatarUrl: authUser.user_metadata?.avatar_url
        },
        error: null,
        isNewUser: false
      }
    } catch (error) {
      console.error('Auth callback error:', error)
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Auth callback failed',
        isNewUser: false
      }
    }
  }

  // Create user profile
  private async createUserProfile(authUser: any): Promise<UserProfile | null> {
    try {
      console.log('📋 AUTH REPORT: 🆕 Creating new user profile...')
      const providerData = this.getProviderInfo(authUser)
      
      const profileData = {
        auth_user_id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
        avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
        provider: providerData.provider,
        provider_id: providerData.provider_id,
        preferred_language: 'en',
        learning_languages: [],
        subscription_status: 'free' as const,
        subscription_platform: null,
        subscription_id: null
      }

      console.log('📋 PROFILE CREATION:', {
        email: profileData.email,
        name: profileData.full_name,
        provider: profileData.provider,
        timestamp: new Date().toISOString()
      })

      const { data, error } = await this.supabase
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single()

      if (error) {
        console.error('📋 AUTH REPORT: ❌ Error creating user profile:', error)
        return null
      }

      console.log('📋 AUTH REPORT: ✅ User profile created successfully')
      return data
    } catch (error) {
      console.error('📋 AUTH REPORT: ❌ Exception in createUserProfile:', error)
      return null
    }
  }

  // Extract provider information
  private getProviderInfo(authUser: any): { provider: 'google' | 'apple' | 'email', provider_id: string | null } {
    if (authUser.app_metadata?.provider === 'google') {
      return {
        provider: 'google',
        provider_id: authUser.user_metadata?.sub || authUser.user_metadata?.provider_id || null
      }
    }
    
    if (authUser.app_metadata?.provider === 'apple') {
      return {
        provider: 'apple',
        provider_id: authUser.user_metadata?.sub || authUser.user_metadata?.provider_id || null
      }
    }

    return {
      provider: 'email',
      provider_id: null
    }
  }

  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data, error } = await this.supabase.auth.getUser()
      
      if (error || !data.user) {
        return null
      }

      // Try to get profile, but don't fail if it doesn't exist
      let profile = null
      try {
        const { data: profileData } = await this.supabase
          .from('user_profiles')
          .select('*')
          .eq('auth_user_id', data.user.id)
          .single()
        
        profile = profileData
      } catch (profileError) {
        console.warn('Profile not found for user, will create later:', data.user.id)
        // Continue without profile - we'll create it later
      }

      return {
        id: data.user.id,
        email: data.user.email!,
        fullName: data.user.user_metadata?.full_name || data.user.email!,
        avatarUrl: data.user.user_metadata?.avatar_url
      }
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  // Update user profile - DEPRECATED in clean version
  /* async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const user = await this.getCurrentUser()
      if (false) {
        throw new Error('No user profile found')
      }

      const { data, error } = await this.supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.profile.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in updateProfile:', error)
      return null
    }
  } */

  // Sign out
  async signOut(): Promise<{ error: string | null }> {
    try {
      // First, sign out from Google if the user was signed in with Google
      try {
        const { signOutFromGoogle } = await import('./google-auth')
        await signOutFromGoogle()
      } catch (googleError) {
        console.log('Google sign out not available or failed:', googleError)
        // Continue with Supabase sign out even if Google sign out fails
      }
      
      // Then sign out from Supabase
      const { error } = await this.supabase.auth.signOut()
      
      // Clear any remaining auth-related localStorage items
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
            localStorage.removeItem(key)
          }
        })
      }
      
      return { error: error?.message || null }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign out failed' }
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser()
        callback(user)
      } else {
        callback(null)
      }
    })
  }
}

export const authService = new AuthService()
export default authService
