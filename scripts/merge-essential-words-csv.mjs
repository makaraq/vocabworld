/**
 * Convert Essential Words CSV to common-phrases format and merge
 */

import fs from 'fs';

const inputFile = 'scripts/essential-words-b2-urls-final.csv';
const outputFile = 'public/data/common-phrases-b2-urls.csv';

console.log('📄 Converting Essential Words CSV format...\n');

// Read input CSV
const inputContent = fs.readFileSync(inputFile, 'utf-8');
const inputLines = inputContent.split('\n').slice(1); // Skip header

const newEntries = [];

for (const line of inputLines) {
  if (!line.trim()) continue;
  
  const [vocabId, langCode, filePath, b2Url] = line.split(',');
  const filename = filePath.split('/').pop();
  
  // Format: "path","url","lang","topic","filename"
  const entry = `"${filePath}","${b2Url}","${langCode}","EssentialWords","${filename}"`;
  newEntries.push(entry);
}

console.log(`✅ Converted ${newEntries.length} entries\n`);

// Append to existing CSV
const existingContent = fs.readFileSync(outputFile, 'utf-8');
const updatedContent = existingContent.trimEnd() + '\n' + newEntries.join('\n') + '\n';

fs.writeFileSync(outputFile, updatedContent);

console.log('✅ Merged into:', outputFile);
console.log('📊 Total lines:', updatedContent.split('\n').length);
console.log('\n🎉 Essential Words audio ready to test in app!');
