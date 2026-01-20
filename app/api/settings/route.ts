import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET - Fetch user settings
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user profile with settings
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('learning_settings')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user settings:', profileError)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Return default settings if none exist
    const defaultSettings = {
      autoPlay: true,
      trainingLanguageVoice: "Male",
      mainLanguageVoice: "Male",
      pronunciationSpeed: "Normal",
      pauseBetweenTranslations: 0.5,
      pauseForNextWord: 0.7,
      repeatTargetLanguage: 1,
      repeatMainLanguage: 1,
      playTargetOnly: false,
      showPhonetics: false
    }

    // Merge defaults with saved settings to ensure new fields are included
    const mergedSettings = {
      ...defaultSettings,
      ...(profile?.learning_settings || {})
    }

    return NextResponse.json({
      settings: mergedSettings
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Save user settings
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse settings from request body
    const { settings } = await request.json()

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings format' }, { status: 400 })
    }

    // Ensure showPhonetics is included
    const settingsToSave = {
      ...settings,
      showPhonetics: settings.showPhonetics ?? false
    }

    console.log('💾 Attempting to save settings for user:', user.id)
    console.log('Settings to save:', settingsToSave)

    // Use UPSERT to insert or update user profile
    // For insert: include required fields (provider)
    // For update: only update learning_settings
    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert({ 
        auth_user_id: user.id,
        email: user.email,
        provider: user.app_metadata?.provider || 'google', // Default to google if not set
        learning_settings: settingsToSave,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'auth_user_id',
        ignoreDuplicates: false
      })
      
    if (upsertError) {
      console.error('❌ Error saving user settings:', upsertError)
      console.error('❌ Full error details:', JSON.stringify(upsertError, null, 2))
      return NextResponse.json({ 
        error: 'Failed to save settings',
        details: upsertError.message,
        code: upsertError.code,
        hint: upsertError.hint
      }, { status: 500 })
    }

    console.log('✅ Settings saved successfully for user:', user.email)

    return NextResponse.json({
      success: true,
      settings: settingsToSave
    })

  } catch (error) {
    console.error('Unexpected error in POST /api/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
