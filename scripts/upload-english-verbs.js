// Upload ONLY English Verb Audio to B2
// Quick script to upload just the new English files

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const BUCKET_NAME = 'voco-audio-library';

if (!B2_APPLICATION_KEY_ID || !B2_APPLICATION_KEY) {
  console.error('❌ Missing B2 credentials');
  process.exit(1);
}

let authToken = null;
let apiUrl = null;
let downloadUrl = null;
let bucketId = null;
let uploadUrl = null;
let uploadAuthToken = null;

async function authorizeAccount() {
  const credentials = Buffer.from(`${B2_APPLICATION_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64');
  
  const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    method: 'GET',
    headers: { 'Authorization': `Basic ${credentials}` }
  });
  
  const data = await response.json();
  authToken = data.authorizationToken;
  apiUrl = data.apiUrl;
  downloadUrl = data.downloadUrl;
  console.log('✅ B2 Account authorized');
}

async function getBucket() {
  const response = await fetch(`${apiUrl}/b2api/v2/b2_list_buckets`, {
    method: 'POST',
    headers: {
      'Authorization': authToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ accountId: B2_APPLICATION_KEY_ID })
  });
  
  const data = await response.json();
  const bucket = data.buckets.find(b => b.bucketName === BUCKET_NAME);
  bucketId = bucket.bucketId;
  console.log(`✅ Found bucket: ${BUCKET_NAME}`);
}

async function getUploadUrl() {
  const response = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      'Authorization': authToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ bucketId: bucketId })
  });
  
  const data = await response.json();
  uploadUrl = data.uploadUrl;
  uploadAuthToken = data.authorizationToken;
}

async function uploadFile(filePath, b2FileName, fileSize) {
  await getUploadUrl();
  
  const fileData = fs.readFileSync(filePath);
  const sha1Hash = crypto.createHash('sha1').update(fileData).digest('hex');
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': uploadAuthToken,
      'X-Bz-File-Name': encodeURIComponent(b2FileName),
      'Content-Type': 'audio/wav',
      'Content-Length': fileSize.toString(),
      'X-Bz-Content-Sha1': sha1Hash
    },
    body: fileData
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

async function uploadEnglishFiles() {
  const englishDir = path.join(__dirname, 'verb-audio-full', 'en', 'Verbs');
  
  if (!fs.existsSync(englishDir)) {
    console.error(`❌ English audio directory not found: ${englishDir}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(englishDir).filter(f => f.endsWith('.wav'));
  console.log(`\n📁 Found ${files.length} English verb audio files\n`);
  
  let uploaded = 0;
  let failed = 0;
  const csvData = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const localPath = path.join(englishDir, file);
    const b2Path = `en/Verbs/${file}`;
    const stats = fs.statSync(localPath);
    
    try {
      process.stdout.write(`\r⏳ [${(i + 1).toString().padStart(3)}/${files.length}] ${file}...`);
      
      await uploadFile(localPath, b2Path, stats.size);
      
      // Add to CSV data
      const publicUrl = `${downloadUrl}/file/${BUCKET_NAME}/${b2Path}`;
      csvData.push({
        path: b2Path,
        url: publicUrl,
        lang: 'en',
        topic: 'Verbs',
        filename: file
      });
      
      uploaded++;
      
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      console.log(`✅ [${(i + 1).toString().padStart(3)}/${files.length}] ${file} (${(stats.size/1024).toFixed(1)}KB)`);
      
      await new Promise(r => setTimeout(r, 50));
      
    } catch (error) {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      console.log(`❌ [${(i + 1).toString().padStart(3)}/${files.length}] ${file} - ${error.message}`);
      failed++;
    }
  }
  
  // Append to existing CSV
  const existingCsvPath = path.join(__dirname, 'verb-b2-urls-2025-12-22T22-34-33.csv');
  
  if (fs.existsSync(existingCsvPath)) {
    const existingContent = fs.readFileSync(existingCsvPath, 'utf-8');
    const newRows = csvData.map(row => `"${row.path}","${row.url}","${row.lang}","${row.topic}","${row.filename}"`).join('\n');
    const updatedContent = existingContent + '\n' + newRows;
    fs.writeFileSync(existingCsvPath, updatedContent);
    console.log(`\n📋 Added ${csvData.length} English entries to: ${existingCsvPath}`);
  } else {
    console.log('⚠️ Existing CSV not found - English entries not added to CSV');
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎯 ENGLISH UPLOAD COMPLETE!`);
  console.log(`📊 Results: ${uploaded} ✅ | ${failed} ❌`);
  console.log(`🌐 Files available at: ${downloadUrl}/file/${BUCKET_NAME}/en/Verbs/`);
  console.log(`${'='.repeat(60)}`);
}

async function main() {
  try {
    console.log('🚀 Uploading English verb audio to B2\n');
    
    await authorizeAccount();
    await getBucket();
    await uploadEnglishFiles();
    
  } catch (error) {
    console.error('\n❌ Upload failed:', error.message);
    process.exit(1);
  }
}

main();