import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.siegenations.app',
  appName: 'Siege Nations',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://siegenations.com',
    cleartext: true
  }
};

export default config;