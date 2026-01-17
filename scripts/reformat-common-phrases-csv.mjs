/**
 * Reformat Common Phrases CSV to match Verbs CSV format
 * Input:  4172,cy,https://f002.backblazeb2.com/file/voco-audio-library/CommonPhrases/cy/codi.wav
 * Output: "cy/CommonPhrases/codi.wav","https://f002...","cy","CommonPhrases","codi.wav"
 */

import fs from 'fs';

const inputFile = 'public/data/common-phrases-b2-urls.csv';
const outputFile = 'public/data/common-phrases-b2-urls-formatted.csv';

console.log('📝 Reformatting Common Phrases CSV to match Verbs format...\n');

// Read input CSV
const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n').filter(line => line.trim());

console.log(`📊 Input: ${lines.length} lines`);

// Create output with header
const outputLines = ['path,url,lang,topic,filename'];

let processed = 0;
let errors = 0;

for (const line of lines) {
  const [vocabId, lang, url] = line.split(',');
  
  if (!vocabId || !lang || !url) {
    errors++;
    continue;
  }
  
  // Extract path from URL: https://f002.backblazeb2.com/file/voco-audio-library/CommonPhrases/cy/codi.wav
  // Should become: cy/CommonPhrases/codi.wav
  const urlMatch = url.match(/voco-audio-library\/CommonPhrases\/(.+)$/);
  if (!urlMatch) {
    console.error(`⚠️ Failed to parse URL: ${url}`);
    errors++;
    continue;
  }
  
  const pathAfterCommonPhrases = urlMatch[1]; // e.g., "cy/codi.wav"
  const [langFromPath, filename] = pathAfterCommonPhrases.split('/');
  const path = `${langFromPath}/CommonPhrases/${filename}`;
  
  // Format: "path","url","lang","topic","filename"
  const outputLine = `"${path}","${url.trim()}","${lang}","CommonPhrases","${filename}"`;
  outputLines.push(outputLine);
  processed++;
}

// Write output
fs.writeFileSync(outputFile, outputLines.join('\n'));

console.log(`\n✅ Reformatting complete:`);
console.log(`   Processed: ${processed} entries`);
console.log(`   Errors: ${errors}`);
console.log(`   Output: ${outputFile}`);
console.log(`\n📝 Next step: Replace the old CSV:`);
console.log(`   mv public/data/common-phrases-b2-urls-formatted.csv public/data/common-phrases-b2-urls.csv`);
