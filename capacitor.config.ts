// import type { CapacitorConfig } from '@capacitor/cli';

// const config: CapacitorConfig = {
//   appId: 'com.industry.poulrty',
//   appName: 'smart_poulrty',
//   webDir: 'dist/smart-poultry-frontend/browser',
//   server: {
//     androidScheme: 'http',  // 👈 تغيير https إلى http يحل المشكلة تماماً
//     cleartext: true
//   },
//    plugins: {
//     Keyboard: {
//   resize: 'none'
// }
//   }
// };

// export default config;
import { style } from '@angular/animations';
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.industry.poulrty',
  appName: 'smart_poulrty',
  webDir: 'dist/smart-poultry-frontend/browser',
  server: {
    androidScheme: 'http',
    cleartext: true
  },
  plugins: {
    Keyboard: {
      resize: 'native', // 👈 تم التغيير من 'none' إلى 'body'
      style:"dark",
      resizeOnFullScreen: true},
    
    SplashScreen: {
    launchAutoHide: false,
    backgroundColor: '#ffffff',
    showSpinner: false
  }

    
  }
};

export default config;