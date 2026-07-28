"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }

    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone || iosStandalone) return;

    const dismissed = window.localStorage.getItem("daily-hisab.pwa-install-dismissed") === "1";
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos && !dismissed) {
      setShowIosHelp(true);
      setHidden(false);
    }

    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      if (!dismissed) setHidden(false);
    }

    function handleInstalled() {
      setHidden(true);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setHidden(true);
    setInstallPrompt(null);
  }

  function dismiss() {
    window.localStorage.setItem("daily-hisab.pwa-install-dismissed", "1");
    setHidden(true);
  }

  if (hidden || (!installPrompt && !showIosHelp)) return null;

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[110] mx-auto max-w-md rounded-2xl border border-[#d9def5] bg-white p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <img src="/icon-192.png" alt="" className="size-12 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-[#111936]">Daily Hisab ফোনে ইনস্টল করুন</p>
          <p className="mt-1 text-xs leading-5 text-[#59627a]">
            {showIosHelp
              ? "Safari-এর Share বাটন চাপুন, তারপর “Add to Home Screen” নির্বাচন করুন।"
              : "Home Screen থেকে অ্যাপের মতো দ্রুত ব্যবহার করুন।"}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {installPrompt && (
          <button type="button" onClick={install} className="flex-1 rounded-xl bg-[#11298f] px-3 py-2 text-xs font-bold text-white">
            Install App
          </button>
        )}
        <button type="button" onClick={dismiss} className="rounded-xl border border-[#d9def5] px-3 py-2 text-xs font-bold text-[#59627a]">
          পরে
        </button>
      </div>
    </aside>
  );
}
