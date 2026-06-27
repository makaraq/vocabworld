import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lazy service-role client: defers createClient so importing this route during
// the static-export build does not require Supabase env vars at build time.
let _client: ReturnType<typeof createClient<any>> | null = null
function getServiceClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _client
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const languageCode = searchParams.get('languageCode')
    const category = searchParams.get('category') || 'section'

    if (!languageCode) {
      return NextResponse.json({ error: 'Missing languageCode' }, { status: 400 })
    }

    // Fetch translations for the specified language
    const { data, error } = await getServiceClient()
      .from('ui_translations')
      .select('key, translated_text')
      .eq('language_code', languageCode)
      .eq('category', category)

    if (error) {
      console.error('Error fetching UI translations:', error)
      return NextResponse.json({ error: 'Failed to fetch translations' }, { status: 500 })
    }

    // Convert to key-value pairs
    const translations: Record<string, string> = {}
    data?.forEach(row => {
      translations[row.key] = row.translated_text
    })

    return NextResponse.json({ 
      translations,
      languageCode,
      count: Object.keys(translations).length
    })

  } catch (error) {
    console.error('Error in ui-translations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
