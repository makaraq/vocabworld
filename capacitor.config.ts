import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sprind.app',
  appName: 'Sprind',
  webDir: 'out',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    App: {
    },
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#6366f1',
      sound: 'default',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#fe4205',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  }
};

export default config;
