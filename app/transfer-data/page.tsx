"use client";

import { useEffect, useMemo, useState } from "react";

const LEGACY_HOST = "daily-hisab-eta.vercel.app";
const LEGACY_ORIGIN = `https://${LEGACY_HOST}`;
const ALLOWED_TARGETS = new Set(["https://dailyhisab.xyz", "https://www.dailyhisab.xyz"]);
const MESSAGE_TYPE = "daily-hisab:legacy-data";

function collectDailyHisabData() {
  const items: Record<string, string> = {};

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith("daily-hisab.")) {
      const value = window.localStorage.getItem(key);
      if (value !== null) items[key] = value;
    }
  }

  return items;
}

export default function TransferDataPage() {
  const [status, setStatus] = useState<"ready" | "sent" | "empty" | "invalid">("ready");
  const target = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("target") ?? "";
  }, []);

  const isLegacySite = typeof window !== "undefined" && window.location.hostname === LEGACY_HOST;
  const isPrimarySite = typeof window !== "undefined" && ALLOWED_TARGETS.has(window.location.origin);
  const targetAllowed = ALLOWED_TARGETS.has(target);

  function transfer() {
    if (!isLegacySite || !targetAllowed || !window.opener) {
      setStatus("invalid");
      return;
    }

    const items = collectDailyHisabData();
    if (Object.keys(items).length === 0) {
      setStatus("empty");
      return;
    }

    window.opener.postMessage({ type: MESSAGE_TYPE, items }, target);
    setStatus("sent");
    setTimeout(() => window.close(), 900);
  }

  useEffect(() => {
    if (isLegacySite && targetAllowed && window.opener) {
      const timer = setTimeout(transfer, 300);
      return () => clearTimeout(timer);
    }
  }, [isLegacySite, targetAllowed]);

  useEffect(() => {
    if (!isPrimarySite) return;

    function receiveMigration(event: MessageEvent<{ type?: string; items?: Record<string, string> }>) {
      if (event.origin !== LEGACY_ORIGIN || event.data?.type !== MESSAGE_TYPE || !event.data.items) return;
      const items = Object.entries(event.data.items);
      if (items.length === 0) {
        setStatus("empty");
        return;
      }
      for (const [key, value] of items) {
        if (key.startsWith("daily-hisab.")) window.localStorage.setItem(key, value);
      }
      setStatus("sent");
      setTimeout(() => window.location.assign("/"), 700);
    }

    window.addEventListener("message", receiveMigration);
    return () => window.removeEventListener("message", receiveMigration);
  }, [isPrimarySite]);

  function openLegacyTransfer() {
    const destination = encodeURIComponent(window.location.origin);
    const popup = window.open(
      `${LEGACY_ORIGIN}/transfer-data?target=${destination}`,
      "daily-hisab-data-transfer",
      "popup,width=520,height=680",
    );
    if (!popup) setStatus("invalid");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7ff] p-5">
      <section className="w-full max-w-md rounded-3xl border border-[#dfe3f5] bg-white p-7 text-center shadow-xl">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e8ecff] text-2xl">↗</div>
        <h1 className="mt-4 text-xl font-extrabold text-[#111936]">Daily Hisab data transfer</h1>
        {status === "ready" && (
          <p className="mt-3 text-sm text-[#59627a]">
            {isPrimarySite ? "নিচের button চেপে পুরোনো হিসাব এই domain-এ নিয়ে আসুন।" : "পুরোনো হিসাব নতুন domain-এ পাঠানো হচ্ছে…"}
          </p>
        )}
        {status === "sent" && <p className="mt-3 text-sm font-bold text-green-600">সফলভাবে data পাঠানো হয়েছে। এই window বন্ধ হচ্ছে…</p>}
        {status === "empty" && <p className="mt-3 text-sm font-bold text-amber-600">এই browser-এ কোনো পুরোনো Daily Hisab data পাওয়া যায়নি।</p>}
        {status === "invalid" && (
          <p className="mt-3 text-sm text-red-600">
            নিরাপদ transfer session পাওয়া যায়নি। dailyhisab.xyz থেকে “পুরোনো data আনুন” চাপুন।
          </p>
        )}
        {status !== "sent" && isLegacySite && targetAllowed && (
          <button type="button" onClick={transfer} className="mt-5 w-full rounded-xl bg-[#11298f] px-4 py-3 text-sm font-bold text-white">
            আবার transfer করুন
          </button>
        )}
        {status !== "sent" && isPrimarySite && (
          <button type="button" onClick={openLegacyTransfer} className="mt-5 w-full rounded-xl bg-[#11298f] px-4 py-3 text-sm font-bold text-white">
            পুরোনো data আনুন
          </button>
        )}
      </section>
    </main>
  );
}
