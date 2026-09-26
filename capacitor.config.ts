import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.za.verifiedbizlink',
  appName: 'VerifiedBizLink',
  webDir: 'public',
  server: {
    url: 'https://www.verifiedbizlink.co.za',
    androidScheme: 'https',
    // Shown from the APK itself (public/offline.html) when the site can't be
    // reached — no connection, DNS failure, server down — instead of
    // Android's raw WebView error page. Its "Try again" returns to the site.
    errorPath: 'offline.html',
  },
  // Lets the site recognise the app (e.g. to hide "install the app" banners).
  appendUserAgent: 'VerifiedBizLinkApp',
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000',
    },
  },
};

export default config;
