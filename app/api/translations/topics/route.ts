import { getSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const languageCode = searchParams.get('lang')

    if (!languageCode) {
      return NextResponse.json(
        { error: 'Language code is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('topic_translations')
      .select('topic_id, translated_name')
      .eq('language_code', languageCode)

    if (error) {
      console.error('Error fetching topic translations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch translations' },
        { status: 500 }
      )
    }

    // Convert array to object: { topicId: translatedName }
    const translations = data.reduce((acc, item) => {
      acc[item.topic_id] = item.translated_name
      return acc
    }, {} as Record<number, string>)

    return NextResponse.json(translations)
  } catch (error) {
    console.error('Error in topics translation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
