/**
 * Update CSV with new mp3 audio file mappings
 */

const fs = require('fs');

const csvPath = 'backblaze-urls-20250909-180354.csv';
const resultsPath = 'b2-upload-results.json';

// Read upload results
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

// Read CSV and clean any malformed lines
let csvContent = fs.readFileSync(csvPath, 'utf-8');
let lines = csvContent.split('\n').filter(line => {
  if (!line.trim()) return false;
  if (line.startsWith('LocalPath')) return true;
  return line.startsWith('"');
});

console.log(`📄 CSV has ${lines.length} valid lines`);
console.log(`📦 Adding ${results.length} new mp3 entries\n`);

// Add new entries
for (const r of results) {
  const localPath = `${r.langCode}/${r.category}/alnilam_${r.wordId}_${r.word}.mp3`;
  const url = `https://f002.backblazeb2.com/file/voco-audio-library/${localPath}`;
  const fileName = `alnilam_${r.wordId}_${r.word}.mp3`;
  
  const newLine = `"${localPath}","${url}","${r.langCode}","${r.category}","${fileName}"`;
  lines.push(newLine);
}

// Write updated CSV
fs.writeFileSync(csvPath, lines.join('\n'));

console.log(`✅ CSV updated with ${results.length} new entries`);
console.log(`📄 Total lines: ${lines.length}`);
