/**
 * Upload generated audio files to Backblaze B2
 * Replaces existing files in the voco-audio-library bucket
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
let uploadUrl = null;
let uploadAuthToken = null;
let bucketId = null;

async function authorizeB2() {
  console.log('🔐 Authorizing with Backblaze B2...');
  
  const credentials = Buffer.from(`${B2_KEY_ID}:${B2_APP_KEY}`).toString('base64');
  
  const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${credentials}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`B2 Auth failed: ${await response.text()}`);
  }
  
  const data = await response.json();
  authToken = data.authorizationToken;
  apiUrl = data.apiUrl;
  
  console.log('✅ Authorized successfully');
  return data;
}

async function getBucketId() {
  console.log('📦 Getting bucket ID...');
  
  const response = await fetch(`${apiUrl}/b2api/v2/b2_list_buckets`, {
    method: 'POST',
    headers: {
      'Authorization': authToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      accountId: (await authorizeB2()).accountId,
      bucketName: BUCKET_NAME
    })
  });
  
  const data = await response.json();
  const bucket = data.buckets.find(b => b.bucketName === BUCKET_NAME);
  
  if (!bucket) {
    throw new Error(`Bucket ${BUCKET_NAME} not found`);
  }
  
  bucketId = bucket.bucketId;
  console.log(`✅ Bucket ID: ${bucketId}`);
  return bucketId;
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
    throw new Error(`Failed to get upload URL: ${await response.text()}`);
  }
  
  const data = await response.json();
  uploadUrl = data.uploadUrl;
  uploadAuthToken = data.authorizationToken;
  return data;
}

async function uploadFile(localPath, b2Path) {
  // Read file
  const fileData = fs.readFileSync(localPath);
  const sha1 = crypto.createHash('sha1').update(fileData).digest('hex');
  
  // Get fresh upload URL for each file (they can expire)
  await getUploadUrl();
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': uploadAuthToken,
      'X-Bz-File-Name': encodeURIComponent(b2Path),
      'Content-Type': 'audio/mpeg',
      'Content-Length': fileData.length.toString(),
      'X-Bz-Content-Sha1': sha1
    },
    body: fileData
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${error}`);
  }
  
  return await response.json();
}

async function main() {
  console.log('🚀 Uploading generated audio to Backblaze B2');
  console.log('='.repeat(60));
  
  if (!B2_KEY_ID || !B2_APP_KEY) {
    console.error('❌ Missing B2 credentials. Set B2_APPLICATION_KEY_ID and B2_APPLICATION_KEY');
    process.exit(1);
  }
  
  // Authorize and get bucket
  await authorizeB2();
  await getBucketId();
  
  // Get all audio files
  const audioDir = path.join(process.cwd(), 'generated-audio');
  const files = [];
  
  function scanDir(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (item.endsWith('.mp3')) {
        files.push(fullPath);
      }
    }
  }
  
  scanDir(audioDir);
  
  console.log(`\n📁 Found ${files.length} audio files to upload\n`);
  
  let successCount = 0;
  let errorCount = 0;
  const uploadedFiles = [];
  
  for (const file of files) {
    // Extract relative path for B2
    const relativePath = path.relative(audioDir, file).replace(/\\/g, '/');
    const b2Path = `audio/${relativePath}`;
    
    process.stdout.write(`📤 ${relativePath}... `);
    
    try {
      const result = await uploadFile(file, b2Path);
      console.log(`✅ (${result.contentLength} bytes)`);
      successCount++;
      uploadedFiles.push({
        local: relativePath,
        b2Path: b2Path,
        fileId: result.fileId
      });
    } catch (error) {
      console.log(`❌ ${error.message}`);
      errorCount++;
    }
    
    // Small delay between uploads
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 UPLOAD SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully uploaded: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  // Save upload log
  const logPath = path.join(process.cwd(), 'b2-upload-log.json');
  fs.writeFileSync(logPath, JSON.stringify(uploadedFiles, null, 2));
  console.log(`\n📝 Upload log saved to: b2-upload-log.json`);
}

main().catch(console.error);
