import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.adobocorp.sessiontimer",
  appName: "Session Timer",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
    backgroundColor: "#f5f7fa",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 500,
      backgroundColor: "#667eea",
      showSpinner: false,
    },
  },
};

export default config;
