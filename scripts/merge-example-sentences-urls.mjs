/**
 * Merge Example Sentences B2 URLs into main backblaze CSV
 * Converts format from vocabulary-based to file-path-based structure
 */

import fs from 'fs';

const INPUT_CSV = 'scripts/example-sentences-b2-urls-final.csv';
const MAIN_CSV = 'backblaze-urls-20250909-180354.csv';
const OUTPUT_CSV = 'backblaze-urls-updated.csv';

console.log('📝 Merging Example Sentences audio URLs...\n');

// Read existing backblaze CSV
const existingContent = fs.readFileSync(MAIN_CSV, 'utf-8');
const existingLines = existingContent.trim().split('\n');

console.log(`✅ Existing entries: ${existingLines.length}`);

// Read new example sentences CSV
const newContent = fs.readFileSync(INPUT_CSV, 'utf-8');
const newLines = newContent.trim().split('\n').slice(1); // Skip header

console.log(`✅ New entries: ${newLines.length}`);

// Convert new format to match existing format
// New: vocabulary_id,language_code,file_path,b2_url
// Existing: "file_path","b2_url","language_code","folder","filename"

const convertedLines = newLines.map(line => {
  const [vocabId, langCode, filePath, b2Url] = line.split(',');
  
  // Extract folder and filename from path
  // e.g., "ExampleSentences/en/where_are_you_from.mp3"
  const parts = filePath.split('/');
  const folder = parts[0]; // "ExampleSentences"
  const filename = parts[2]; // "where_are_you_from.mp3"
  
  // Return in existing CSV format with quotes
  return `"${filePath}","${b2Url}","${langCode}","${folder}","${filename}"`;
});

console.log(`✅ Converted ${convertedLines.length} entries\n`);

// Merge and write
const merged = [...existingLines, ...convertedLines];
fs.writeFileSync(OUTPUT_CSV, merged.join('\n'));

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                   ✅ MERGE COMPLETE                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
console.log(`📊 Statistics:`);
console.log(`   Original entries: ${existingLines.length}`);
console.log(`   New entries: ${convertedLines.length}`);
console.log(`   Total entries: ${merged.length}`);
console.log(`\n✅ Output: ${OUTPUT_CSV}`);
console.log('\n📋 Next Steps:');
console.log('   1. Backup the original: cp backblaze-urls-20250909-180354.csv backblaze-urls-backup.csv');
console.log('   2. Replace with new: mv backblaze-urls-updated.csv backblaze-urls-20250909-180354.csv');
console.log('   3. Test audio playback in the app');
console.log('\n🎉 Done!\n');
