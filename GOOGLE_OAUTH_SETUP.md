# Google OAuth Configuration Guide

## 🔧 Google Cloud Console Setup

### 1. Go to Google Cloud Console
Visit: https://console.cloud.google.com/apis/credentials

### 2. Select Your Project
- If you don't have a project, create one
- Select the project where you want to set up OAuth

### 3. Configure OAuth Consent Screen
1. Go to "OAuth consent screen" in the left sidebar
2. Choose "External" user type
3. Fill in required fields:
   - **App name**: "Vocab World"
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add these scopes:
   - `openid`
   - `email` 
   - `profile`
5. Save and continue

### 4. Create OAuth 2.0 Client ID
1. Go to "Credentials" in the left sidebar
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Choose "Web application"
4. Name it "Vocab World Web Client"

### 5. Configure Authorized URLs

#### **Authorized JavaScript Origins:**
```
http://localhost:3000
http://localhost:3001
http://localhost:3002
http://localhost:3003
https://yourdomain.com
```

#### **Authorized Redirect URIs:**
```
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
http://localhost:3002/auth/callback
http://localhost:3003/auth/callback
https://yourdomain.com/auth/callback
```

### 6. Update Your Environment Variables
After creating the OAuth client, copy the:
- **Client ID** 
- **Client Secret**

And update your `.env.local`:

```bash
# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_new_client_id_here
GOOGLE_CLIENT_SECRET=your_new_client_secret_here
```

## 📱 For Mobile (Capacitor)

### 7. Add Mobile Redirect URLs
Add these to your OAuth client:

#### **Additional Authorized Redirect URIs for Mobile:**
```
vocabworld://auth/callback
com.vocabworld.app://auth/callback
```

### 8. Configure Capacitor
Update your `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vocabworld.app',
  appName: 'Vocab World',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'your_google_client_id_here',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
```

## 🔄 Current Status Check

Your current configuration:
- **Client ID**: `774773244025-qku02snjvrkthkfen669lm3lvct07c6l.apps.googleusercontent.com`
- **Port**: Currently running on `localhost:3002`

### Immediate Action Required:
1. **Add `http://localhost:3002` to Authorized JavaScript Origins**
2. **Add `http://localhost:3002/auth/callback` to Authorized Redirect URIs**

## 🧪 Testing Steps

1. **Configure URLs** in Google Cloud Console
2. **Restart your dev server**: `npm run dev`
3. **Test sign-in** at `http://localhost:3002/`
4. **Check for errors** in browser console

## 🚨 Common Issues

- **Error: redirect_uri_mismatch** → Check redirect URIs match exactly
- **Error: origin_mismatch** → Check JavaScript origins include your current port
- **Error: invalid_client** → Check client ID is correct in `.env.local`

## 🔍 Debug URLs

If sign-in fails, check these URLs are configured:

**Current Development:**
- Origin: `http://localhost:3002`
- Redirect: `http://localhost:3002/auth/callback`

**Future Production:**
- Origin: `https://yourdomain.com`
- Redirect: `https://yourdomain.com/auth/callback`