import type { CapacitorConfig } from '@capacitor/cli';

// DEVELOPMENT config — used for local Xcode/Android Studio work
// Replace the IP below with your Mac's local network IP each session
// Find it with: ipconfig getifaddr en0   (on macOS)
const config: CapacitorConfig = {
  appId: 'com.vocabworld.app',
  appName: 'Vocab World',
  webDir: 'public',
  server: {
    url: 'http://localhost:3000', // ← change to your local IP for physical device, e.g. http://192.168.1.5:3000
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: '774773244025-8b6gqb41sudtrbvn2fvmkren669lm3lvct07c6l.apps.googleusercontent.com',
      serverClientId: '774773244025-qku02snjvrkthkfen669lm3lvct07c6l.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    App: {
    }
  }
};

export default config;
