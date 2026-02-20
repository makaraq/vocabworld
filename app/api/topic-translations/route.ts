import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const languageCode = searchParams.get('languageCode')

    if (!languageCode) {
      return NextResponse.json({ error: 'Missing languageCode' }, { status: 400 })
    }

    // If English, return empty (will use default English names from API)
    if (languageCode === 'en') {
      return NextResponse.json({ translations: {} })
    }

    // Fetch topic translations for the specified language
    const { data, error } = await supabase
      .from('topic_translations')
      .select('topic_id, translated_name')
      .eq('language_code', languageCode)

    if (error) {
      console.error('Error fetching topic translations:', error)
      return NextResponse.json({ error: 'Failed to fetch translations' }, { status: 500 })
    }

    // Convert to object with topic_id as key
    const translations: Record<number, string> = {}
    data?.forEach(row => {
      translations[row.topic_id] = row.translated_name
    })

    return NextResponse.json({ translations })

  } catch (error) {
    console.error('Error in topic-translations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
