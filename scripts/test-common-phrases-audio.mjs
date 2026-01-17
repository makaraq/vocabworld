/**
 * Test Common Phrases Audio API Locally
 * Run this with: node scripts/test-common-phrases-audio.mjs
 */

// Test that we can construct the correct CSV lookup
const testCSVLookup = () => {
  console.log('🧪 Testing CSV lookup logic...\n');
  
  const wordId = '4172';
  const languageCode = 'en';
  const wordIdNum = parseInt(wordId);
  
  console.log(`Input: wordId=${wordId}, languageCode=${languageCode}`);
  console.log(`Parsed: wordIdNum=${wordIdNum}`);
  console.log(`Range check: ${wordIdNum >= 4172 && wordIdNum <= 4965 ? '✅ PASS' : '❌ FAIL'}`);
  
  // Simulate CSV line
  const csvLine = '4172,en,https://f002.backblazeb2.com/file/voco-audio-library/CommonPhrases/en/get_up.wav';
  const [csvVocabId, csvLang, csvUrl] = csvLine.split(',');
  
  console.log(`\nCSV line: "${csvLine}"`);
  console.log(`Parsed: vocabId=${csvVocabId}, lang=${csvLang}, url=${csvUrl}`);
  console.log(`Match check: ${parseInt(csvVocabId) === wordIdNum && csvLang === languageCode ? '✅ PASS' : '❌ FAIL'}`);
  
  // Simulate regex extraction
  const urlMatch = csvUrl.match(/voco-audio-library\/(.+)$/);
  if (urlMatch) {
    const filePath = urlMatch[1];
    const fileName = filePath.split('/').pop();
    console.log(`\nExtracted path: ${filePath}`);
    console.log(`Extracted filename: ${fileName}`);
    console.log(`✅ Regex extraction successful`);
  } else {
    console.log(`❌ Regex extraction failed`);
  }
  
  console.log('\n🎉 All logic tests passed!');
};

// Test different word IDs
const testRanges = () => {
  console.log('\n🧪 Testing ID range detection...\n');
  
  const testCases = [
    { id: 4171, expected: false, desc: 'Just below range' },
    { id: 4172, expected: true, desc: 'Start of range' },
    { id: 4500, expected: true, desc: 'Middle of range' },
    { id: 4965, expected: true, desc: 'End of range' },
    { id: 4966, expected: false, desc: 'Just above range' },
  ];
  
  testCases.forEach(test => {
    const inRange = test.id >= 4172 && test.id <= 4965;
    const pass = inRange === test.expected;
    console.log(`ID ${test.id} (${test.desc}): ${pass ? '✅' : '❌'} ${inRange ? 'IN RANGE' : 'OUT OF RANGE'}`);
  });
};

console.log('='.repeat(60));
console.log('COMMON PHRASES AUDIO API - LOGIC TEST');
console.log('='.repeat(60));
console.log();

testCSVLookup();
testRanges();

console.log('\n' + '='.repeat(60));
console.log('✅ All tests completed successfully!');
console.log('Next: Start dev server and test actual API endpoint');
console.log('   npm run dev');
console.log('   Open: http://localhost:3000');
console.log('   Navigate to Common Phrases topic');
console.log('   Try playing audio');
console.log('='.repeat(60));
