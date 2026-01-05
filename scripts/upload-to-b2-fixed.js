/**
 * Upload generated audio files to Backblaze B2
 * Uploads to correct paths matching existing structure: {lang}/{Category}/filename.wav
 * Converts mp3 to wav or uploads as-is with correct path
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const B2_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const B2_APP_KEY = process.env.B2_APPLICATION_KEY;
const BUCKET_NAME = 'voco-audio-library';

let authToken = null;
let apiUrl = null;
let bucketId = null;

// Map word IDs to their categories (Numbers or Time)
const WORD_CATEGORIES = {
  // Numbers topic (ID 2) - word IDs 2718-2747
  '2718': 'Numbers', '2719': 'Numbers', '2720': 'Numbers', '2721': 'Numbers',
  '2722': 'Numbers', '2723': 'Numbers', '2724': 'Numbers', '2725': 'Numbers',
  '2726': 'Numbers', '2727': 'Numbers', '2728': 'Numbers', '2729': 'Numbers',
  '2730': 'Numbers', '2731': 'Numbers', '2732': 'Numbers', '2733': 'Numbers',
  '2734': 'Numbers', '2735': 'Numbers', '2736': 'Numbers', '2737': 'Numbers',
  '2738': 'Numbers', '2739': 'Numbers', '2740': 'Numbers', '2741': 'Numbers',
  '2742': 'Numbers', '2743': 'Numbers', '2744': 'Numbers', '2745': 'Numbers',
  '2746': 'Numbers', '2747': 'Numbers',
  // Time topic (ID 3) - word IDs 2748-2809
  '2748': 'Time', '2749': 'Time', '2750': 'Time', '2751': 'Time',
  '2752': 'Time', '2753': 'Time', '2754': 'Time', '2755': 'Time',
  '2756': 'Time', '2757': 'Time', '2758': 'Time', '2759': 'Time',
  '2760': 'Time', '2761': 'Time', '2762': 'Time', '2763': 'Time',
  '2764': 'Time', '2765': 'Time', '2766': 'Time', '2767': 'Time',
  '2768': 'Time', '2769': 'Time', '2770': 'Time', '2771': 'Time',
  '2772': 'Time', '2773': 'Time', '2774': 'Time', '2775': 'Time',
  '2776': 'Time', '2777': 'Time', '2778': 'Time', '2779': 'Time',
  '2780': 'Time', '2781': 'Time', '2782': 'Time', '2783': 'Time',
  '2784': 'Time', '2785': 'Time', '2786': 'Time', '2787': 'Time',
  '2788': 'Time', '2789': 'Time', '2790': 'Time', '2791': 'Time',
  '2792': 'Time', '2793': 'Time', '2794': 'Time', '2795': 'Time',
  '2796': 'Time', '2797': 'Time', '2798': 'Time', '2799': 'Time',
  '2800': 'Time', '2801': 'Time', '2802': 'Time', '2803': 'Time',
  '2804': 'Time', '2805': 'Time', '2806': 'Time', '2807': 'Time',
  '2808': 'Time', '2809': 'Time'
};

async function authorizeB2() {
  const credentials = Buffer.from(`${B2_KEY_ID}:${B2_APP_KEY}`).toString('base64');
  
  const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    method: 'GET',
    headers: { 'Authorization': `Basic ${credentials}` }
  });
  
  if (!response.ok) throw new Error(`B2 Auth failed: ${await response.text()}`);
  
  const data = await response.json();
  authToken = data.authorizationToken;
  apiUrl = data.apiUrl;
  bucketId = 'aa1d47dd5cca310593920d1c';
  return data;
}

async function getUploadUrl() {
  const response = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      'Authorization': authToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ bucketId })
  });
  
  if (!response.ok) throw new Error(`Failed to get upload URL: ${await response.text()}`);
  return await response.json();
}

async function uploadFile(localPath, b2Path) {
  const fileData = fs.readFileSync(localPath);
  const sha1 = crypto.createHash('sha1').update(fileData).digest('hex');
  
  const uploadData = await getUploadUrl();
  
  const response = await fetch(uploadData.uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': uploadData.authorizationToken,
      'X-Bz-File-Name': encodeURIComponent(b2Path),
      'Content-Type': 'audio/mpeg',
      'Content-Length': fileData.length.toString(),
      'X-Bz-Content-Sha1': sha1
    },
    body: fileData
  });
  
  if (!response.ok) throw new Error(`Upload failed: ${await response.text()}`);
  return await response.json();
}

async function main() {
  console.log('🚀 Uploading audio to B2 with correct paths');
  console.log('='.repeat(60));
  
  if (!B2_KEY_ID || !B2_APP_KEY) {
    console.error('❌ Missing B2 credentials');
    process.exit(1);
  }
  
  await authorizeB2();
  console.log('✅ B2 Authorized\n');
  
  // Get all audio files
  const audioDir = path.join(process.cwd(), 'generated-audio');
  const files = [];
  
  function scanDir(dir) {
    for (const item of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
      } else if (item.endsWith('.mp3')) {
        files.push(fullPath);
      }
    }
  }
  scanDir(audioDir);
  
  console.log(`📁 Found ${files.length} files\n`);
  
  let success = 0, errors = 0;
  const results = [];
  
  for (const file of files) {
    const fileName = path.basename(file);
    const langCode = path.basename(path.dirname(file));
    
    // Parse: alnilam_2718_zero.mp3
    const match = fileName.match(/alnilam_(\d+)_(.+)\.mp3/);
    if (!match) {
      console.log(`⚠️ Skipping ${fileName} - invalid format`);
      continue;
    }
    
    const [, wordId, word] = match;
    const category = WORD_CATEGORIES[wordId] || 'Numbers';
    
    // Build B2 path: {lang}/{Category}/alnilam_{id}_{word}.mp3
    const b2FileName = `alnilam_${wordId}_${word}.mp3`;
    const b2Path = `${langCode}/${category}/${b2FileName}`;
    
    process.stdout.write(`📤 ${langCode}/${category}/${b2FileName}... `);
    
    try {
      const result = await uploadFile(file, b2Path);
      console.log(`✅`);
      success++;
      results.push({ langCode, wordId, word, category, b2Path, fileId: result.fileId });
    } catch (err) {
      console.log(`❌ ${err.message}`);
      errors++;
    }
    
    await new Promise(r => setTimeout(r, 150));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Uploaded: ${success} | ❌ Errors: ${errors}`);
  
  // Save results for CSV update
  fs.writeFileSync('b2-upload-results.json', JSON.stringify(results, null, 2));
  console.log('📝 Results saved to b2-upload-results.json');
}

main().catch(console.error);
