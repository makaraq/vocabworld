import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-server'

// Language code mapping from our translation database
const getLanguageCode = (languageName: string): string => {
  const languageMap: { [key: string]: string } = {
    'English': 'en',
    'Spanish': 'es', 'French': 'fr', 'German': 'de', 'Italian': 'it', 'Portuguese': 'pt',
    'Dutch': 'nl', 'Russian': 'ru', 'Chinese': 'zh', 'Japanese': 'ja', 'Korean': 'ko',
    'Arabic': 'ar', 'Hindi': 'hi', 'Turkish': 'tr', 'Polish': 'pl', 'Swedish': 'sv',
    'Norwegian': 'no', 'Danish': 'da', 'Finnish': 'fi', 'Greek': 'el', 'Hebrew': 'he',
    'Thai': 'th', 'Vietnamese': 'vi', 'Indonesian': 'id', 'Malay': 'ms', 'Czech': 'cs',
    'Hungarian': 'hu', 'Romanian': 'ro', 'Bulgarian': 'bg', 'Croatian': 'hr', 'Serbian': 'sr',
    'Slovak': 'sk', 'Slovenian': 'sl', 'Estonian': 'et', 'Latvian': 'lv', 'Lithuanian': 'lt',
    'Ukrainian': 'uk', 'Bengali': 'bn', 'Urdu': 'ur', 'Persian': 'fa', 'Afrikaans': 'af',
    'Amharic': 'am', 'Azerbaijani': 'az', 'Belarusian': 'be', 'Breton': 'br', 'Bosnian': 'bs',
    'Catalan': 'ca', 'Corsican': 'co', 'Welsh': 'cy', 'Esperanto': 'eo', 'Basque': 'eu',
    'Faroese': 'fo', 'Irish': 'ga', 'Scottish Gaelic': 'gd', 'Gujarati': 'gu', 'Hausa': 'ha',
    'Icelandic': 'is', 'Igbo': 'ig', 'Javanese': 'jv', 'Georgian': 'ka', 'Kazakh': 'kk',
    'Khmer': 'km', 'Kannada': 'kn', 'Kyrgyz': 'ky', 'Latin': 'la', 'Luxembourgish': 'lb',
    'Lao': 'lo', 'Malagasy': 'mg', 'Macedonian': 'mk', 'Malayalam': 'ml', 'Mongolian': 'mn',
    'Marathi': 'mr', 'Maltese': 'mt', 'Myanmar': 'my', 'Nepali': 'ne', 'Odia': 'or',
    'Punjabi': 'pa', 'Pashto': 'ps', 'Kinyarwanda': 'rw', 'Sanskrit': 'sa', 'Sinhala': 'si',
    'Shona': 'sn', 'Somali': 'so', 'Albanian': 'sq', 'Swahili': 'sw', 'Tamil': 'ta',
    'Telugu': 'te', 'Tajik': 'tg', 'Turkmen': 'tk', 'Filipino': 'tl', 'Uzbek': 'uz',
    'Xhosa': 'xh', 'Yoruba': 'yo', 'Zulu': 'zu'
  };
  return languageMap[languageName] || 'en';
};

export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient()
  try {
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');
    const sourceLanguage = searchParams.get('sourceLanguage');
    const targetLanguage = searchParams.get('targetLanguage');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('🔍 API Request (Supabase):', {
      topicId,
      sourceLanguage,
      targetLanguage,
      limit,
      offset
    });

    if (!topicId || !sourceLanguage || !targetLanguage) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (sourceLanguage === targetLanguage) {
      return NextResponse.json({
        vocabulary: [],
        totalWords: 0,
        currentBatch: 0,
        hasMore: false
      });
    }

    // Get total word count for the topic using Supabase
    const { count: totalCount, error: countError } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('topic_id', topicId);

    if (countError) {
      console.error('❌ Error getting total count:', countError);
      return NextResponse.json({ error: 'Failed to get word count' }, { status: 500 });
    }

    // Get English vocabulary from Supabase
    const { data: englishWords, error: vocabError } = await supabase
      .from('vocabulary')
      .select(`
        id,
        word_en,
        context,
        part_of_speech,
        difficulty_level,
        example_sentence,
        learning_order
      `)
      .eq('topic_id', topicId)
      .order('learning_order', { ascending: true })
      .range(offset, offset + limit - 1);

    if (vocabError) {
      console.error('❌ Error fetching vocabulary:', vocabError);
      return NextResponse.json({ error: 'Failed to fetch vocabulary' }, { status: 500 });
    }

    // Convert language names to codes
    const sourceLanguageCode = getLanguageCode(sourceLanguage);
    const targetLanguageCode = getLanguageCode(targetLanguage);

    // Get all vocabulary IDs for batch translation lookup
    const vocabularyIds = (englishWords || []).map(word => word.id);
    
    // Batch fetch all translations for source language (if not English)
    let sourceTranslations: any = {};
    if (sourceLanguageCode !== 'en' && vocabularyIds.length > 0) {
      const { data: sourceData, error: sourceError } = await supabase
        .from('vocabulary_translations')
        .select('vocabulary_id, translated_word')
        .in('vocabulary_id', vocabularyIds)
        .eq('language_code', sourceLanguageCode);
      
      if (sourceData) {
        sourceTranslations = sourceData.reduce((acc: any, item: any) => {
          acc[item.vocabulary_id] = item.translated_word;
          return acc;
        }, {});
      }
    }
    
    // Batch fetch all translations for target language (if not English)
    let targetTranslations: any = {};
    if (targetLanguageCode !== 'en' && vocabularyIds.length > 0) {
      const { data: targetData, error: targetError } = await supabase
        .from('vocabulary_translations')
        .select('vocabulary_id, translated_word')
        .in('vocabulary_id', vocabularyIds)
        .eq('language_code', targetLanguageCode);
      
      if (targetData) {
        targetTranslations = targetData.reduce((acc: any, item: any) => {
          acc[item.vocabulary_id] = item.translated_word;
          return acc;
        }, {});
      }
    }

    // Build vocabulary array using cached translations
    const vocabulary = (englishWords || []).map(word => {
      let sourceWord = word.word_en; // Default to English
      let targetWord = word.word_en; // Default to English
      
      // Get source language translation (if not English)
      if (sourceLanguageCode !== 'en' && sourceTranslations[word.id]) {
        sourceWord = sourceTranslations[word.id];
      }
      
      // Get target language translation (if not English)
      if (targetLanguageCode !== 'en' && targetTranslations[word.id]) {
        targetWord = targetTranslations[word.id];
      }

      // Get category based on learning_order for Verbs topic (ID 41)
      let category = '';
      if (parseInt(topicId) === 41 && word.learning_order) {
        const order = word.learning_order;
        if (order <= 63) category = 'Basic';
        else if (order <= 107) category = 'Daily Routine';
        else if (order <= 173) category = 'Mental';
        else if (order <= 210) category = 'Communication';
        else if (order <= 236) category = 'Social';
        else if (order <= 276) category = 'Work';
        else if (order <= 304) category = 'Travel';
        else if (order <= 334) category = 'Household';
        else if (order <= 356) category = 'Money';
        else if (order <= 380) category = 'Food';
        else if (order <= 401) category = 'Nature';
        else if (order <= 423) category = 'Health';
        else category = 'Technology';
      } else if (word.context) {
        // Fallback: Extract category from context (e.g., "basic - verbs" -> "Basic")
        const contextParts = word.context.split(' - ');
        if (contextParts.length > 0) {
          category = contextParts[0]
            .split(' ')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
        }
      }

      return {
        id: word.id,
        sourceWord: sourceWord,
        targetWord: targetWord,
        confidenceScore: 0.95,
        context: word.context,
        category: category,
        partOfSpeech: word.part_of_speech,
        difficultyLevel: word.difficulty_level,
        exampleSentence: word.example_sentence,
        learningOrder: word.learning_order
      };
    });
    
    return NextResponse.json({
      vocabulary: vocabulary,
      totalWords: totalCount || 0,
      currentBatch: vocabulary.length,
      hasMore: (offset + vocabulary.length) < (totalCount || 0),
      dataSource: 'supabase' // Indicator that we're using Supabase
    });
    
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    return NextResponse.json({ error: 'Failed to fetch vocabulary' }, { status: 500 });
  }
}