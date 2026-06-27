import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lazy client: defers createClient so importing this route during the
// static-export build does not require Supabase env vars at build time.
let _client: ReturnType<typeof createClient<any>> | null = null
function getServiceClient() {
  if (!_client) {
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    _client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey)
  }
  return _client
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const languageCode = searchParams.get('languageCode')

    if (!languageCode) {
      return NextResponse.json(
        { error: 'languageCode parameter is required' },
        { status: 400 }
      )
    }

    // Fetch category translations for the specified language
    const { data, error } = await getServiceClient()
      .from('category_translations')
      .select('category, translated_category')
      .eq('language_code', languageCode)

    if (error) {
      console.error('Error fetching category translations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch category translations' },
        { status: 500 }
      )
    }

    // Transform to Record<string, string> format for easy lookup
    const translations: Record<string, string> = {}
    data.forEach(row => {
      translations[row.category] = row.translated_category
    })

    return NextResponse.json(translations)
  } catch (error) {
    console.error('Unexpected error in category-translations API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
