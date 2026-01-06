# Supabase Authentication Configuration

## 🔧 Supabase Dashboard Setup

### 1. Go to Supabase Authentication Settings
Visit: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/url-configuration

### 2. Configure Site URL
**Site URL (Main domain):**
```
http://localhost:3002
```

### 3. Configure Redirect URLs
**Redirect URLs (one per line):**
```
http://localhost:3000/**
http://localhost:3001/**
http://localhost:3002/**
http://localhost:3003/**
https://yourdomain.com/**
```

### 4. Configure Google Provider
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/providers
2. Find "Google" provider
3. Enable it
4. Add your Google OAuth credentials:
   - **Client ID**: `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`
   - **Client Secret**: `YOUR_GOOGLE_CLIENT_SECRET`

### 5. Additional Provider Settings (Optional)
```json
{
  "scopes": "openid email profile",
  "skip_nonce_check": false
}
```

## 🔗 Important URLs for Google OAuth

**Supabase Callback URL (for Google Console):**
```
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```

Make sure this URL is added to your Google OAuth client's **Authorized Redirect URIs**.

## ⚡ Quick Fix Checklist

### ✅ Google Cloud Console:
- [ ] Add `http://localhost:3002` to JavaScript Origins
- [ ] Add `http://localhost:3002/auth/callback` to Redirect URIs
- [ ] Add `https://ripkorbuxnoljiprhlyk.supabase.co/auth/v1/callback` to Redirect URIs

### ✅ Supabase Dashboard:
- [ ] Set Site URL to `http://localhost:3002`
- [ ] Add redirect URLs for all ports
- [ ] Enable Google provider with your credentials

## 🧪 Test After Configuration

1. **Save all settings** in both Google Console and Supabase
2. **Wait 5-10 minutes** for changes to propagate
3. **Restart your dev server**: `npm run dev`
4. **Test sign-in** at the welcome modal
5. **Check browser network tab** for any auth errors