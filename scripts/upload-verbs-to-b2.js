// Upload Verb Audio to Backblaze B2
// Maintains folder structure: {lang}/Verbs/alnilam_{verb}_.wav

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const BUCKET_NAME = 'voco-audio-library';

if (!B2_APPLICATION_KEY_ID || !B2_APPLICATION_KEY) {
  console.error('❌ Missing B2 credentials in .env.local:');
  console.error('B2_APPLICATION_KEY_ID=your_key_id');
  console.error('B2_APPLICATION_KEY=your_application_key');
  process.exit(1);
}

let authToken = null;
let apiUrl = null;
let downloadUrl = null;
let bucketId = null;
let uploadUrl = null;
let uploadAuthToken = null;

// B2 API Functions
async function authorizeAccount() {
  const credentials = Buffer.from(`${B2_APPLICATION_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64');
  
  const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${credentials}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`B2 authorization failed: ${response.statusText}`);
  }
  
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
    body: JSON.stringify({
      accountId: B2_APPLICATION_KEY_ID
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to list buckets: ${response.statusText}`);
  }
  
  const data = await response.json();
  const bucket = data.buckets.find(b => b.bucketName === BUCKET_NAME);
  
  if (!bucket) {
    throw new Error(`Bucket '${BUCKET_NAME}' not found`);
  }
  
  bucketId = bucket.bucketId;
  console.log(`✅ Found bucket: ${BUCKET_NAME} (${bucketId})`);
}

async function getUploadUrl() {
  const response = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      'Authorization': authToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      bucketId: bucketId
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get upload URL: ${response.statusText}`);
  }
  
  const data = await response.json();
  uploadUrl = data.uploadUrl;
  uploadAuthToken = data.authorizationToken;
}

async function uploadFile(filePath, b2FileName, fileSize) {
  // Get fresh upload URL for each file (B2 requirement)
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

// File discovery and upload
async function uploadAllFiles() {
  const audioDir = path.join(__dirname, 'verb-audio-full');
  const csvData = [];
  
  if (!fs.existsSync(audioDir)) {
    throw new Error(`Audio directory not found: ${audioDir}`);
  }
  
  // Get all audio files
  const allFiles = [];
  const languages = fs.readdirSync(audioDir).filter(item => 
    fs.statSync(path.join(audioDir, item)).isDirectory()
  );
  
  for (const lang of languages) {
    const verbsDir = path.join(audioDir, lang, 'Verbs');
    if (fs.existsSync(verbsDir)) {
      const files = fs.readdirSync(verbsDir).filter(f => f.endsWith('.wav'));
      for (const file of files) {
        allFiles.push({
          localPath: path.join(verbsDir, file),
          b2Path: `${lang}/Verbs/${file}`,
          lang,
          file
        });
      }
    }
  }
  
  console.log(`\n📁 Found ${allFiles.length.toLocaleString()} files across ${languages.length} languages\n`);
  
  let uploaded = 0;
  let failed = 0;
  let totalSize = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < allFiles.length; i++) {
    const fileInfo = allFiles[i];
    const stats = fs.statSync(fileInfo.localPath);
    const fileSize = stats.size;
    
    try {
      process.stdout.write(`\r⏳ [${(i + 1).toString().padStart(5)}/${allFiles.length}] ${fileInfo.b2Path}...`);
      
      const result = await uploadFile(fileInfo.localPath, fileInfo.b2Path, fileSize);
      
      // Add to CSV data
      const publicUrl = `${downloadUrl}/file/${BUCKET_NAME}/${fileInfo.b2Path}`;
      csvData.push({
        path: fileInfo.b2Path,
        url: publicUrl,
        lang: fileInfo.lang,
        topic: 'Verbs',
        filename: fileInfo.file
      });
      
      uploaded++;
      totalSize += fileSize;
      
      // Clear line and show success
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      console.log(`✅ [${(i + 1).toString().padStart(5)}/${allFiles.length}] ${fileInfo.b2Path} (${(fileSize/1024).toFixed(1)}KB)`);
      
      // Progress summary every 100 files
      if ((i + 1) % 100 === 0) {
        const elapsed = (Date.now() - startTime) / 1000 / 60;
        const rate = (i + 1) / elapsed;
        const eta = ((allFiles.length - i - 1) / rate).toFixed(1);
        const progress = ((i + 1) / allFiles.length * 100).toFixed(1);
        
        console.log(`📊 Progress: ${progress}% | ${uploaded.toLocaleString()}✅ ${failed}❌ | ${rate.toFixed(0)} files/min | ETA: ${eta}min\n`);
      }
      
      // Small delay to be nice to B2
      await new Promise(r => setTimeout(r, 50));
      
    } catch (error) {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      console.log(`❌ [${(i + 1).toString().padStart(5)}/${allFiles.length}] ${fileInfo.b2Path} - ${error.message}`);
      failed++;
    }
  }
  
  // Save CSV mapping
  const csvContent = 'path,url,lang,topic,filename\n' + 
    csvData.map(row => `"${row.path}","${row.url}","${row.lang}","${row.topic}","${row.filename}"`).join('\n');
  
  const csvPath = path.join(__dirname, `verb-b2-urls-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.csv`);
  fs.writeFileSync(csvPath, csvContent);
  
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 B2 UPLOAD COMPLETE!`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📊 Results: ${uploaded.toLocaleString()} ✅ | ${failed} ❌ | ${((uploaded/(uploaded+failed))*100).toFixed(1)}% success`);
  console.log(`💾 Total uploaded: ${(totalSize/1024/1024).toFixed(1)} MB`);
  console.log(`⏱️ Total time: ${totalTime} minutes (${(uploaded/parseFloat(totalTime)).toFixed(0)} files/min)`);
  console.log(`📋 URL mapping saved: ${csvPath}`);
  console.log(`🌐 Files available at: ${downloadUrl}/file/${BUCKET_NAME}/`);
  console.log(`${'='.repeat(80)}`);
}

async function main() {
  try {
    console.log('🚀 Starting B2 upload for verb audio files\n');
    
    await authorizeAccount();
    await getBucket();
    await uploadAllFiles();
    
  } catch (error) {
    console.error('\n❌ Upload failed:', error.message);
    process.exit(1);
  }
}

main();