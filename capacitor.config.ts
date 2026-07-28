import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.dailyhisab.app",
  appName: "Daily Hisab",
  webDir: "public",
  server: {
    url: "https://daily-hisab-eta.vercel.app",
    cleartext: false,
    allowNavigation: ["daily-hisab-eta.vercel.app"],
  },
  android: {
    backgroundColor: "#FFFFFF",
  },
};

export default config;
