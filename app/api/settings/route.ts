import { NextResponse } from 'next/server'
import { getApiUser, getAdminClient } from '@/lib/auth/api-auth'

const DEFAULT_SETTINGS = {
  autoPlay: true,
  trainingLanguageVoice: "Male",
  mainLanguageVoice: "Male",
  pronunciationSpeed: "Normal",
  pauseBetweenTranslations: 0.5,
  pauseForNextWord: 0.7,
  repeatTargetLanguage: 1,
  repeatMainLanguage: 1,
  playTargetOnly: false,
  showPhonetics: false,
  rewindEnabled: false,
  rewindAfterWords: 5,
  notifications: {
    enabled: false,
    dailyReminderEnabled: true,
    dailyReminderTime: '09:00',
    streakProtectionEnabled: true,
    reviewReminderEnabled: true,
  },
}

// GET - Fetch user settings
// Auth: session cookie (web) OR Authorization Bearer header (native)
export async function GET(request: Request) {
  try {
    const user = await getApiUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Service-role client — auth verified above, query filters by user id
    const supabase = getAdminClient()

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('learning_settings')
      .eq('id', user.id)
      .single()

    if (profileError) {
      // If no row exists, return defaults (this is fine)
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({ settings: DEFAULT_SETTINGS })
      }

      console.error('❌ Error fetching user settings:', profileError)
      return NextResponse.json({
        error: 'Failed to fetch settings',
        details: profileError.message,
        code: profileError.code,
        hint: profileError.hint
      }, { status: 500 })
    }

    // Merge defaults with saved settings to ensure new fields are included
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
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
// Auth: session cookie (web) OR Authorization Bearer header (native)
export async function POST(request: Request) {
  try {
    const user = await getApiUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getAdminClient()

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

    // Use UPSERT to insert or update user profile.
    // Only include email when present so a tokenless email never nulls out
    // an existing value on conflict-update.
    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        ...(user.email ? { email: user.email } : {}),
        learning_settings: settingsToSave,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })

    if (upsertError) {
      console.error('❌ Error saving user settings:', upsertError)
      return NextResponse.json({
        error: 'Failed to save settings',
        details: upsertError.message,
        code: upsertError.code,
        hint: upsertError.hint
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      settings: settingsToSave
    })

  } catch (error) {
    console.error('Unexpected error in POST /api/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
