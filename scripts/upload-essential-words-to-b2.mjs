/**
 * Upload Essential Words Audio to Backblaze B2
 * Uploads 4,965 MP3 files to voco-audio-library2 bucket
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import crypto from 'crypto';

config({ path: '.env.local' });

const AUDIO_DIR = 'scripts/essential-words-audio/EssentialWords';
const CSV_INPUT = 'scripts/essential-words-b2-urls-2026-02-11.csv';
const CSV_OUTPUT = 'scripts/essential-words-b2-urls-final.csv';

const B2_KEY_ID = process.env.B2_APPLICATION_KEY_ID_2;
const B2_APP_KEY = process.env.B2_APPLICATION_KEY_2;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME_2;

let b2Auth = null;
let uploadUrl = null;
let uploadAuthToken = null;

async function authorizeB2() {
  console.log('🔑 Authorizing with B2...');
  const authString = Buffer.from(`${B2_KEY_ID}:${B2_APP_KEY}`).toString('base64');
  
  const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { 'Authorization': `Basic ${authString}` }
  });

  if (!response.ok) {
    throw new Error('B2 authorization failed');
  }

  b2Auth = await response.json();
  console.log('✅ Authorized\n');
  return b2Auth;
}

async function getBucketId() {
  console.log('📦 Finding bucket...');
  
  // Try with bucketName filter
  const response = await fetch(`${b2Auth.apiUrl}/b2api/v2/b2_list_buckets`, {
    method: 'POST',
    headers: {
      'Authorization': b2Auth.authorizationToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      accountId: b2Auth.accountId,
      bucketName: B2_BUCKET_NAME
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('   ❌ Error:', errorData);
    throw new Error(`Failed to get bucket info: ${errorData.message || response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.buckets || data.buckets.length === 0) {
    throw new Error(`Bucket ${B2_BUCKET_NAME} not found or key doesn't have access`);
  }

  const bucket = data.buckets[0];
  console.log(`✅ Found bucket: ${bucket.bucketId}\n`);
  return bucket.bucketId;
}

async function getUploadUrl(bucketId) {
  const response = await fetch(`${b2Auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      'Authorization': b2Auth.authorizationToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ bucketId })
  });

  if (!response.ok) {
    throw new Error('Failed to get upload URL');
  }

  const data = await response.json();
  uploadUrl = data.uploadUrl;
  uploadAuthToken = data.authorizationToken;
  return data;
}

async function uploadFile(filePath, b2FileName, bucketId) {
  const fileBuffer = fs.readFileSync(filePath);
  const sha1 = crypto.createHash('sha1').update(fileBuffer).digest('hex');

  // Get fresh upload URL if needed
  if (!uploadUrl || !uploadAuthToken) {
    await getUploadUrl(bucketId);
  }

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadAuthToken,
        'X-Bz-File-Name': encodeURIComponent(b2FileName),
        'Content-Type': 'audio/mpeg',
        'Content-Length': fileBuffer.length,
        'X-Bz-Content-Sha1': sha1
      },
      body: fileBuffer
    });

    if (!response.ok) {
      // Get new upload URL and retry once
      await getUploadUrl(bucketId);
      const retryResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': uploadAuthToken,
          'X-Bz-File-Name': encodeURIComponent(b2FileName),
          'Content-Type': 'audio/mpeg',
          'Content-Length': fileBuffer.length,
          'X-Bz-Content-Sha1': sha1
        },
        body: fileBuffer
      });

      if (!retryResponse.ok) {
        throw new Error(`Upload failed: ${retryResponse.statusText}`);
      }
      return await retryResponse.json();
    }

    return await response.json();
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('📤 ESSENTIAL WORDS B2 UPLOAD');
  console.log('='.repeat(70));
  console.log();

  if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET_NAME) {
    console.error('❌ Missing B2 credentials in .env.local');
    console.error('   Required: B2_APPLICATION_KEY_ID_2, B2_APPLICATION_KEY_2, B2_BUCKET_NAME_2');
    process.exit(1);
  }

  console.log('📁 Source:', path.resolve(AUDIO_DIR));
  console.log('🪣  Bucket:', B2_BUCKET_NAME);
  console.log();

  // Authorize and get bucket ID
  await authorizeB2();
  const bucketId = await getBucketId();

  // Read CSV to get file list
  console.log('📄 Reading CSV...');
  const csvContent = fs.readFileSync(CSV_INPUT, 'utf-8');
  const csvLines = csvContent.split('\n').slice(1); // Skip header
  
  const filesToUpload = csvLines
    .filter(line => line.trim())
    .map(line => {
      const [vocabId, langCode, filePath] = line.split(',');
      return { vocabId, langCode, filePath };
    });

  console.log(`✅ ${filesToUpload.length} files to upload\n`);

  console.log('🚀 Starting upload...\n');

  const updatedMappings = ['vocabulary_id,language_code,file_path,b2_url'];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < filesToUpload.length; i++) {
    const { vocabId, langCode, filePath } = filesToUpload[i];
    const localPath = path.join(AUDIO_DIR, langCode, path.basename(filePath));
    
    if (!fs.existsSync(localPath)) {
      console.log(`[${i + 1}/${filesToUpload.length}] ⏭️  ${filePath} (not found locally)`);
      continue;
    }

    process.stdout.write(`[${i + 1}/${filesToUpload.length}] ${langCode}/${path.basename(filePath)} ... `);

    const result = await uploadFile(localPath, filePath, bucketId);

    if (result) {
      const b2Url = `${b2Auth.downloadUrl}/file/${B2_BUCKET_NAME}/${filePath}`;
      updatedMappings.push(`${vocabId},${langCode},${filePath},${b2Url}`);
      successCount++;
      console.log('✅');
    } else {
      errorCount++;
      console.log('❌');
    }

    // Rate limiting: 1 request per 100ms = 10 req/sec (safe for B2)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log();
  console.log('='.repeat(70));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total: ${filesToUpload.length}`);
  console.log();

  // Save updated CSV with B2 URLs
  console.log(`💾 Saving ${CSV_OUTPUT}...`);
  fs.writeFileSync(CSV_OUTPUT, updatedMappings.join('\n'));
  console.log('✅ Done!\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
