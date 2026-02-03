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
      .from('category_translations')
      .select('category, translated_category')
      .eq('language_code', languageCode)

    if (error) {
      console.error('Error fetching category translations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch translations' },
        { status: 500 }
      )
    }

    // Convert array to object: { category: translatedCategory }
    const translations = data.reduce((acc, item) => {
      acc[item.category] = item.translated_category
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json(translations)
  } catch (error) {
    console.error('Error in categories translation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
