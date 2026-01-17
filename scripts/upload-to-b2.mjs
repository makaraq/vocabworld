import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from 'dotenv';

config({ path: '.env.local' });

const B2_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const B2_KEY = process.env.B2_APPLICATION_KEY;
const BUCKET_NAME = 'voco-audio-library';
const BASE_URL = 'https://f002.backblazeb2.com/file/voco-audio-library';

let authToken = null;
let apiUrl = null;
let uploadUrl = null;
let uploadAuthToken = null;

// B2 API: Authorize account
async function authorizeAccount() {
  const auth = Buffer.from(`${B2_KEY_ID}:${B2_KEY}`).toString('base64');
  
  const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { 'Authorization': `Basic ${auth}` }
  });
  
  if (!response.ok) {
    throw new Error(`B2 auth failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  authToken = data.authorizationToken;
  apiUrl = data.apiUrl;
  
  console.log('✅ B2 authorized');
  return data;
}

// B2 API: Get bucket ID
async function getBucketId() {
  const response = await fetch(`${apiUrl}/b2api/v2/b2_list_buckets`, {
    method: 'POST',
    headers: {
      'Authorization': authToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ accountId: B2_KEY_ID })
  });
  
  const data = await response.json();
  const bucket = data.buckets.find(b => b.bucketName === BUCKET_NAME);
  
  if (!bucket) {
    throw new Error(`Bucket ${BUCKET_NAME} not found`);
  }
  
  console.log(`✅ Found bucket: ${BUCKET_NAME}`);
  return bucket.bucketId;
}

// B2 API: Get upload URL
async function getUploadUrl(bucketId) {
  const response = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      'Authorization': authToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ bucketId })
  });
  
  const data = await response.json();
  uploadUrl = data.uploadUrl;
  uploadAuthToken = data.authorizationToken;
  
  return data;
}

// B2 API: Upload file
async function uploadFile(filePath, b2FileName) {
  const fileBuffer = fs.readFileSync(filePath);
  const sha1 = crypto.createHash('sha1').update(fileBuffer).digest('hex');
  
  let attempt = 0;
  while (attempt < 3) {
    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': uploadAuthToken,
          'X-Bz-File-Name': encodeURIComponent(b2FileName),
          'Content-Type': 'audio/wav',
          'Content-Length': fileBuffer.length,
          'X-Bz-Content-Sha1': sha1
        },
        body: fileBuffer
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${error}`);
      }
      
      return await response.json();
    } catch (error) {
      attempt++;
      if (attempt >= 3) throw error;
      
      // Get new upload URL on retry
      const auth = await authorizeAccount();
      const bucketId = await getBucketId();
      await getUploadUrl(bucketId);
      
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

async function main() {
  console.log('🚀 Starting B2 upload for Common Phrases audio\n');
  
  // Authorize B2
  await authorizeAccount();
  const bucketId = await getBucketId();
  await getUploadUrl(bucketId);
  
  // Load vocabulary ID mappings
  const azureMappings = fs.readFileSync('scripts/azure-audio-mappings.csv', 'utf-8')
    .trim().split('\n')
    .map(line => {
      const [vocabId, lang, filePath] = line.split(',');
      return { vocabId, lang, filePath };
    });
  
  const googleMappings = fs.readFileSync('scripts/google-audio-mappings-2026-01-16.csv', 'utf-8')
    .trim().split('\n')
    .map(line => {
      const [vocabId, lang, filePath] = line.split(',');
      return { vocabId, lang, filePath };
    });
  
  const allMappings = [...azureMappings, ...googleMappings];
  console.log(`📋 Total files to upload: ${allMappings.length}\n`);
  
  const results = [];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < allMappings.length; i++) {
    const mapping = allMappings[i];
    const localPath = path.join(process.cwd(), 'scripts', 'common-phrases-audio', mapping.filePath);
    
    if (!fs.existsSync(localPath)) {
      console.log(`[${i + 1}/${allMappings.length}] ⚠️  File not found: ${mapping.filePath}`);
      failCount++;
      continue;
    }
    
    try {
      await uploadFile(localPath, mapping.filePath);
      const b2Url = `${BASE_URL}/${mapping.filePath}`;
      results.push(`${mapping.vocabId},${mapping.lang},${b2Url}`);
      successCount++;
      
      if ((i + 1) % 50 === 0 || i === allMappings.length - 1) {
        console.log(`[${i + 1}/${allMappings.length}] ✅ Uploaded: ${mapping.lang}/${path.basename(mapping.filePath)}`);
      }
      
      // Refresh upload URL every 100 uploads
      if ((i + 1) % 100 === 0) {
        await getUploadUrl(bucketId);
      }
      
    } catch (error) {
      console.error(`[${i + 1}/${allMappings.length}] ❌ Failed: ${mapping.filePath} - ${error.message}`);
      failCount++;
    }
  }
  
  // Save results
  const outputPath = 'scripts/common-phrases-b2-urls.csv';
  fs.writeFileSync(outputPath, results.join('\n'));
  
  console.log(`\n✅ Upload complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Total: ${allMappings.length}`);
  console.log(`\n📄 B2 URLs saved to: ${outputPath}`);
}

main().catch(console.error);
