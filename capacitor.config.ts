import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sprind.app',
  appName: 'Sprind',
  webDir: 'out',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
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
