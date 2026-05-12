import type { CapacitorConfig } from '@capacitor/cli';

// PRODUCTION config — used for App Store builds
// Points to the live Vercel deployment so all API routes work on-device
const config: CapacitorConfig = {
  appId: 'com.sprind.app',
  appName: 'Vocab World',
  webDir: 'public', // Fallback only — app loads from server.url in production
  server: {
    url: 'https://sprind-x843.vercel.app',
    cleartext: false
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: '774773244025-8b6gqb41sudtrbvn2fvmkru6thkqjibj.apps.googleusercontent.com',
      serverClientId: '774773244025-qku02snjvrkthkfen669lm3lvct07c6l.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    App: {
    },
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#6366f1',
      sound: 'default',
    },
  }
};

export default config;
