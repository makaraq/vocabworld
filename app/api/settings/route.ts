import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// GET - Fetch user settings
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServer()
    
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
      playTargetOnly: false
    }

    return NextResponse.json({
      settings: profile?.learning_settings || defaultSettings
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Save user settings
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServer()
    
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

    // Update user profile with new settings
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        learning_settings: settings,
        updated_at: new Date().toISOString()
      })
      .eq('auth_user_id', user.id)

    if (updateError) {
      console.error('Error saving user settings:', updateError)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    console.log('✅ Settings saved successfully for user:', user.email)

    return NextResponse.json({
      success: true,
      settings
    })

  } catch (error) {
    console.error('Unexpected error in POST /api/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
