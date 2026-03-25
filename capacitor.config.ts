import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vocabworld.app',
  appName: 'Vocab World',
  webDir: 'public',
  server: {
    url: 'http://localhost:3000',
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: '774773244025-8b6gqb41sudtrbvn2fvmkru6thkqjibj.apps.googleusercontent.com',
      serverClientId: '774773244025-qku02snjvrkthkfen669lm3lvct07c6l.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    App: {
      deepLinkingEnabled: true
    }
  }
};

export default config;
