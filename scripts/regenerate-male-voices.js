/**
 * Regenerate German, French, and Portuguese audio with MALE voices
 * Uses Edge TTS (Microsoft) which supports male voice selection
 * 
 * Usage: node scripts/regenerate-male-voices.js
 * 
 * Requires: npm install edge-tts (if not already installed)
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Words to regenerate with male voices
// Edge TTS male voices: de-DE-ConradNeural, fr-FR-HenriNeural, pt-PT-DuarteNeural
const wordsToRegenerate = [
  // German (de) - ConradNeural is male
  { file: 'de/alnilam_2766_Minute.mp3', word: 'Minute', voice: 'de-DE-ConradNeural' },
  { file: 'de/alnilam_2790_April.mp3', word: 'April', voice: 'de-DE-ConradNeural' },
  { file: 'de/alnilam_2794_August.mp3', word: 'August', voice: 'de-DE-ConradNeural' },
  { file: 'de/alnilam_2795_September.mp3', word: 'September', voice: 'de-DE-ConradNeural' },
  { file: 'de/alnilam_2797_November.mp3', word: 'November', voice: 'de-DE-ConradNeural' },
  { file: 'de/alnilam_2806_Winter.mp3', word: 'Winter', voice: 'de-DE-ConradNeural' },
  
  // French (fr) - HenriNeural is male
  { file: 'fr/alnilam_2724_six.mp3', word: 'six', voice: 'fr-FR-HenriNeural' },
  { file: 'fr/alnilam_2756_second.mp3', word: 'second', voice: 'fr-FR-HenriNeural' },
  { file: 'fr/alnilam_2766_minute.mp3', word: 'minute', voice: 'fr-FR-HenriNeural' },
  
  // Portuguese (pt) - DuarteNeural is male
  { file: 'pt/alnilam_2718_zero.mp3', word: 'zero', voice: 'pt-PT-DuarteNeural' },
];

// Use Edge TTS via Python package
async function generateWithEdgeTTS(text, voiceName, outputPath) {
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  try {
    // Use edge-tts Python package (more reliable than JS alternatives)
    const command = `edge-tts --voice "${voiceName}" --text "${text}" --write-media "${outputPath}"`;
    
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
    
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      return stats.size;
    }
    return 0;
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return 0;
  }
}

async function main() {
  console.log('🔄 Regenerating German, French, and Portuguese audio with MALE voices');
  console.log('Using Microsoft Edge TTS Neural Voices');
  console.log('='.repeat(60));
  
  // First check if edge-tts is installed
  try {
    await execAsync('edge-tts --version');
  } catch (error) {
    console.log('\n⚠️ edge-tts not found. Installing...');
    try {
      await execAsync('pip install edge-tts');
      console.log('✅ edge-tts installed successfully\n');
    } catch (e) {
      console.error('❌ Failed to install edge-tts. Please install manually: pip install edge-tts');
      process.exit(1);
    }
  }
  
  const outputDir = path.join(process.cwd(), 'generated-audio');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const item of wordsToRegenerate) {
    const filePath = path.join(outputDir, item.file);
    
    process.stdout.write(`\n🎤 ${item.word} (${item.voice})... `);
    
    try {
      const fileSize = await generateWithEdgeTTS(item.word, item.voice, filePath);
      
      if (fileSize > 0) {
        console.log(`✅ Saved (${fileSize} bytes)`);
        successCount++;
      } else {
        console.log('❌ Failed');
        errorCount++;
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      errorCount++;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully regenerated: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('\nMale voices used:');
  console.log('  - German: de-DE-ConradNeural');
  console.log('  - French: fr-FR-HenriNeural');
  console.log('  - Portuguese: pt-PT-DuarteNeural');
}

main().catch(console.error);
