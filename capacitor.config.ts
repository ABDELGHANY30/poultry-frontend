import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.indusry.poultry',
  appName: 'smart_poulrty',
  webDir: 'dist/smart-poultry-frontend/browser',
  server: {
    androidScheme: 'http',
    cleartext: true
  },
  plugins: {
   
   SplashScreen: {
      launchShowDuration: 0,      // يختفي فورًا
      launchAutoHide: true,
      backgroundColor: "#fdf6e8", // نفس خلفية الكود بتاعك عشان مفيش فلاش لون مختلف
      showSpinner: false
    }
  }
};

export default config;