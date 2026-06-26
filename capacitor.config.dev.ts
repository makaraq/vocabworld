import type { CapacitorConfig } from '@capacitor/cli';

// DEVELOPMENT config — used for local Xcode/Android Studio work
// Replace the IP below with your Mac's local network IP each session
// Find it with: ipconfig getifaddr en0   (on macOS)
const config: CapacitorConfig = {
  appId: 'com.sprind.app',
  appName: 'Sprind',
  webDir: 'public',
  server: {
    url: 'http://localhost:3000', // ← change to your local IP for physical device, e.g. http://192.168.1.5:3000
    cleartext: true
  },
  plugins: {
    App: {
    }
  }
};

export default config;
