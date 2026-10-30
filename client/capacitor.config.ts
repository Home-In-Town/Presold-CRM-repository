import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.homeintown.sales',
  appName: 'PreSold CRM',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    // Allow connections to production backend
    allowNavigation: [
      'https://presold-crm-server-624770114041.asia-south1.run.app',
      'https://sales.homeintown.in'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0a0a0f",
      showSpinner: false
    },
    Geolocation: {
      requestPermissions: true
    },
    Camera: {
      permissions: {
        photos: true,
        camera: true
      }
    }
  }
};

export default config;
