import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { vocabularyIds, targetLanguageCode, nativeLanguageCode } = await request.json()
    
    if (!vocabularyIds || !Array.isArray(vocabularyIds) || vocabularyIds.length === 0) {
      return NextResponse.json({ error: 'vocabularyIds required' }, { status: 400 })
    }
    
    if (!targetLanguageCode || !nativeLanguageCode) {
      return NextResponse.json({ error: 'Language codes required' }, { status: 400 })
    }
    
    // Use service role for fetching phonetics (no auth required for reading)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Fetch phonetics for all vocabulary IDs and both languages
    const { data: phoneticsData, error } = await supabase
      .from('vocabulary_phonetics')
      .select('vocabulary_id, language_code, phonetic_ipa')
      .in('vocabulary_id', vocabularyIds)
      .in('language_code', [targetLanguageCode, nativeLanguageCode])
    
    if (error) {
      console.error('Error fetching phonetics:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Transform data into a more convenient format
    // phonetics[wordIndex] = { target: '...', native: '...' }
    const phonetics: Record<number, { target?: string; native?: string }> = {}
    
    if (phoneticsData) {
      for (let i = 0; i < vocabularyIds.length; i++) {
        const vocabId = vocabularyIds[i]
        
        const targetPhonetic = phoneticsData.find(
          p => p.vocabulary_id === vocabId && p.language_code === targetLanguageCode
        )
        const nativePhonetic = phoneticsData.find(
          p => p.vocabulary_id === vocabId && p.language_code === nativeLanguageCode
        )
        
        phonetics[i] = {
          target: targetPhonetic?.phonetic_ipa,
          native: nativePhonetic?.phonetic_ipa
        }
      }
    }
    
    return NextResponse.json({ 
      phonetics,
      count: Object.keys(phonetics).length 
    })
    
  } catch (error: any) {
    console.error('Phonetics API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
