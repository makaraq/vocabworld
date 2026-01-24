import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vocabworld.app',
  appName: 'Vocab World',
  webDir: 'public',
  server: {
    url: 'http://192.168.2.19:3002',
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      forceCodeForRefreshToken: true,
    },
    App: {
      deepLinkingEnabled: true
    }
  }
};

export default config;
