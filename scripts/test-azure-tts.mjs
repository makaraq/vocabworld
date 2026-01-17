/**
 * Test Azure TTS for Welsh, Irish, Maltese
 * Using Azure REST API (no SDK needed)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Azure credentials (add these to .env.local)
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_REGION || 'eastus';

// Azure voice configurations - using Neural voices for natural sound
const AZURE_VOICES = {
  'cy': { code: 'cy-GB', voice: 'cy-GB-NiaNeural', name: 'Welsh' },      // Female voice
  'ga': { code: 'ga-IE', voice: 'ga-IE-OrlaNeural', name: 'Irish' },     // Female voice
  'mt': { code: 'mt-MT', voice: 'mt-MT-GraceNeural', name: 'Maltese' }   // Female voice
};

async function synthesizeSpeech(text, languageCode, voiceName, outputPath) {
  const ssml = `<speak version='1.0' xml:lang='${languageCode}'>
    <voice xml:lang='${languageCode}' name='${voiceName}'>
      ${text}
    </voice>
  </speak>`;

  const url = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm'
      },
      body: ssml
    });

    if (!response.ok) {
      throw new Error(`Azure TTS failed: ${response.status} ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
    console.log(`   ✅ Generated: ${path.basename(outputPath)}`);
  } catch (error) {
    throw new Error(`Speech synthesis failed: ${error.message}`);
  }
}

async function main() {
  console.log('🎙️ Azure TTS Test - Welsh, Irish, Maltese\n');
  console.log('='.repeat(60));

  // Check credentials
  if (!AZURE_SPEECH_KEY) {
    console.error('\n❌ AZURE_SPEECH_KEY not found in .env.local');
    console.log('\nAdd this to your .env.local:');
    console.log('AZURE_SPEECH_KEY=your_azure_key_here');
    console.log('AZURE_REGION=eastus  # or your region');
    process.exit(1);
  }

  // Get first phrase from topic 42
  const { data: vocab, error } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', 42)
    .order('learning_order')
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching vocabulary:', error);
    process.exit(1);
  }

  console.log(`\n📝 Test phrase: "${vocab.word_en}" (ID: ${vocab.id})\n`);

  // Get translations for the 3 languages
  const { data: translations } = await supabase
    .from('vocabulary_translations')
    .select('language_code, translated_word')
    .eq('vocabulary_id', vocab.id)
    .in('language_code', ['cy', 'ga', 'mt']);

  if (!translations || translations.length === 0) {
    console.error('❌ No translations found for cy, ga, mt');
    process.exit(1);
  }

  // Create output directory
  const outputDir = path.join(process.cwd(), 'scripts', 'azure-test-audio');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎵 Generating audio with Azure Neural voices...\n');

  // Generate audio for each language
  for (const lang of Object.keys(AZURE_VOICES)) {
    const translation = translations.find(t => t.language_code === lang);
    
    if (!translation) {
      console.log(`   ⚠️  No translation for ${lang}`);
      continue;
    }

    const config = AZURE_VOICES[lang];
    const filename = `${lang}_${translation.translated_word.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.wav`;
    const outputPath = path.join(outputDir, filename);

    console.log(`   ${config.name} (${lang}):`);
    console.log(`      Text: "${translation.translated_word}"`);
    console.log(`      Voice: ${config.voice}`);

    try {
      await synthesizeSpeech(
        translation.translated_word,
        config.code,
        config.voice,
        outputPath
      );
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`\n✅ Test complete! Audio saved to: ${outputDir}\n`);
}

main().catch(console.error);
