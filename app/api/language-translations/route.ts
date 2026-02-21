import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const languageCode = searchParams.get('languageCode')

    if (!languageCode) {
      return NextResponse.json(
        { error: 'languageCode parameter is required' },
        { status: 400 }
      )
    }

    // Fetch all language name translations for the specified language code
    const { data, error } = await supabase
      .from('language_translations')
      .select('english_name, translated_name')
      .eq('language_code', languageCode)

    if (error) {
      console.error('Error fetching language translations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch language translations' },
        { status: 500 }
      )
    }

    // Convert array to object for easy lookup
    // { "English": "İngilizce", "Spanish": "İspanyolca", ... }
    const translations: Record<string, string> = {}
    data.forEach((row: { english_name: string; translated_name: string }) => {
      translations[row.english_name] = row.translated_name
    })

    return NextResponse.json(translations, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
  } catch (error) {
    console.error('Error in language-translations API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
