"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => registration.update());
    }

    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone || iosStandalone) return;

    const dismissed = window.localStorage.getItem("daily-hisab.pwa-install-dismissed") === "1";
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos && !dismissed) {
      setShowIosHelp(true);
      window.dispatchEvent(new CustomEvent("daily-hisab:pwa-status", { detail: { available: true, ios: true } }));
    }

    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      if (!dismissed) {
        window.dispatchEvent(new CustomEvent("daily-hisab:pwa-status", { detail: { available: true, ios: false } }));
      }
    }

    function handleInstalled() {
      setInstallPrompt(null);
      window.dispatchEvent(new CustomEvent("daily-hisab:pwa-status", { detail: { available: false, ios: false } }));
    }

    async function handleInstallRequest() {
      if (installPrompt) {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === "accepted") {
          window.dispatchEvent(new CustomEvent("daily-hisab:pwa-status", { detail: { available: false, ios: false } }));
        }
        setInstallPrompt(null);
      } else if (isIos) {
        window.alert("Safari-এর Share বাটন চাপুন, তারপর “Add to Home Screen” নির্বাচন করুন।");
      }
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("daily-hisab:pwa-install", handleInstallRequest);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("daily-hisab:pwa-install", handleInstallRequest);
    };
  }, [installPrompt]);

  void showIosHelp;
  return null;
}
