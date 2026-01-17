import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateAudioUrls() {
  console.log('📋 Reading B2 URLs from CSV...\n');
  
  const csvContent = fs.readFileSync('scripts/common-phrases-b2-urls.csv', 'utf-8');
  const lines = csvContent.trim().split('\n');
  
  console.log(`Found ${lines.length} audio URLs to update\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  // Group by vocabulary_id and language to batch update
  const updates = lines.map(line => {
    const [vocabId, languageCode, audioUrl] = line.split(',');
    return { vocabId: parseInt(vocabId), languageCode, audioUrl };
  });
  
  console.log('🔄 Updating vocabulary_translations table...\n');
  
  // Update in batches of 1000
  const batchSize = 1000;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    for (const update of batch) {
      const { error } = await supabase
        .from('vocabulary_translations')
        .update({ audio_url: update.audioUrl })
        .eq('vocabulary_id', update.vocabId)
        .eq('language_code', update.languageCode);
      
      if (error) {
        console.error(`❌ Failed to update ${update.vocabId}-${update.languageCode}: ${error.message}`);
        failCount++;
      } else {
        successCount++;
      }
    }
    
    console.log(`[${Math.min(i + batchSize, updates.length)}/${updates.length}] Updated`);
  }
  
  console.log(`\n✅ Update complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Total: ${updates.length}`);
}

updateAudioUrls().catch(console.error);
